#!/usr/bin/env python3
import sys
import json
import logging
import os
from pathlib import Path
from ocr_processor import OCRProcessor
import asyncio
import signal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ocr_server.log')
    ]
)
logger = logging.getLogger(__name__)

def validate_venv():
    """Validate that we're running in a virtual environment"""
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        raise RuntimeError("Not running in a virtual environment! This is required for proper dependency isolation.")
    
    venv_path = sys.prefix
    logger.info(f"Running in virtual environment: {venv_path}")
    logger.info(f"Python executable: {sys.executable}")
    
    # Log key environment variables
    logger.info(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")
    logger.info(f"VIRTUAL_ENV: {os.environ.get('VIRTUAL_ENV', 'Not set')}")
    
    # Log installed packages
    try:
        import pkg_resources
        installed_packages = [f"{pkg.key} {pkg.version}" for pkg in pkg_resources.working_set]
        logger.info("Installed packages:")
        for pkg in installed_packages:
            logger.info(f"  {pkg}")
    except Exception as e:
        logger.error(f"Failed to list installed packages: {e}")

class OCRServer:
    def __init__(self):
        """Initialize OCR server with persistent model loading"""
        self.processor = None
        self.running = False
        
    async def initialize(self):
        """Initialize the OCR processor"""
        try:
            # Validate virtual environment first
            validate_venv()
            
            logger.info("Attempting to instantiate OCRProcessor...") # New log
            self.processor = OCRProcessor()
            logger.info("OCRProcessor instantiation attempted.") # New log (will likely not be reached if error is in __init__)
            logger.info("OCR processor initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize OCR processor: {str(e)}")
            return False

    async def process_request(self, request_data: dict) -> dict:
        """Process a single request"""
        try:
            if not self.processor:
                raise Exception("OCR processor not initialized")

            command = request_data.get('command')
            if not command:
                raise ValueError("No command specified")

            if command == 'process_image':
                image_path = request_data.get('image_path')
                if not image_path:
                    raise ValueError("No image path provided")
                
                text = self.processor.process_image(image_path)
                return {'status': 'success', 'text': text}
                
            elif command == 'process_batch':
                image_paths = request_data.get('image_paths', [])
                batch_size = request_data.get('batch_size', 4)
                
                if not image_paths:
                    raise ValueError("No image paths provided")
                    
                results = self.processor.process_batch(image_paths, batch_size)
                return {'status': 'success', 'results': results}
                
            elif command == 'extract_data':
                text = request_data.get('text')
                if not text:
                    raise ValueError("No text provided")
                    
                data = self.processor.extract_patient_data(text)
                return {'status': 'success', 'data': data}
                
            else:
                raise ValueError(f"Unknown command: {command}")

        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def handle_stdin(self):
        """Handle stdin for communication with Node.js"""
        while self.running:
            try:
                # Read a line from stdin
                line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
                
                if not line:
                    logger.warning("Received EOF on stdin, shutting down...")
                    self.running = False
                    break

                # Parse the request
                try:
                    request = json.loads(line)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    continue

                # Process the request
                response = await self.process_request(request)
                
                # Send response
                print(json.dumps(response), flush=True)

            except Exception as e:
                logger.error(f"Error handling stdin: {str(e)}")
                print(json.dumps({'status': 'error', 'error': str(e)}), flush=True)

    def handle_signal(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False

    async def run(self):
        """Run the server"""
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.handle_signal)
        signal.signal(signal.SIGTERM, self.handle_signal)
        
        # Initialize
        if not await self.initialize():
            logger.error("Failed to initialize, exiting...")
            return

        self.running = True
        logger.info("OCR server ready to process requests")
        
        # Print ready message for Node.js
        print(json.dumps({'status': 'ready'}), flush=True)
        
        # Handle stdin until shutdown
        await self.handle_stdin()
        
        logger.info("OCR server shutting down...")

async def main():
    server = OCRServer()
    await server.run()

if __name__ == '__main__':
    asyncio.run(main()) 