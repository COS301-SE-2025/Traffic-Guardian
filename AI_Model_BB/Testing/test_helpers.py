
import cv2
import numpy as np
import tempfile
import os
import sys

# Get Code folder path
def get_code_folder():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    return os.path.join(project_root, 'Code')

CODE_FOLDER = get_code_folder()

def create_test_frame(width=640, height=480, num_cars=2):
    """
    Create a test frame with simulated car-like rectangles
    
    Args:
        width (int): Frame width
        height (int): Frame height  
        num_cars (int): Number of car-like objects to add
        
    Returns:
        np.ndarray: Test frame with car-like objects
    """
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Add background noise
    noise = np.random.randint(0, 50, (height, width, 3), dtype=np.uint8)
    frame = cv2.add(frame, noise)
    
    # Add car-like rectangles
    car_positions = [
        (50, 100, 120, 80),   # x, y, w, h
        (300, 200, 100, 60),
        (500, 150, 90, 70),
        (200, 300, 110, 75),
        (400, 350, 95, 65)
    ]
    
    for i in range(min(num_cars, len(car_positions))):
        x, y, w, h = car_positions[i]
        # Random car color
        color = tuple(np.random.randint(100, 255, 3).tolist())
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, -1)
        
        # Add some details to make it more car-like
        # Windows
        cv2.rectangle(frame, (x + 10, y + 10), (x + w - 10, y + h//2), (50, 50, 150), -1)
        # Wheels
        cv2.circle(frame, (x + 20, y + h - 10), 8, (0, 0, 0), -1)
        cv2.circle(frame, (x + w - 20, y + h - 10), 8, (0, 0, 0), -1)
    
    return frame

def create_test_video(filename, num_frames=30, fps=30, width=640, height=480):
    """
    Create a test video file for testing
    
    Args:
        filename (str): Output video filename
        num_frames (int): Number of frames to generate
        fps (int): Frames per second
        width (int): Video width
        height (int): Video height
        
    Returns:
        str: Path to created video file
    """
    # Ensure the directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
    
    for frame_num in range(num_frames):
        # Create frame with moving cars
        frame = create_test_frame(width, height, num_cars=3)
        
        # Simulate movement by shifting car positions
        shift_x = (frame_num * 5) % 100
        shifted_frame = np.roll(frame, shift_x, axis=1)
        
        out.write(shifted_frame)
    
    out.release()
    return filename

def create_test_video_in_code_folder(filename="test_video.mp4", num_frames=30):
    """
    Create a test video in the Code/Videos folder
    
    Args:
        filename (str): Video filename
        num_frames (int): Number of frames
        
    Returns:
        str: Full path to created video
    """
    videos_folder = os.path.join(CODE_FOLDER, "Videos")
    os.makedirs(videos_folder, exist_ok=True)
    
    video_path = os.path.join(videos_folder, filename)
    return create_test_video(video_path, num_frames)

def assert_valid_detection_results(results):
    """
    Assert that detection results have the expected structure
    
    Args:
        results (dict): Detection results to validate
        
    Raises:
        AssertionError: If results don't match expected structure
    """
    assert isinstance(results, dict), "Results must be a dictionary"
    assert 'car_count' in results, "Results must contain 'car_count'"
    assert 'car_locations' in results, "Results must contain 'car_locations'"
    
    assert isinstance(results['car_count'], int), "car_count must be an integer"
    assert results['car_count'] >= 0, "car_count must be non-negative"
    
    assert isinstance(results['car_locations'], list), "car_locations must be a list"
    assert len(results['car_locations']) == results['car_count'], \
        "car_locations length must match car_count"
    
    # Validate each location
    for location in results['car_locations']:
        assert isinstance(location, tuple), "Each location must be a tuple"
        assert len(location) == 4, "Each location must have 4 values (x, y, w, h)"
        x, y, w, h = location
        assert all(isinstance(val, (int, np.integer)) for val in location), \
            "All location values must be integers"
        assert w > 0 and h > 0, "Width and height must be positive"

class MockVideoCapture:
    """Mock VideoCapture for testing without real video files"""
    
    def __init__(self, frames, fps=30.0):
        """
        Initialize mock video capture
        
        Args:
            frames (list): List of frames to return
            fps (float): Simulated FPS
        """
        self.frames = frames
        self.fps = fps
        self.current_frame = 0
        self.opened = True
    
    def isOpened(self):
        return self.opened
    
    def get(self, prop):
        prop_map = {
            cv2.CAP_PROP_FPS: self.fps,
            cv2.CAP_PROP_FRAME_COUNT: len(self.frames),
            cv2.CAP_PROP_FRAME_WIDTH: self.frames[0].shape[1] if self.frames else 640,
            cv2.CAP_PROP_FRAME_HEIGHT: self.frames[0].shape[0] if self.frames else 480
        }
        return prop_map.get(prop, 0)
    
    def read(self):
        if self.current_frame < len(self.frames):
            frame = self.frames[self.current_frame]
            self.current_frame += 1
            return True, frame
        else:
            return False, None
    
    def release(self):
        self.opened = False

def get_videos_folder():
    """Get the path to the Videos folder inside Code"""
    return os.path.join(CODE_FOLDER, "Videos")

def list_available_videos():
    """List all video files in the Code/Videos folder"""
    videos_folder = get_videos_folder()
    
    if not os.path.exists(videos_folder):
        return []
    
    video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.flv')
    videos = [f for f in os.listdir(videos_folder) if f.lower().endswith(video_extensions)]
    return videos

def get_sample_video_path():
    """Get path to a sample video for testing"""
    videos = list_available_videos()
    
    if videos:
        return os.path.join(get_videos_folder(), videos[0])
    else:
        # Create a test video if none exist
        return create_test_video_in_code_folder()

