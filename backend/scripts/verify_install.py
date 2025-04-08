import sys
import torch
import transformers
import cv2
import PIL
import numpy
import tqdm

def main():
    print('Starting verification...')
    print('Python version:', sys.version)
    print('Torch version:', torch.__version__)
    print('Transformers version:', transformers.__version__)
    print('OpenCV version:', cv2.__version__)
    print('Pillow version:', PIL.__version__)
    print('Numpy version:', numpy.__version__)
    print('CUDA available:', torch.cuda.is_available())
    print('CUDA device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')

if __name__ == '__main__':
    main() 