import os
import logging
import torch
from transformers import (
    TrOCRProcessor, 
    VisionEncoderDecoderModel,
    Trainer, 
    TrainingArguments
)
from PIL import Image
from typing import Optional, List, Dict, Any
import json
import argparse

# [SF] Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TrOCRTool:
    """[RP] Tool for managing TrOCR model operations including loading, conversion and training."""
    
    def __init__(self, model_path: str):
        """
        Initialize the TrOCR tool.
        
        Args:
            model_path (str): Path to the TrOCR model directory
        """
        self.model_path = "I:\\PatientDatabaseV2\\backend\\trocr-large-handwritten"
        self.processor = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    def load_model(self) -> None:
        """[REH] Load the TrOCR model and processor with proper error handling."""
        try:
            logger.info(f"Loading model from {self.model_path}")
            self.processor = TrOCRProcessor.from_pretrained(self.model_path)
            self.model = VisionEncoderDecoderModel.from_pretrained(self.model_path)
            self.model.to(self.device)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def convert_to_onnx(self, output_path: str) -> None:
        """[PA] Convert the PyTorch model to ONNX format for better deployment performance."""
        try:
            if self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
                
            logger.info("Converting model to ONNX format")
            dummy_input = torch.randn(1, 3, 384, 384).to(self.device)
            torch.onnx.export(
                self.model,
                dummy_input,
                output_path,
                input_names=['input'],
                output_names=['output'],
                dynamic_axes={
                    'input': {0: 'batch_size'},
                    'output': {0: 'batch_size'}
                }
            )
            logger.info(f"Model converted and saved to {output_path}")
        except Exception as e:
            logger.error(f"Error converting model to ONNX: {str(e)}")
            raise

    def prepare_dataset(self, 
                       image_paths: List[str], 
                       labels: List[str]
                       ) -> Dict[str, torch.Tensor]:
        """[IV] Prepare dataset for training with input validation."""
        try:
            if not image_paths or not labels or len(image_paths) != len(labels):
                raise ValueError("Invalid dataset format")
                
            processed_images = []
            processed_labels = []
            
            for img_path, label in zip(image_paths, labels):
                if not os.path.exists(img_path):
                    logger.warning(f"Image not found: {img_path}")
                    continue
                    
                image = Image.open(img_path).convert("RGB")
                processed = self.processor(image, return_tensors="pt")
                processed_images.append(processed.pixel_values)
                processed_labels.append(self.processor.tokenizer(label).input_ids)
            
            return {
                "pixel_values": torch.cat(processed_images),
                "labels": torch.tensor(processed_labels)
            }
        except Exception as e:
            logger.error(f"Error preparing dataset: {str(e)}")
            raise

    def train(self, 
              train_dataset: Dict[str, torch.Tensor],
              validation_dataset: Optional[Dict[str, torch.Tensor]] = None,
              output_dir: str = "./trocr_finetuned",
              num_epochs: int = 3,
              batch_size: int = 4,
              learning_rate: float = 5e-5
              ) -> None:
        """[TDT] Train or fine-tune the model with proper testing capabilities."""
        try:
            training_args = TrainingArguments(
                output_dir=output_dir,
                num_train_epochs=num_epochs,
                per_device_train_batch_size=batch_size,
                per_device_eval_batch_size=batch_size,
                learning_rate=learning_rate,
                logging_dir=f"{output_dir}/logs",
                logging_steps=100,
                save_steps=1000,
                evaluation_strategy="epoch" if validation_dataset else "no",
            )
            
            trainer = Trainer(
                model=self.model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=validation_dataset
            )
            
            logger.info("Starting training")
            trainer.train()
            logger.info(f"Training completed. Model saved to {output_dir}")
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise

    def save_config(self, config_path: str) -> None:
        """[CMV] Save model configuration and parameters."""
        try:
            config = {
                "model_path": self.model_path,
                "device": str(self.device),
                "model_config": self.model.config.to_dict() if self.model else None
            }
            
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            logger.error(f"Error saving configuration: {str(e)}")
            raise

    def process_directory(self, image_dir: str) -> List[Dict[str, str]]:
        """[RP] Process all images in a directory using the TrOCR pipeline.

        Args:
            image_dir (str): Path to the directory containing images

        Returns:
            List[Dict[str, str]]: List of dictionaries containing image path and OCR result
        """
        try:
            if self.model is None or self.processor is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            if not os.path.isdir(image_dir):
                raise ValueError(f"Directory not found: {image_dir}")

            results = []
            for img_name in os.listdir(image_dir):
                img_path = os.path.join(image_dir, img_name)
                if not os.path.isfile(img_path):
                    continue

                image = Image.open(img_path).convert("RGB")
                pixel_values = self.processor(image, return_tensors="pt").pixel_values.to(self.device)
                generated_ids = self.model.generate(pixel_values)
                generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

                results.append({
                    "image_path": img_path,
                    "ocr_result": generated_text
                })

            return results
        except Exception as e:
            logger.error(f"Error processing directory {image_dir}: {str(e)}")
            raise

