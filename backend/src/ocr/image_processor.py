import cv2
import numpy as np
from PIL import Image
import json
import logging
import os
from typing import Dict, Tuple

# Import the dedicated phenotype cell analysis module
from analyze_phenotype_cell import analyze_phenotype_cell, is_empty_field

class ImageProcessor:
    """Handles image processing operations including alignment, masking, and region extraction."""
    
    def __init__(self, template_path: str, mask_path: str, manual_mask_path: str, coordinates_path: str):
        """Initialize the ImageProcessor with template, alignment mask, manual mask, and coordinates paths"""
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initializing ImageProcessor...")
        
        # Load template and masks
        self.logger.info("Loading template and mask images")
        self.template = cv2.imread(template_path)
        if self.template is None:
            raise ValueError(f"Failed to load template image from: {template_path}")
            
        self.alignment_mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if self.alignment_mask is None:
            raise ValueError(f"Failed to load alignment mask from: {mask_path}")
            
        self.manual_mask = cv2.imread(manual_mask_path, cv2.IMREAD_GRAYSCALE)
        if self.manual_mask is None:
            raise ValueError(f"Failed to load manual mask from: {manual_mask_path}")
        
        # Ensure masks are binary
        _, self.alignment_mask = cv2.threshold(self.alignment_mask, 127, 255, cv2.THRESH_BINARY)
        _, self.manual_mask = cv2.threshold(self.manual_mask, 127, 255, cv2.THRESH_BINARY)
        
        # Load coordinates from JSON file
        self.logger.info("Loading coordinates from JSON file")
        if not os.path.exists(coordinates_path):
            raise FileNotFoundError(f"Coordinates file not found: {coordinates_path}")
            
        with open(coordinates_path, 'r') as f:
            self.coordinates = json.load(f)

    def align_image(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Align the scanned image with the template using the alignment mask.
        
        Args:
            image (np.ndarray): Input form image
            
        Returns:
            Tuple[np.ndarray, np.ndarray]: (Aligned image, Homography matrix)
        """
        self.logger.info("Starting image alignment")
        
        # Convert input image to grayscale
        gray2 = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Initialize SIFT detector
        sift = cv2.SIFT_create()
        
        # Detect keypoints and compute descriptors using alignment mask
        kp1, des1 = sift.detectAndCompute(self.alignment_mask, None)
        kp2, des2 = sift.detectAndCompute(gray2, None)
        
        if des1 is None or des2 is None:
            self.logger.warning("Could not compute descriptors")
            return image, np.eye(3)
        
        # Match features
        matcher = cv2.BFMatcher()
        matches = matcher.knnMatch(des1, des2, k=2)
        
        # Apply ratio test
        good_matches = []
        for m, n in matches:
            if m.distance < 0.75 * n.distance:
                good_matches.append(m)
        
        if len(good_matches) < 4:
            self.logger.warning("Not enough good matches found for alignment")
            return image, np.eye(3)
        
        # Get matched keypoints
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        # Find homography
        H, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
        
        if H is None:
            self.logger.warning("Could not find homography matrix")
            return image, np.eye(3)
        
        # Warp image
        aligned = cv2.warpPerspective(image, H, (self.template.shape[1], self.template.shape[0]))
        
        # Save debug images
        os.makedirs("debug_output", exist_ok=True)
        cv2.imwrite("debug_output/aligned.jpg", aligned)
        
        # Save alignment mask for debugging
        cv2.imwrite("debug_output/alignment_mask.jpg", self.alignment_mask)
        
        # Draw matches for debugging
        img_matches = cv2.drawMatches(self.alignment_mask, kp1, gray2, kp2, good_matches, None,
                                    flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
        cv2.imwrite("debug_output/alignment_matches.jpg", img_matches)
        
        return aligned, H

    def apply_mask(self, image: np.ndarray) -> np.ndarray:
        """Apply the manual mask to hide form elements from the input image.
        The mask should be:
        - White (255) for text areas to keep
        - Black (0) for form elements to hide
        
        Args:
            image (np.ndarray): Aligned input image
            
        Returns:
            np.ndarray: Masked image with form elements hidden
        """
        # Convert image to grayscale if it's not already
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
            
        # Ensure mask and image have the same dimensions
        if gray.shape != self.manual_mask.shape:
            self.manual_mask = cv2.resize(self.manual_mask, (gray.shape[1], gray.shape[0]))
        
        # Apply morphological operations to improve mask quality
        kernel = np.ones((3,3), np.uint8)
        processed_mask = cv2.morphologyEx(self.manual_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        processed_mask = cv2.morphologyEx(processed_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Create white background
        white_background = np.full_like(gray, 255)
        
        # The mask has:
        # - White (255) for text areas to keep
        # - Black (0) for form elements to hide
        # So we need to invert it for bitwise operations
        inverted_mask = cv2.bitwise_not(processed_mask)
        
        # Keep text areas from original image (where mask is white)
        result = cv2.bitwise_and(gray, gray, mask=processed_mask)
        
        # Fill form areas with white (where mask is black)
        result = cv2.add(result, cv2.bitwise_and(white_background, white_background, mask=inverted_mask))
        
        # Apply additional cleanup
        result = cv2.fastNlMeansDenoising(result, None, 10, 7, 21)
        
        # Convert back to RGB
        masked_rgb = cv2.cvtColor(result, cv2.COLOR_GRAY2RGB)
        
        # Save debug images
        os.makedirs("debug_output", exist_ok=True)
        cv2.imwrite("debug_output/original_gray.jpg", gray)
        cv2.imwrite("debug_output/template_mask.jpg", processed_mask)
        cv2.imwrite("debug_output/inverted_mask.jpg", inverted_mask)
        cv2.imwrite("debug_output/masked_result.jpg", result)
        cv2.imwrite("debug_output/masked_final.jpg", masked_rgb)
        
        # Save a sample of the patient name region for debugging
        if "patient_name" in self.coordinates["regions"]:
            region = self.coordinates["regions"]["patient_name"]
            x, y = region["x"], region["y"]
            w, h = region["width"], region["height"]
            patient_name_region = result[y:y+h, x:x+w]
            cv2.imwrite("debug_output/patient_name_region.jpg", patient_name_region)
            
            # Log statistics for the patient name region
            non_white_pixels = np.sum(patient_name_region < 250)
            total_pixels = patient_name_region.size
            self.logger.info(f"Patient name region stats - Non-white pixels: {non_white_pixels}/{total_pixels} ({non_white_pixels/total_pixels*100:.2f}%)")
        
        return masked_rgb

    def extract_region(self, image, region_name):
        """Extract a region from the image using coordinates from the JSON file"""
        try:
            region_data = self.coordinates["regions"][region_name]
            x = region_data["x"]
            y = region_data["y"]
            w = region_data["width"]
            h = region_data["height"]
            
            # Add padding to the coordinates
            pad = 20
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(image.shape[1], x + w + pad)
            y2 = min(image.shape[0], y + h + pad)
            
            # Extract the region
            region = image[y1:y2, x1:x2]
            
            # Save debug image
            debug_path = os.path.join('debug_output', f'{region_name}_region.jpg')
            cv2.imwrite(debug_path, region)
            
            return region
        except Exception as e:
            self.logger.error(f"Error extracting region {region_name}: {str(e)}")
            return None

    def process_image(self, image_path: str) -> Dict[str, Image.Image]:
        """Process a single form image following the new workflow.
        
        Args:
            image_path (str): Path to the image to process
            
        Returns:
            Dict[str, Image.Image]: Dictionary mapping region names to extracted region images
        """
        self.logger.info(f"Processing image: {image_path}")
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        
        # 1. Align mask2 (template) with input form
        aligned, H = self.align_image(image)
        
        # 2. Apply mask2 to hide form elements
        masked = self.apply_mask(aligned)
        
        # 3. Extract regions according to finalcoords
        regions = {}
        for region_name, region_data in self.coordinates["regions"].items():
            try:
                region_img = self.extract_region(masked, region_name)
                
                # Skip processing if region could not be extracted
                if region_img is None:
                    regions[region_name] = None
                    continue
                
                # Check if the field is empty using the imported is_empty_field function
                if is_empty_field(region_img, region_name):
                    self.logger.info(f"Field {region_name} is empty")
                    regions[region_name] = None
                    continue
                
                # Special handling for phenotype cells
                if region_name in ["rh_D", "rh_C", "rh_E", "rh_c", "rh_e", 
                                 "kell_K", "kell_k", "duffy_Fya", "duffy_Fyb",
                                 "kidd_Jka", "mns_N", "mns_S", "mns_s"]:
                    # Use the imported analyze_phenotype_cell function
                    result = analyze_phenotype_cell(region_img, region_name)
                    if result is not None:  # Only store non-empty cells
                        regions[region_name] = {
                            "image": region_img,
                            "analysis": result
                        }
                    else:
                        regions[region_name] = None
                else:
                    # Regular fields - return the image for OCR processing
                    regions[region_name] = region_img
                    
            except Exception as e:
                self.logger.error(f"Error extracting region {region_name}: {str(e)}")
                regions[region_name] = None
        
        return regions 