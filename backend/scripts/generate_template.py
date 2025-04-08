import cv2
import numpy as np
import os

def generate_template():
    # Create a white background with the correct dimensions
    width = 2416
    height = 1552
    template = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Add some test text and lines
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1
    thickness = 2
    
    # Add title
    cv2.putText(template, 'CAUTION CARD', (1000, 50), font, font_scale, (0, 0, 0), thickness)
    
    # Add patient info section
    cv2.putText(template, 'Patient Name:', (41, 50), font, font_scale, (0, 0, 0), thickness)
    cv2.line(template, (41, 70), (993, 70), (0, 0, 0), thickness)
    
    cv2.putText(template, 'FMP/SSN:', (990, 50), font, font_scale, (0, 0, 0), thickness)
    cv2.line(template, (990, 70), (1909, 70), (0, 0, 0), thickness)
    
    cv2.putText(template, 'ABO/Rh:', (1908, 50), font, font_scale, (0, 0, 0), thickness)
    cv2.line(template, (1908, 70), (2322, 70), (0, 0, 0), thickness)
    
    # Add phenotype section
    cv2.putText(template, 'Phenotype Data', (1000, 300), font, font_scale, (0, 0, 0), thickness)
    
    # Add phenotype checkboxes
    phenotypes = [
        ('D', 57, 334), ('C', 171, 333), ('E', 301, 338),
        ('c', 428, 336), ('e', 550, 335), ('K', 654, 336),
        ('k', 759, 338), ('Fya', 873, 340), ('Fyb', 978, 340),
        ('Jka', 1083, 340), ('Jkb', 1188, 340), ('N', 1293, 340),
        ('S', 1398, 340), ('s', 1503, 340)
    ]
    
    for pheno, x, y in phenotypes:
        cv2.putText(template, pheno, (x, y), font, font_scale, (0, 0, 0), thickness)
        cv2.rectangle(template, (x, y+10), (x+99, y+66), (0, 0, 0), thickness)
    
    # Create templates directory if it doesn't exist
    os.makedirs('form_ocr/resources/templates', exist_ok=True)
    
    # Save the template
    cv2.imwrite('form_ocr/resources/templates/caution_card_template.png', template)
    print("Template generated successfully!")

if __name__ == "__main__":
    generate_template() 