import cv2
import os

def detect_cars(frame):
    """
    Detect cars using fullbody cascade (works well for cars too)
    """
    # Make a copy of the frame to avoid modifying the original
    output_frame = frame.copy()
    
    # Convert to grayscale for detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Use fullbody cascade instead of car cascade
    opencv_data_dir = os.path.join(os.path.dirname(cv2.__file__), "data")
    cascade_path = os.path.join(opencv_data_dir, "haarcascades", "haarcascade_fullbody.xml")
    
    # Load fullbody cascade classifier (works for cars too)
    car_cascade = cv2.CascadeClassifier(cascade_path)
    
    # Check if cascade loaded successfully
    if car_cascade.empty():
        print("Warning: Fullbody cascade not loaded properly")
        return frame, {"car_count": 0, "error": "Cascade not loaded"}
    
    # Detect objects - adjust parameters for better car detection
    cars = car_cascade.detectMultiScale(
        gray, 
        scaleFactor=1.05,    # Smaller step for better detection
        minNeighbors=3,      # Lower threshold 
        minSize=(80, 80),    # Larger minimum size for cars
        maxSize=(300, 300)   # Maximum size to filter out very large detections
    )
    
    # Draw rectangles around detected cars
    car_count = 0
    car_locations = []
    
    for (x, y, w, h) in cars:
        # Additional filtering based on aspect ratio (cars are usually wider than tall)
        aspect_ratio = w / h
        if 0.8 <= aspect_ratio <= 3.0:  # Reasonable car aspect ratios
            # Draw rectangle
            cv2.rectangle(output_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Add label
            cv2.putText(output_frame, f"Vehicle {car_count+1}", 
                       (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Store location
            car_locations.append((x, y, w, h))
            car_count += 1
    
    # Add car count to the frame
    cv2.putText(output_frame, f"Vehicles: {car_count}", 
               (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Return processed frame and results dictionary
    results = {
        "car_count": car_count,
        "car_locations": car_locations
    }
    
    return output_frame, results