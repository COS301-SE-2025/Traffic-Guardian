import os
import urllib.request
import cv2
import sys

def setup_haar_cascades():
    # Determine OpenCV data directory
    opencv_data_dir = os.path.join(os.path.dirname(cv2.__file__), "data")
    print(f"OpenCV data directory: {opencv_data_dir}")
    
    # Create haarcascades directory if it doesn't exist
    haar_dir = os.path.join(opencv_data_dir, "haarcascades")
    if not os.path.exists(haar_dir):
        print(f"Creating directory: {haar_dir}")
        os.makedirs(haar_dir)
    
    # List of cascade files to download
    cascade_files = [
        "haarcascade_car.xml",
        "haarcascade_frontalface_default.xml",
        "haarcascade_fullbody.xml",
        "haarcascade_eye.xml"
    ]
    
    # GitHub URL for cascade files
    base_url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/"
    
    # Download each file
    for file in cascade_files:
        target_path = os.path.join(haar_dir, file)
        
        # Skip if file already exists
        if os.path.exists(target_path):
            print(f"File already exists: {file}")
            continue
        
        # Download file
        url = base_url + file
        print(f"Downloading {file} from {url}")
        try:
            urllib.request.urlretrieve(url, target_path)
            print(f"Downloaded: {file}")
        except Exception as e:
            print(f"Error downloading {file}: {e}")
    
    # Verify downloads
    print("\nVerifying downloads:")
    for file in cascade_files:
        target_path = os.path.join(haar_dir, file)
        if os.path.exists(target_path):
            cascade = cv2.CascadeClassifier(target_path)
            if cascade.empty():
                print(f"  ❌ {file} - Failed to load")
            else:
                print(f"  ✅ {file} - Loaded successfully")
        else:
            print(f"  ❌ {file} - Not downloaded")
    
    print("\nSetup complete!")

if __name__ == "__main__":
    setup_haar_cascades()