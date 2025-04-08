import os
import shutil
from PIL import Image, ImageDraw, ImageFont
import json

def setup_test_environment():
    # Create necessary directories
    directories = [
        'form_ocr/resources/templates',
        'form_ocr/resources/masks',
        'form_ocr/resources/coordinates',
        'test_data'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")

    # Copy mask files
    source_mask = '../form_ocr/resources/mask.png'
    source_mask2 = '../form_ocr/resources/mask2.png'
    source_coords = '../form_ocr/resources/finalcoords.json'
    
    if os.path.exists(source_mask):
        shutil.copy2(source_mask, 'form_ocr/resources/masks/manual_mask.png')
        print("Copied manual mask")
    if os.path.exists(source_mask2):
        shutil.copy2(source_mask2, 'form_ocr/resources/masks/alignment_mask.png')
        print("Copied alignment mask")
    if os.path.exists(source_coords):
        shutil.copy2(source_coords, 'form_ocr/resources/coordinates/caution_card_coords.json')
        print("Copied coordinates file")

    # Copy Python OCR files
    python_files = [
        '../form_ocr/trocr_handler.py',
        '../form_ocr/image_processor.py',
        '../form_ocr/__init__.py'
    ]
    
    for file in python_files:
        if os.path.exists(file):
            shutil.copy2(file, 'form_ocr/')
            print(f"Copied {os.path.basename(file)}")

    # Create a test caution card image
    create_test_image()

def create_test_image():
    # Create a white background image
    width = 800
    height = 1000
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Add some text to simulate a caution card
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    # Add patient information
    text_content = [
        "CAUTION CARD",
        "Patient Name: John Doe",
        "Date of Birth: 01/01/1980",
        "Medical Record #: 12345",
        "Blood Type: A+",
        "Phenotype:",
        "Rh(D): +",
        "Rh(C): +",
        "Rh(E): -",
        "Kell: -",
        "Duffy: +",
        "Kidd: -"
    ]
    
    y_position = 50
    for line in text_content:
        draw.text((50, y_position), line, fill='black', font=font)
        y_position += 30
    
    # Save the test image
    image.save('test_data/sample_caution_card.jpg')
    print("Created test caution card image")

if __name__ == "__main__":
    setup_test_environment() 