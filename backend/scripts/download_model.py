from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import os

def download_model():
    print("Downloading TrOCR model...")
    
    # Create models directory
    model_dir = "trocr-large-handwritten"
    os.makedirs(model_dir, exist_ok=True)
    
    # Download model and processor
    processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten")
    model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten")
    
    # Save model and processor locally
    processor.save_pretrained(model_dir)
    model.save_pretrained(model_dir)
    
    print(f"Model downloaded and saved to {model_dir}")

if __name__ == "__main__":
    download_model() 