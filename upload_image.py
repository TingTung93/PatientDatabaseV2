import requests
import os
import json

def upload_image(image_path, url="http://localhost:3001/api/v1/caution-cards/process"):
    # Check if file exists
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found")
        return
    
    try:
        # Prepare the file for upload
        files = {
            'file': ('image.png', open(image_path, 'rb'), 'image/png')
        }
        
        # Make the POST request
        print(f"Sending request to {url}")
        print(f"Uploading file: {image_path}")
        
        response = requests.post(url, files=files)
        
        # Print the response status and content
        print(f"Status Code: {response.status_code}")
        try:
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        except json.JSONDecodeError:
            print("Response:", response.text)
            
    except requests.exceptions.ConnectionError:
        print(f"Error: Could not connect to {url}")
        print("Make sure the server is running and the port is correct")
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    image_path = "backend/Doc0014.png"
    upload_image(image_path) 