def display_menu():
    print("\nTrOCR Tool Menu:")
    print("1. Load Model")
    print("2. Convert Model to ONNX")
    print("3. Prepare Dataset")
    print("4. Train Model")
    print("5. Save Configuration")
    print("6. Process Directory")
    print("7. Exit")

def menu_cli():
    print("Welcome to the TrOCR Tool Menu-Driven CLI!")
    model_path = input("Enter the model path: ")
    tool = TrOCRTool(model_path)
    
    while True:
        display_menu()
        choice = input("Enter your choice (1-7): ").strip()
        
        if choice == "1":
            try:
                tool.load_model()
                print("Model loaded successfully.")
            except Exception as e:
                print(f"Error loading model: {str(e)}")
        
        elif choice == "2":
            output_path = input("Enter the output path for the ONNX model: ")
            try:
                tool.convert_to_onnx(output_path)
                print(f"Model converted and saved to {output_path}.")
            except Exception as e:
                print(f"Error converting model to ONNX: {str(e)}")
        
        elif choice == "3":
            image_paths = input("Enter the path to the JSON file containing image paths: ")
            labels = input("Enter the path to the JSON file containing labels: ")
            try:
                with open(image_paths, 'r') as f:
                    image_paths = json.load(f)
                with open(labels, 'r') as f:
                    labels = json.load(f)
                train_dataset = tool.prepare_dataset(image_paths, labels)
                print("Dataset prepared successfully.")
            except Exception as e:
                print(f"Error preparing dataset: {str(e)}")
        
        elif choice == "4":
            train_dataset_path = input("Enter the path to the training dataset JSON file: ")
            output_dir = input("Enter the output directory for the trained model: ")
            try:
                with open(train_dataset_path, 'r') as f:
                    train_dataset = json.load(f)
                tool.train(train_dataset, output_dir=output_dir)
                print(f"Training completed. Model saved to {output_dir}.")
            except Exception as e:
                print(f"Error during training: {str(e)}")
        
        elif choice == "5":
            config_path = input("Enter the path to save the configuration: ")
            try:
                tool.save_config(config_path)
                print(f"Configuration saved to {config_path}.")
            except Exception as e:
                print(f"Error saving configuration: {str(e)}")
        
        elif choice == "6":
            if tool.model is None or tool.processor is None:
                print("Please load the model first (option 1).")
                continue
                
            image_dir = input("Enter the path to the directory containing images: ")
            try:
                results = tool.process_directory(image_dir)
                print("Directory processed successfully.")
                # Launch the review GUI
                app = OCRReviewApp(results)
                app.run()
            except Exception as e:
                print(f"Error processing directory: {str(e)}")
        
        elif choice == "7":
            print("Exiting the TrOCR Tool Menu-Driven CLI. Goodbye!")
            break
        
        else:
            print("Invalid choice. Please enter a number between 1 and 7.")

if __name__ == "__main__":
    menu_cli()
