import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the form_ocr directory to Python path
sys.path.append(str(Path(__file__).parent))

from trocr_handler import TrOCRHandler
from image_processor import ImageProcessor
from analyze_phenotype_cell import is_empty_field

def process_caution_card(image_path: str, mask_path: str, manual_mask_path: str, coordinates_path: str) -> Dict[str, Any]:
    """
    Process a caution card image and return extracted information.
    
    Args:
        image_path (str): Path to the caution card image
        mask_path (str): Path to the alignment mask image
        manual_mask_path (str): Path to the manual mask image
        coordinates_path (str): Path to the coordinates JSON file
        
    Returns:
        Dict[str, Any]: Extracted information from the card
    """
    try:
        # Initialize OCR handler
        ocr_handler = TrOCRHandler()
        
        # Initialize image processor with provided paths
        image_processor = ImageProcessor(
            template_path=str(Path(__file__).parent / "resources/templates/caution_card_template.png"),
            mask_path=mask_path,
            manual_mask_path=manual_mask_path,
            coordinates_path=coordinates_path
        )
        
        # Process the image
        regions = image_processor.process_image(image_path)
        
        # Extract text from each region
        results = {}
        for region_name, region_data in regions.items():
            if region_data is not None:
                # Handle phenotype cells that have both image and analysis
                if isinstance(region_data, dict) and "image" in region_data and "analysis" in region_data:
                    results[region_name] = region_data["analysis"]
                    logger.info(f"Phenotype analysis for {region_name}: {region_data['analysis']}")
                else:
                    # Apply empty cell detection to all fields using the imported function
                    if is_empty_field(region_data, region_name):
                        results[region_name] = None
                        logger.info(f"Field {region_name} is blank (detected by is_empty_field)")
                    else:
                        # Only process non-blank fields with OCR
                        text = ocr_handler.generate_text(region_data, region_name)
                        results[region_name] = text
                        logger.info(f"OCR Result for {region_name}: {text}")
            else:
                results[region_name] = None
                logger.warning(f"No image available for region: {region_name}")
        
        # Helper function to convert non-empty fields to arrays
        def to_array(value):
            if value is None:
                return None
            # Split the value by common separators and remove empty elements
            tokens = [token.strip() for token in str(value).replace(',', ' ').split() if token.strip()]
            return tokens if tokens else None
        
        # Create phenotype data with arrays for non-empty fields
        phenotype_data = {}
        for field in ["rh_D", "rh_C", "rh_E", "rh_c", "rh_e", "kell_K", "kell_k", 
                     "duffy_Fya", "duffy_Fyb", "kidd_Jka", "mns_N", "mns_S", "mns_s"]:
            phenotype_data[field] = to_array(results.get(field))
        
        # Transform results to match expected format
        response = {
            "status": "success",
            "data": {
                "patient_info": {
                    "name": results.get("patient_name"),
                    "mrn": results.get("fmp_ssn"),  # Map FMP/SSN to MRN
                },
                "phenotype_data": phenotype_data,
                "debug_info": {
                    "processing_time": 0.0,  # TODO: Add timing
                    "confidence_scores": {}  # TODO: Add confidence scores
                }
            }
        }
        
        # Log the final response
        logger.info("Final OCR Results:")
        logger.info(json.dumps(response, indent=2))
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing caution card: {str(e)}")
        return {
            "status": "error",
            "error": {
                "code": "OCR_PROCESSING_ERROR",
                "message": str(e),
                "details": {
                    "stage": "ocr_processing",
                    "error": str(e)
                }
            }
        }

if __name__ == "__main__":
    if len(sys.argv) != 5:  # Script name + 4 arguments
        print(json.dumps({
            "status": "error",
            "error": {
                "code": "INVALID_ARGUMENTS",
                "message": "Usage: python process_card.py <image_path> <mask_path> <manual_mask_path> <coordinates_path>"
            }
        }))
        sys.exit(1)
        
    image_path = sys.argv[1]
    mask_path = sys.argv[2]
    manual_mask_path = sys.argv[3]
    coordinates_path = sys.argv[4]
    result = process_caution_card(image_path, mask_path, manual_mask_path, coordinates_path)
    print(json.dumps(result)) 