import cv2
import os
from datetime import datetime

class VideoProcessor:
    def __init__(self, source_path=None, output_dir="processed_frames"):
        self.source_path = source_path
        self.output_dir = output_dir
        self.cap = None
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def connect_to_source(self, source_path=None):
        """Connect to video source - file or camera"""
        if source_path:
            self.source_path = source_path
        
        # Try to open the video source
        if self.source_path:
            self.cap = cv2.VideoCapture(self.source_path)
        else:
            # Default to first webcam if no source specified
            self.cap = cv2.VideoCapture(0)
        
        if not self.cap.isOpened():
            raise Exception(f"Failed to open video source: {self.source_path}")
        
        # Get video properties
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Connected to video source: {self.source_path}")
        print(f"Resolution: {self.frame_width}x{self.frame_height}, FPS: {self.fps}")
        
        return self.cap
    
    def process_video(self, display=True, save_frames=False, process_frame_func=None):
        """Process video frames from the source"""
        if not self.cap or not self.cap.isOpened():
            self.connect_to_source()
        
        frame_count = 0
        
        while True:
            # Read frame
            ret, frame = self.cap.read()
            
            if not ret:
                print("End of video stream")
                break
            
            # Apply custom processing function if provided
            if process_frame_func:
                processed_frame = process_frame_func(frame)
            else:
                processed_frame = frame
            
            # Display the frame
            if display:
                cv2.imshow('Traffic Guardian Video Feed', processed_frame)
            
            # Save frame if requested
            if save_frames and frame_count % 30 == 0:  # Save every 30th frame
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filename = os.path.join(self.output_dir, f"frame_{timestamp}.jpg")
                cv2.imwrite(filename, processed_frame)
            
            frame_count += 1
            
            # Press 'q' to exit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        # Release resources
        self.release()
        
        return frame_count
    
    def release(self):
        """Release video capture resources"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        print("Video processing resources released")


if __name__ == "__main__":
    # Change to your video file path
    video_path = "path/to/your/traffic_video.mp4"
    
    processor = VideoProcessor(video_path)
    processor.process_video(display=True, save_frames=True)