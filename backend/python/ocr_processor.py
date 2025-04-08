#!/usr/bin/env python3
import argparse
import json
import sys
import logging
from typing import Dict, Optional, List
from pathlib import Path
from tqdm import tqdm
import cv2
from PIL import Image
import torch
import transformers
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("ocr_processor.py module loaded") # New log

# Version compatibility checks
TRANSFORMERS_MIN_VERSION = "4.21.0"
TRANSFORMERS_MAX_VERSION = "4.35.0"

class ImageLoadError(Exception):
    """Raised when an image cannot be loaded"""
    pass

class OCRProcessingError(Exception):
    """Raised when OCR processing fails"""
    pass

class OCRProcessor:
    def __init__(self, model_name="microsoft/trocr-large-handwritten", use_auth_token=None):
        """Initialize OCR processor with TrOCR model
        
        Args:
            model_name (str): Name or path of the TrOCR model (default: microsoft/trocr-large-handwritten)
            use_auth_token (Optional[str]): HuggingFace auth token for private models
        """
        logger.info(f"Initializing OCR processor with model: {model_name}")
        
        # Check transformers version
        current_version = transformers.__version__
        logger.info(f"Transformers version: {current_version}")
        
        if not (TRANSFORMERS_MIN_VERSION <= current_version <= TRANSFORMERS_MAX_VERSION):
            logger.warning(f"Transformers version {current_version} may not be compatible. "
                         f"Recommended version range: {TRANSFORMERS_MIN_VERSION} - {TRANSFORMERS_MAX_VERSION}")
        
        # Set device with proper error handling
        self.device = self._setup_device()
        
        # Initialize with proper error handling
        try:
            logger.info("Attempting to load TrOCR processor...")
            self.processor = TrOCRProcessor.from_pretrained(
                model_name,
                use_auth_token=use_auth_token,
                use_fast=True,  # Explicitly use fast tokenizer
                revision="main"  # Explicitly use main branch
            )
            logger.info("TrOCR processor loaded successfully.")
            
            logger.info("Attempting to load TrOCR model...")
            model_kwargs = {
                "torch_dtype": torch.float32,
                # "use_cache": True, # Removed - Incompatible with transformers 4.50.2
                # "low_cpu_mem_usage": True, # Removed - Caused meta tensor error with .to(device)
                "use_safetensors": False,  # Using pytorch_model.bin
                "revision": "main"
            }
            logger.debug(f"Model kwargs: {model_kwargs}")
            
            try:
                logger.info(f"Loading model '{model_name}'...")
                # Load model with direct device placement
                self.model = VisionEncoderDecoderModel.from_pretrained(
                    model_name,
                    **model_kwargs
                )
                logger.info("Model loaded from pretrained.")
                
                # Configure generation parameters
                self.model.generation_config.max_length = 128
                self.model.generation_config.num_beams = 5
                self.model.generation_config.early_stopping = True
                self.model.generation_config.no_repeat_ngram_size = 3
                self.model.generation_config.length_penalty = 2.0
                
                logger.info(f"Moving model to device: {self.device}")
                # Move to device after configuration
                self.model = self.model.to(self.device)
                logger.info("Model moved to device.")
                logger.info("Setting model to evaluation mode.")
                self.model.eval()
                logger.info("Model set to evaluation mode.")
                
                # Clear CUDA cache if using GPU
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    
            except Exception as e:
                logger.error(f"Model loading failed: {str(e)}")
                raise OCRProcessingError(f"Model loading failed: {str(e)}")
                
            logger.info("OCR processor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OCR processor: {str(e)}")
            raise OCRProcessingError(f"Model initialization failed: {str(e)}")

    def _setup_device(self) -> torch.device:
        """Setup and return the appropriate torch device with logging"""
        if torch.cuda.is_available():
            device = torch.device("cuda")
            logger.info(f"Using CUDA device: {torch.cuda.get_device_name(0)}")
            logger.info(f"CUDA device count: {torch.cuda.device_count()}")
        else:
            device = torch.device("cpu")
            logger.info("CUDA not available, using CPU")
        return device

    def _preprocess_image(self, image):
        """Preprocess image for better OCR results"""
        logger.debug("Preprocessing image...")
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding for better results across different lighting conditions
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,  # Block size
            2    # C constant
        )
        
        # Convert back to RGB for TrOCR
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

    def _clean_field_value(self, value: str, field_type: str = None) -> str:
        """Clean and normalize field values"""
        if not value:
            return value

        # Split on newlines and take only the first line
        value = value.split('\n')[0].strip()
        
        # Remove any trailing field labels or content after the main value
        value = re.sub(r'\s*(?:Name|DOB|Gender|Contact|Blood Type|Born|Sex|Tel|Phone|Blood Group|Some|Random|More|text|here|notes).*$', '', value, flags=re.IGNORECASE)
        
        # Remove trailing punctuation and whitespace
        value = re.sub(r'[:\s]+$', '', value)
        
        # Additional field-specific cleaning
        if field_type == 'gender':
            value = value.lower().strip()
            if value in ['m', 'male', 'm.', 'man']:
                value = 'Male'
            elif value in ['f', 'female', 'f.', 'woman']:
                value = 'Female'
            elif value:
                value = value.capitalize()
                if value not in ['Male', 'Female']:
                    return None
        elif field_type == 'name':
            # Remove any text after the actual name
            value = re.sub(r'\s{2,}.*$', '', value)
            value = re.sub(r'[,;].*$', '', value)
            value = re.sub(r'\s+(?:Some|Random|other|text|here|notes).*$', '', value, flags=re.IGNORECASE)
        
        return value.strip()

    def extract_patient_data(self, text: str) -> Dict[str, str]:
        """Extract patient data from OCR text"""
        # Normalize newlines and clean text
        text = re.sub(r'[\r\n]+', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Define regex patterns for each field
        patterns = {
            'name': r'(?:Patient\s*(?:Name)?|Name(?:\s*of\s*Patient)?)\s*:?\s*([^\n:]+?)(?=\s+(?:Date|DOB|Born|Gender|Sex|Contact|Phone|Blood|Some|Random|$))',
            'dob': r'(?:Date\s*of\s*Birth|DOB|Born)\s*:?\s*([^\n:]+?)(?=\s+(?:Gender|Sex|Contact|Phone|Blood|Some|Random|$))',
            'gender': r'(?:Gender|Sex)\s*:?\s*([^\n:]+?)(?=\s+(?:Contact|Phone|Tel|Blood|Some|Random|More|$)|$)',
            'contact_number': r'(?:Contact|Phone|Tel(?:ephone)?)\s*:?\s*([^\n:]+?)(?=\s+(?:Blood|Some|Random|$)|$)',
            'blood_type': r'(?:Blood\s*(?:Type|Group))\s*:?\s*([^\n:]+?)(?:\s*$|(?=\s+(?:Some|Random|End|\w+:)))'
        }
        
        extracted_data = {}
        
        # Extract each field
        for field, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                value = self._clean_field_value(value, field)
                if value:  # Only add non-empty values
                    extracted_data[field] = value
        
        return extracted_data

    def process_batch(self, image_paths: List[str], batch_size: int = 4) -> Dict[str, str]:
        """Process multiple images in batches with progress tracking
        
        Args:
            image_paths (List[str]): List of paths to images
            batch_size (int): Number of images to process simultaneously
            
        Returns:
            Dict[str, str]: Dictionary mapping image paths to OCR results
        """
        results = {}
        errors = {}
        
        # Create progress bar
        with tqdm(total=len(image_paths), desc="Processing images") as pbar:
            # Process images in batches
            for i in range(0, len(image_paths), batch_size):
                batch_paths = image_paths[i:i + batch_size]
                
                # Process each image in the batch
                for image_path in batch_paths:
                    try:
                        text = self.process_image(image_path)
                        results[image_path] = text
                    except Exception as e:
                        logger.error(f"Error processing {image_path}: {str(e)}")
                        errors[image_path] = str(e)
                    finally:
                        pbar.update(1)
        
        return {
            'results': results,
            'errors': errors,
            'total_processed': len(results),
            'total_errors': len(errors)
        }

    def process_image(self, image_path: str) -> str:
        """Process an image and return the raw OCR text using TrOCR"""
        try:
            logger.info(f"Processing image: {image_path}")
            
            # Validate image path
            if not Path(image_path).exists():
                raise ImageLoadError(f"Image file not found: {image_path}")
            
            # Load the image
            cv_image = cv2.imread(image_path)
            if cv_image is None:
                raise ImageLoadError(f"Failed to load image: {image_path}")
            
            # Check image dimensions
            if cv_image.shape[0] * cv_image.shape[1] > 4096 * 4096:
                logger.warning("Large image detected, this may impact performance")
            
            logger.debug(f"Image loaded successfully, shape: {cv_image.shape}")

            # Preprocess the image
            preprocessed_image = self._preprocess_image(cv_image)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(preprocessed_image)
            
            # Process image with TrOCR
            with torch.no_grad():
                # Get pixel values and move to device
                pixel_values = self.processor(pil_image, return_tensors="pt").pixel_values
                pixel_values = pixel_values.to(self.device)
                
                # Generate text with improved parameters
                generated_ids = self.model.generate(
                    pixel_values,
                    max_length=128,
                    num_beams=5,
                    early_stopping=True,
                    no_repeat_ngram_size=3,
                    length_penalty=2.0,
                    temperature=1.0,
                    do_sample=False
                )
                
                # Decode the generated ids
                generated_text = self.processor.batch_decode(
                    generated_ids, 
                    skip_special_tokens=True,
                    clean_up_tokenization_spaces=True
                )[0]

            if not generated_text.strip():
                raise OCRProcessingError("OCR extracted empty text")

            return generated_text

        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            if isinstance(e, (ImageLoadError, OCRProcessingError)):
                raise
            raise OCRProcessingError(f"OCR processing failed: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Process images with OCR and extract patient data')
    parser.add_argument('--image', help='Path to the image file to process')
    parser.add_argument('--batch', help='Directory containing images to process in batch')
    parser.add_argument('--batch-size', type=int, default=4, help='Batch size for processing multiple images')
    parser.add_argument('--text', help='Raw OCR text to extract data from')
    parser.add_argument('--extract', action='store_true', help='Extract patient data from text')
    parser.add_argument('--output', help='Output file for batch processing results')

    args = parser.parse_args()

    try:
        processor = OCRProcessor()

        if args.batch:
            # Process directory of images in batch
            image_paths = [str(p) for p in Path(args.batch).glob('*.{jpg,jpeg,png,bmp}')]
            if not image_paths:
                raise ValueError(f"No supported images found in {args.batch}")
                
            results = processor.process_batch(image_paths, args.batch_size)
            
            # Save results to file if specified
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(results, f, indent=2)
            else:
                print(json.dumps(results, indent=2))
                
        elif args.image:
            # Process single image
            text = processor.process_image(args.image)
            print(json.dumps({'text': text}))
            
        elif args.text and args.extract:
            # Extract patient data from text
            data = processor.extract_patient_data(args.text)
            print(json.dumps({'data': data}))
            
        else:
            print(json.dumps({'error': 'Invalid arguments. Use --image, --batch, or --text with --extract'}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main() 