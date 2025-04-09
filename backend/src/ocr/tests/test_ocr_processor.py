import os
import pytest
import tempfile
from unittest.mock import patch, MagicMock, mock_open
import cv2
import numpy as np
from PIL import Image
from datetime import datetime

from src.ocr.ocr_processor import (
    OCRProcessor, 
    process_image, 
    ImageLoadError, 
    OCRProcessingError, 
    DataExtractionError
)

class TestOCRProcessor:
    """Test suite for OCRProcessor class"""
    
    def setup_method(self):
        """Setup test environment before each test"""
        self.processor = OCRProcessor()
        
        # Create a temporary directory for test images
        self.test_dir = tempfile.mkdtemp()
        
        # Create a simple test image with text
        self.test_image_path = os.path.join(self.test_dir, "test_image.png")
        self.create_test_image(self.test_image_path, "Patient Name: John Doe\nDOB: 01/15/1980\nGender: Male")
    
    def teardown_method(self):
        """Clean up after each test"""
        # Remove the test image and directory
        if os.path.exists(self.test_image_path):
            os.remove(self.test_image_path)
        if os.path.exists(self.test_dir):
            os.rmdir(self.test_dir)
    
    def create_test_image(self, path, text):
        """Create a test image with the given text"""
        # Create a blank image
        img = np.ones((300, 600), dtype=np.uint8) * 255
        
        # Add text to the image
        font = cv2.FONT_HERSHEY_SIMPLEX
        lines = text.split('\n')
        y = 50
        for line in lines:
            cv2.putText(img, line, (50, y), font, 0.7, (0, 0, 0), 2)
            y += 40
        
        # Save the image
        cv2.imwrite(path, img)
    
    @patch('pytesseract.image_to_string')
    def test_process_image_success(self, mock_image_to_string):
        """Test successful image processing"""
        # Mock the OCR result
        mock_image_to_string.return_value = "Patient Name: John Doe\nDOB: 01/15/1980\nGender: Male"
        
        # Process the image
        result = self.processor.process_image(self.test_image_path)
        
        # Verify the result
        assert "John Doe" in result
        assert "01/15/1980" in result
        assert "Male" in result
        assert mock_image_to_string.called
    
    def test_process_image_file_not_found(self):
        """Test error handling for non-existent image file"""
        with pytest.raises(ImageLoadError) as excinfo:
            self.processor.process_image("non_existent_image.jpg")
        
        assert "Image file not found" in str(excinfo.value)
    
    @patch('cv2.imread')
    def test_process_image_load_failure(self, mock_imread):
        """Test error handling for image loading failure"""
        # Mock image loading failure
        mock_imread.return_value = None
        
        with pytest.raises(ImageLoadError) as excinfo:
            self.processor.process_image(self.test_image_path)
        
        assert "Failed to load image" in str(excinfo.value)
    
    @patch('pytesseract.image_to_string')
    def test_process_image_ocr_failure(self, mock_image_to_string):
        """Test error handling for OCR processing failure"""
        # Mock OCR failure
        mock_image_to_string.side_effect = Exception("OCR failed")
        
        with pytest.raises(OCRProcessingError) as excinfo:
            self.processor.process_image(self.test_image_path)
        
        assert "OCR processing failed" in str(excinfo.value)
    
    @patch('src.ocr.ocr_processor.OCRProcessor._preprocess_image')
    @patch('pytesseract.image_to_string')
    def test_preprocessing_applied(self, mock_image_to_string, mock_preprocess):
        """Test that image preprocessing is applied"""
        # Create a mock preprocessed image
        mock_preprocessed = np.ones((100, 100), dtype=np.uint8)
        mock_preprocess.return_value = mock_preprocessed
        
        # Mock OCR result
        mock_image_to_string.return_value = "Test text"
        
        # Process the image
        self.processor.process_image(self.test_image_path)
        
        # Verify preprocessing was called
        assert mock_preprocess.called
    
    def test_deskew_functionality(self):
        """Test the deskew functionality"""
        # Create a simple skewed image
        img = np.ones((200, 200), dtype=np.uint8) * 255
        
        # Apply deskewing
        result = self.processor._deskew(img)
        
        # Verify the result is an image of the same dimensions
        assert result.shape == img.shape
    
    @patch('pytesseract.image_to_string')
    def test_extract_patient_data_success(self, mock_image_to_string):
        """Test successful patient data extraction"""
        ocr_text = """
        Patient Name: John Smith
        Date of Birth: 04/12/1975
        Gender: Male
        Contact: (555) 123-4567
        Blood Type: O+
        """
        
        # Set up OCR mock
        mock_image_to_string.return_value = ocr_text
        
        # Process and extract data
        result = self.processor.extract_patient_data(ocr_text)
        
        # Verify extracted data
        assert result['name'] == "John Smith"
        assert result['dob'] == "1975-04-12"  # Normalized to ISO format
        assert result['gender'] == "Male"
        assert result['contact_number'] == "(555) 123-4567"
        assert result['blood_type'] == "O+"
        assert 'raw_text' in result
    
    def test_extract_patient_data_empty_text(self):
        """Test error handling for empty OCR text"""
        with pytest.raises(DataExtractionError) as excinfo:
            self.processor.extract_patient_data("")
        
        assert "OCR text is empty" in str(excinfo.value)
    
    def test_extract_patient_data_partial(self):
        """Test extraction with partial data"""
        ocr_text = """
        Name: Jane Doe
        Phone: 555-987-6543
        """
        
        result = self.processor.extract_patient_data(ocr_text)
        
        # Verify extracted fields
        assert result['name'] == "Jane Doe"
        assert result['contact_number'] == "555-987-6543"
        assert result['dob'] is None
        assert result['gender'] is None
        assert result['blood_type'] is None
    
    def test_extract_patient_data_with_alternative_formats(self):
        """Test extraction with alternative text formats"""
        ocr_text = """
        Patient: Robert Johnson
        Born: 10-21-1983
        Sex: M
        Tel: 123.456.7890
        Blood Group: AB-
        """
        
        result = self.processor.extract_patient_data(ocr_text)
        
        # Verify extracted and normalized data
        assert result['name'] == "Robert Johnson"
        assert result['dob'] == "1983-10-21"
        assert result['gender'] == "Male"  # Normalized from M
        assert result['contact_number'] == "123.456.7890"
        assert result['blood_type'] == "AB-"
    
    def test_normalize_date(self):
        """Test date normalization with various formats"""
        test_cases = [
            ('01/15/2000', '2000-01-15'),
            ('15/01/2000', '2000-01-15'),
            ('01-15-2000', '2000-01-15'),
            ('15-01-2000', '2000-01-15'),
            ('01.15.2000', '2000-01-15'),
            ('15.01.2000', '2000-01-15'),
            ('01/15/00', '2000-01-15'),
        ]
        
        for input_date, expected in test_cases:
            result = self.processor._normalize_date(input_date)
            assert result == expected
    
    def test_normalize_gender(self):
        """Test gender normalization"""
        assert self.processor._normalize_gender('M') == 'Male'
        assert self.processor._normalize_gender('F') == 'Female'
        assert self.processor._normalize_gender('Male') == 'Male'
        assert self.processor._normalize_gender('Female') == 'Female'
        assert self.processor._normalize_gender('MALE') == 'Male'
        assert self.processor._normalize_gender('FEMALE') == 'Female'
        # Should leave unrecognized values unchanged
        assert self.processor._normalize_gender('Other') == 'Other'
    
    def test_legacy_process_image_function(self):
        """Test the legacy process_image function"""
        with patch.object(OCRProcessor, 'process_image', return_value="Test OCR result"):
            result = process_image(self.test_image_path)
            assert result == "Test OCR result"