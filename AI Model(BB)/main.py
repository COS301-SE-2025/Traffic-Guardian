import os
import cv2

def check_available_cascades():
    # Print the OpenCV data directory
    data_path = cv2.data.haarcascades
    print(f"OpenCV data directory: {data_path}")
    
    # Get the full directory path
    try:
        haarcascades_dir = os.path.join(os.path.dirname(cv2.__file__), "data", "haarcascades")
        print(f"Full path: {haarcascades_dir}")
        
        # Check if directory exists
        if not os.path.exists(haarcascades_dir):
            print(f"Warning: Directory does not exist: {haarcascades_dir}")
            
        # List all XML files in the directory
        files = [f for f in os.listdir(haarcascades_dir) if f.endswith('.xml')]
        
        if not files:
            print("No XML cascade files found in the directory.")
            return
            
        print(f"\nFound {len(files)} cascade files:")
        
        # Test loading each cascade
        working_files = []
        not_working_files = []
        
        for file in files:
            full_path = os.path.join(haarcascades_dir, file)
            cascade = cv2.CascadeClassifier(full_path)
            
            if cascade.empty():
                not_working_files.append(file)
                print(f"  ❌ {file} - Failed to load")
            else:
                working_files.append(file)
                print(f"  ✅ {file} - Loaded successfully")
        
        # Summary
        print(f"\nSummary: {len(working_files)} working, {len(not_working_files)} not working")
        
        # Look for car-related cascades
        car_cascades = [f for f in working_files if 'car' in f.lower()]
        if car_cascades:
            print("\nCar-related cascades available:")
            for casc in car_cascades:
                print(f"  - {casc}")
        else:
            print("\nNo car-related cascades found.")
            print("Consider using 'haarcascade_fullbody.xml' as an alternative.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_available_cascades()