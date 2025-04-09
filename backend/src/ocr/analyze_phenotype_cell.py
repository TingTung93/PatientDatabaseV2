import cv2
import numpy as np
import os
import logging
from typing import Optional, Union
from PIL import Image

logger = logging.getLogger(__name__)

def analyze_phenotype_cell(
    image: Union[np.ndarray, Image.Image], 
    region_name: str,
    threshold_empty: float = 240,
    empty_ratio: float = 0.01
) -> Optional[str]:
    """Analyze a phenotype cell to determine if it's marked (0, +, or Pos).
    
    Args:
        image (Union[np.ndarray, Image.Image]): The cell image
        region_name (str): Name of the region for debugging
        threshold_empty (float): Pixel value threshold for empty detection
        empty_ratio (float): Ratio threshold for empty field detection
        
    Returns:
        Optional[str]: "0", "+", "Pos" based on the marking, or None if empty
    """
    # Convert PIL Image to numpy if needed
    if isinstance(image, Image.Image):
        image = np.array(image)
        
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
        
    # First check if the field is empty
    non_white_pixels = np.sum(gray < threshold_empty)
    total_pixels = gray.size
    percentage = non_white_pixels / total_pixels
    
    logger.info(f"Cell {region_name} empty check: {percentage:.4f} non-white pixel ratio")
    
    if percentage < empty_ratio:
        logger.info(f"Cell {region_name} is empty (white)")
        return None
        
    # Get image dimensions
    height, width = gray.shape
    
    # Calculate the center region (50% of the cell)
    center_x = width // 2
    center_y = height // 2
    region_width = int(width * 0.5)
    region_height = int(height * 0.5)
    
    # Calculate region boundaries
    x1 = center_x - region_width // 2
    y1 = center_y - region_height // 2
    x2 = center_x + region_width // 2
    y2 = center_y + region_height // 2
    
    # Extract the center region
    center_region = gray[y1:y2, x1:x2]
    
    # Calculate statistics
    mean_value = np.mean(center_region)
    std_value = np.std(center_region)
    
    # Save debug image if debug directory exists
    os.makedirs("debug_output", exist_ok=True)
    debug_path = os.path.join('debug_output', f'{region_name}_analysis.jpg')
    debug_img = image.copy()
    cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.imwrite(debug_path, debug_img)
    
    # Log analysis results
    logger.info(f"Analysis for {region_name}:")
    logger.info(f"Mean value: {mean_value:.2f}")
    logger.info(f"Std value: {std_value:.2f}")
    
    # If not empty, determine the marking based on pixel values
    if mean_value > 220:  # Light gray (0)
        return "0"
    elif mean_value > 180:  # Medium gray (+)
        return "+"
    else:  # Dark (Pos)
        return "Pos"

def is_empty_field(
    image: Union[np.ndarray, Image.Image], 
    region_name: str,
    threshold: float = 240,
    ratio_threshold: float = 0.01
) -> bool:
    """Check if a field is empty (contains only white/background pixels).
    
    Args:
        image (Union[np.ndarray, Image.Image]): The field image
        region_name (str): Name of the region for debugging
        threshold (float): Pixel value threshold (0-255) for empty detection
        ratio_threshold (float): Ratio threshold for empty field detection
        
    Returns:
        bool: True if the field is empty, False otherwise
    """
    # Convert PIL Image to numpy if needed
    if isinstance(image, Image.Image):
        image = np.array(image)
        
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Use higher thresholds for tech and diagnosis fields to handle noise and artifacts
    if 'tech' in region_name.lower() or 'diagnosis' in region_name.lower():
        threshold = 230  # Lower threshold to be more sensitive to darker pixels
        ratio_threshold = 0.03  # Higher ratio threshold to tolerate more noise
    
    # Calculate the percentage of non-white pixels
    non_white_pixels = np.sum(gray < threshold)
    total_pixels = gray.size
    percentage = non_white_pixels / total_pixels
    
    # Log analysis results
    logger.info(f"Empty check for {region_name}: {percentage:.4f} non-white pixel ratio (threshold: {ratio_threshold})")
    
    # If less than the threshold ratio of pixels are non-white, consider it empty
    return percentage < ratio_threshold 