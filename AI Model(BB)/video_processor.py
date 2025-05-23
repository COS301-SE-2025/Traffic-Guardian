import cv2
import os
import numpy as np

class VideoProcessor:
    def __init__(self, video_path):
        """Initialize with video path"""
        self.video_path = video_path
        self.cap = None
        self.output_dir = "output_frames"
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def process_video(self, display=True, save_frames=False, process_frame_func=None):
        """Process video frames with optional function and saving"""
        # Check if file exists
        if not os.path.exists(self.video_path):
            print(f"Error: File '{self.video_path}' not found")
            return 0
        
        # Open video file
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            print(f"Error: Could not open video file '{self.video_path}'")
            return 0
        
        # Get video properties
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Video loaded: {self.video_path}")
        print(f"FPS: {fps}, Total frames: {frame_count}")
        print(f"Resolution: {width}x{height}")
        
        # Process video frame by frame
        frame_number = 0
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
                
            # Process frame based if a function provided
            if process_frame_func:
                processed_frame, results = process_frame_func(frame)
            else:
                processed_frame = frame
                results = {}
                
           
            cv2.putText(processed_frame, f"Frame: {frame_number}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
           
            if display:
                cv2.imshow('Video Processing', processed_frame)
                
                # Control playback speed based on FPS
                wait_time = int(1000/fps) if fps > 0 else 30
                
                # Press 'q' to quit, 'p' to pause
                key = cv2.waitKey(wait_time) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('p'):
                    cv2.waitKey(0)  

          
            if save_frames:
                output_path = os.path.join(self.output_dir, f"frame_{frame_number:04d}.jpg")
                cv2.imwrite(output_path, processed_frame)
                
            frame_number += 1
            
        # Clean up
        self.cleanup()
        return frame_number
    
    def cleanup(self):
        """Release resources"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()