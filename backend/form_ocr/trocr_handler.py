import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import logging
from PIL import Image
import numpy as np
import cv2
import os
import warnings
from typing import Union
import gc
# from accelerate import init_empty_weights # Reverted: Caused meta tensor error

logger = logging.getLogger(__name__)

class TrOCRHandler:
    """Handles TrOCR model inference with CUDA support."""
    
    def __init__(self, model_name: str = None):
        """Initialize the TrOCR handler.
        
        Args:
            model_name (str): Path to the local TrOCR model. If None, uses default path.
        """
        # Use default path if none provided
        if model_name is None:
            # Use the remote model name instead of relying on a downloaded version
            model_name = "microsoft/trocr-large-handwritten"
            
        logger.info(f"Initializing TrOCR handler with model: {model_name}")
        
        try:
            # Check CUDA availability and optimize settings
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"CUDA available: {torch.cuda.is_available()}")
            
            if torch.cuda.is_available():
                # Get CUDA device info
                logger.info(f"Using CUDA device: {torch.cuda.get_device_name(0)}")
                logger.info(f"CUDA device count: {torch.cuda.device_count()}")
                
                # Set CUDA memory optimization
                torch.cuda.empty_cache()  # Clear CUDA cache
                torch.backends.cudnn.benchmark = True  # Enable cuDNN benchmarking
                torch.backends.cudnn.deterministic = False  # Disable deterministic mode
                
                # Set memory growth
                try:
                    torch.cuda.set_per_process_memory_fraction(0.9)  # Use 90% of available memory
                except Exception as e:
                    logger.warning(f"Could not set memory fraction: {e}")
            
            # Suppress the pooler weights warning
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message="Some weights of VisionEncoderDecoderModel were not initialized")
                
                # Load processor from model name, allow downloading if needed
                logger.info(f"Loading processor from {model_name}")
                self.processor = TrOCRProcessor.from_pretrained(model_name)
                logger.info("Processor loaded successfully")
                
                # Load model, allow downloading if needed
                logger.info(f"Loading model from {model_name}")
                # Reverted: Removed init_empty_weights context manager
                self.model = VisionEncoderDecoderModel.from_pretrained(
                    model_name,
                    ignore_mismatched_sizes=True,  # Handle any size mismatches
                    local_files_only=False        # Allow downloading the model if not available locally
                    # torch_dtype=torch.float16 if self.device == "cuda" else torch.float32 # Removed
                )
                logger.info("Model loaded successfully")
                
                # Move model to GPU if available and set to eval mode
                self.model = self.model.to(self.device)
                self.model.eval()
                logger.info(f"Model moved to device: {self.device}")
                
                # Verify model is on correct device
                logger.info(f"Model device: {next(self.model.parameters()).device}")
            
            # Default generation parameters
            self.generation_params = {
                "max_length": 64,
                "num_beams": 5,
                "length_penalty": 1.0,
                "early_stopping": True,
                "no_repeat_ngram_size": 2,
                "temperature": 0.7,  # Reduced temperature for more focused predictions
                "do_sample": True    # Enable sampling
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize TrOCR handler: {str(e)}")
            raise
    
    def set_generation_params(self, **kwargs):
        """Update the generation parameters.
        
        Args:
            **kwargs: Generation parameters to update
        """
        self.generation_params.update(kwargs)
        logger.info(f"Updated generation parameters: {self.generation_params}")
    
    def generate_text(self, image: Image.Image, field_name: str = None) -> str:
        """Generate text from an image using TrOCR.
        
        Args:
            image (Image.Image): PIL Image to process
            field_name (str): Name of the field being processed, used for special handling
            
        Returns:
            str: Generated text
        """
        try:
            # Prepare image
            if isinstance(image, np.ndarray):
                image = Image.fromarray(image)
            
            # Process image
            pixel_values = self.processor(image, return_tensors="pt").pixel_values
            
            # Move input to the same device as the model
            pixel_values = pixel_values.to(self.device)
            
            # Generate text
            with torch.no_grad():  # Disable gradient computation
                generated_ids = self.model.generate(
                    pixel_values,
                    **self.generation_params
                )
            
            # Decode the generated ids
            generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Clear CUDA cache if using GPU
            if self.device == "cuda":
                torch.cuda.empty_cache()
                gc.collect()
            
            return generated_text.strip()
            
        except Exception as e:
            logger.error(f"Error generating text for field {field_name}: {str(e)}")
            return ""
    
    def is_blank_field(self, image: Union[np.ndarray, Image.Image]) -> bool:
        """Check if a field is blank.
        
        Args:
            image (Union[np.ndarray, Image.Image]): Image to check
            
        Returns:
            bool: True if the field appears to be blank
        """
        try:
            if isinstance(image, Image.Image):
                image = np.array(image)
            
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Calculate the percentage of non-white pixels
            non_white_pixels = np.sum(image < 250)
            total_pixels = image.size
            percentage = non_white_pixels / total_pixels
            
            return percentage < 0.01  # Less than 1% non-white pixels
            
        except Exception as e:
            logger.error(f"Error checking if field is blank: {str(e)}")
            return True  # Assume blank on error 