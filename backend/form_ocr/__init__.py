"""
Form OCR Pipeline - A specialized OCR system for processing medical forms.
"""

from .image_processor import ImageProcessor
from .trocr_handler import TrOCRHandler

__version__ = "1.0.0"
__all__ = ["ImageProcessor", "TrOCRHandler"] 