import cv2
import numpy as np

def detect_cars(frame):
    """
    This is Basic car detection using Haar Cascades
    This is a simple method - we will use a TensorFlow models later
    """
    # Convert frame to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Load car detection classifier
    car_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_car.xml')
    
    # Detect cars
    cars = car_cascade.detectMultiScale(gray, 1.1, 3)
    
    # Draw rectangles around detected cars
    for (x, y, w, h) in cars:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, 'Car', (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Add frame info
    cv2.putText(frame, f'Vehicles detected: {len(cars)}', (20, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    
    return frame