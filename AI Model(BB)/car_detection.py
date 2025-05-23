import cv2
import numpy as np

class CarDetector:
    def __init__(self):
        # Create background subtractor
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            detectShadows=True, 
            varThreshold=16,
            history=500
        )
        
    def detect_cars(self, frame):
        output_frame = frame.copy()
        
        # Apply background subtraction
        fg_mask = self.bg_subtractor.apply(frame)
        
        # Clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # should remove small noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        car_count = 0
        car_locations = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            #
            if 5000 < area < 30000:  # We are going to adjust based on the thresholds of the video
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filter by aspect ratio and dimensions
                aspect_ratio = w / h
                if 0.3 < aspect_ratio < 5.0 and w > 30 and h > 30:
                    # Draw rectangle
                    cv2.rectangle(output_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    cv2.putText(output_frame, f"Vehicle {car_count+1}", 
                               (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    
                    car_locations.append((x, y, w, h))
                    car_count += 1
        
        # Display count
        cv2.putText(output_frame, f"Vehicles: {car_count}", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
       
        
        results = {
            "car_count": car_count,
            "car_locations": car_locations,
            "fg_mask": fg_mask  # Include mask for debugging
        }
        
        return output_frame, results

# Global detector instance
detector = CarDetector()

def detect_cars(frame):
    """
    Wrapper function to maintain compatibility with your existing code
    """
    return detector.detect_cars(frame)