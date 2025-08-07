"""
Enhanced Incident Detection System with ADVANCED Multi-Layer Collision Detection
Modified for Multi-Camera Support and Video Clip Recording
"""
import cv2
import torch
import time
import json
import requests
from datetime import datetime
import numpy as np
from collections import defaultdict, deque
import math
import os
import threading
import subprocess
from dotenv import load_dotenv

load_dotenv()

class AdvancedIncidentDetectionSystem:
    def __init__(self, camera_config=None, config=None):
        """
        Advanced incident detection system with multi-layer collision detection.
        Modified for multi-camera support and video clip recording.
        """
        self.camera_config = camera_config  # Single camera config
        self.config = config or self._default_config()
        
        # Initialize YOLO model
        self.model = self._load_model()
        self.target_classes = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
        # Vehicle tracking for trajectory analysis
        self.tracked_vehicles = {}
        self.vehicle_history = {}
        self.next_vehicle_id = 0
        self.history_length = 20  # Increased for better physics analysis
        
        # VIDEO CLIP RECORDING - NEW
        self.frame_buffer = deque(maxlen=300)  # Store last 10 seconds at 30fps
        self.recording_incident = False
        self.incident_clips_folder = "incident_for_classification"
        os.makedirs(self.incident_clips_folder, exist_ok=True)
        
        # ADVANCED COLLISION DETECTION COMPONENTS
        self.previous_frame = None
        self.collision_verification_layers = {
            'trajectory': [],
            'depth_analysis': [],
            'optical_flow': [],
            'physics_validation': []
        }
        
        # Physics tracking
        self.velocity_history = {}  # Track velocity over time for physics
        self.acceleration_history = {}  # Track acceleration patterns
        
        # Optical flow parameters
        self.flow_points = {}
        self.flow_threshold = 15.0  # Normal flow magnitude
        
        # Incident detection components (NO debris detection for now)
        self.incident_types = {
            'collision': [],
            'stopped_vehicle': [],
            'pedestrian_on_road': [],
            'sudden_speed_change': []
        }
        
        # Analytics and logging
        self.analytics = {
            'total_frames': 0,
            'total_detections': 0,
            'incidents_detected': 0,
            'class_totals': {},
            'start_time': time.time(),
            'alerts': [],
            'incident_log': [],
            'collision_layers': {
                'trajectory_detected': 0,
                'depth_confirmed': 0,
                'flow_confirmed': 0,
                'physics_confirmed': 0,
                'final_confirmed': 0
            },
            'api_reports_sent': 0,
            'api_failures': 0,
            'clips_recorded': 0  # NEW
        }
        
        self.api_config = self._load_api_config()
        
        # Video capture
        self.cap = None
        self.initialize_capture()
        
    def initialize_capture(self):
        """Initialize video capture for single camera."""
        if not self.camera_config:
            print("✗ No camera configuration provided")
            return False
            
        stream_url = self.camera_config['url']
        max_retries = 5
        
        for attempt in range(max_retries):
            self.cap = cv2.VideoCapture(stream_url)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                print(f"✓ Camera {self.camera_config['camera_id']} connected: {stream_url}")
                return True
            print(f"Camera {self.camera_config['camera_id']} connection attempt {attempt+1}/{max_retries} failed...")
            time.sleep(2)
        return False

    def _record_incident_clip(self, incident):
        """Record video clip of incident instead of calling API."""
        try:
            if len(self.frame_buffer) < 30:  # Need at least 1 second of footage
                print("⚠️ Not enough frames buffered for clip recording")
                return
            
            # Create unique filename with timestamp and camera ID
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            camera_id = self.camera_config['camera_id']
            incident_type = incident.get('type', 'unknown')
            
            filename = f"{self.incident_clips_folder}/incident_{camera_id}_{timestamp}_{incident_type}.mp4"
            
            # Get video properties from capture
            fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or 30
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
            
            # Create video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
            
            if not out.isOpened():
                print(f"✗ Failed to create video writer for {filename}")
                return
            
            # Write frames from buffer (includes lead-up to incident)
            frames_written = 0
            for frame in self.frame_buffer:
                if frame is not None:
                    # Resize frame if needed
                    if frame.shape[:2] != (height, width):
                        frame = cv2.resize(frame, (width, height))
                    out.write(frame)
                    frames_written += 1
            
            out.release()
            
            if frames_written > 0:
                self.analytics['clips_recorded'] += 1
                print(f"🎥 Incident clip recorded: {filename}")
                print(f"   Frames: {frames_written}, Duration: {frames_written/fps:.1f}s")
                
                # Call classification.py with camera_id
                self._call_classification(camera_id)
            else:
                print(f"✗ No frames written to {filename}")
                # Clean up empty file
                if os.path.exists(filename):
                    os.remove(filename)
                    
        except Exception as e:
            print(f"✗ Error recording incident clip: {e}")

    def _call_classification(self, camera_id):
        """Call classification.py with camera_id."""
        try:
            # Run classification.py as subprocess with camera_id parameter
            subprocess.Popen([
                'python', 'classification.py', camera_id
            ], cwd='.', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            print(f"📊 Classification called for camera: {camera_id}")
            
        except Exception as e:
            print(f"✗ Error calling classification.py: {e}")

    def run_detection(self):
        """Main detection loop with advanced multi-layer collision detection."""
        if not self.cap or not self.cap.isOpened():
            print("✗ Video capture not initialized")
            return
        
        camera_id = self.camera_config['camera_id']
        print(f"🚀 Starting detection for camera: {camera_id}")
        print("🔍 Multi-layer collision detection enabled:")
        print("  Layer 1: Trajectory Prediction")
        print("  Layer 2: Depth Analysis") 
        print("  Layer 3: Optical Flow Analysis")
        print("  Layer 4: Physics Validation")
        print("Controls:")
        print("  'q' = quit")
        print("  's' = save frame") 
        print("  'r' = reset analytics")
        print("  'f' = toggle fullscreen")
        print("  ESC = exit fullscreen")
        
        frame_count = 0
        is_fullscreen = False
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    if self.camera_config['url'].endswith(('.mp4', '.avi', '.mov')):  # Video file
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Restart video
                        continue
                    else:  # Stream - try to reconnect
                        print(f"⚠️ Camera {camera_id} disconnected, attempting reconnection...")
                        if not self.initialize_capture():
                            break
                        continue
                
                frame_count += 1
                if frame_count % self.config['frame_skip'] != 0:
                    continue
                
                # Add frame to buffer for clip recording
                self.frame_buffer.append(frame.copy())
                
                # Core object detection
                detection_results = self._detect_objects(frame)
                
                # Vehicle tracking and trajectory analysis
                tracking_results = self._update_vehicle_tracking(detection_results['detections'])
                
                # ADVANCED Multi-Layer Incident Detection
                incidents = self._detect_incidents_multilayer(frame, detection_results, tracking_results)
                
                # Update analytics
                self._update_analytics(detection_results, incidents)
                
                # Process alerts and record clips instead of API calls
                self._process_alerts_and_record(incidents)
                
                # Create visualization
                annotated_frame = self._create_visualization(frame, detection_results, incidents)
                
                # Display
                if self.config['display_window']:
                    window_name = f"Camera {camera_id} - Advanced Incident Detection"
                    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
                    cv2.imshow(window_name, annotated_frame)
                
                # Store previous frame for optical flow
                self.previous_frame = frame.copy()
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self._save_frame(annotated_frame, frame_count, manual=True)
                elif key == ord('r'):
                    self._reset_analytics()
                elif key == ord('f'):
                    # Toggle fullscreen
                    window_name = f"Camera {camera_id} - Advanced Incident Detection"
                    is_fullscreen = not is_fullscreen
                    if is_fullscreen:
                        cv2.setWindowProperty(window_name, 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                        print("🖥️ Switched to fullscreen mode (Press ESC or 'f' to exit)")
                    else:
                        cv2.setWindowProperty(window_name, 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                        print("🪟 Switched to windowed mode")
                elif key == 27:  # ESC key
                    if is_fullscreen:
                        window_name = f"Camera {camera_id} - Advanced Incident Detection"
                        is_fullscreen = False
                        cv2.setWindowProperty(window_name, 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                        print("🪟 Exited fullscreen mode")
                
        except KeyboardInterrupt:
            print(f"\n⏹️ Detection stopped for camera {camera_id}")
        finally:
            self._cleanup()

    def _process_alerts_and_record(self, incidents):
        """Process alerts and record clips instead of API calls."""
        for incident in incidents:
            incident_type = incident['type']
            severity = incident.get('severity', 'MEDIUM')
            
            if incident_type == 'collision':
                ttc = incident['time_to_collision']
                vehicles = ' and '.join(incident['vehicles'])
                confidence = incident.get('confidence', 0)
                layers = incident.get('validation_layers', {})
                
                print(f"🚨 {severity} COLLISION ALERT:")
                print(f"   Camera: {self.camera_config['camera_id']}")
                print(f"   Vehicles: {vehicles}")
                print(f"   Time to collision: {ttc:.1f}s")
                print(f"   Multi-layer confidence: {confidence:.2f}")
                print(f"   Validation layers: {layers}")
                
                # Record clip instead of API call
                self._record_incident_clip(incident)
            
            elif incident_type == 'stopped_vehicle':
                duration = incident['stopped_duration']
                vehicle_class = incident['vehicle_class']
                print(f"⚠️ {severity} ALERT: {vehicle_class} stopped for {duration:.1f}s")
                print(f"   Camera: {self.camera_config['camera_id']}")
                
                # Record clip for stopped vehicle incidents too
                if duration > 15:  # Only record for longer stops
                    self._record_incident_clip(incident)
            
            elif incident_type == 'pedestrian_on_road':
                print(f"🚶 {severity} ALERT: Pedestrian detected on roadway!")
                print(f"   Camera: {self.camera_config['camera_id']}")
                self._record_incident_clip(incident)
            
            elif incident_type == 'sudden_speed_change':
                vehicle_class = incident['vehicle_class']
                speed_change = incident['speed_change']
                print(f"⚡ {severity} ALERT: {vehicle_class} sudden speed change ({speed_change:.1f}x)")
                print(f"   Camera: {self.camera_config['camera_id']}")
                
                # Only record clips for significant speed changes
                if speed_change > 1.5:
                    self._record_incident_clip(incident)
            
            self.analytics['alerts'].append(incident)

    # ... (Keep all the existing methods unchanged from here)
    
    def _default_config(self):
        """Enhanced configuration with advanced collision detection settings."""
        return {
            # YOLO settings - can be overridden by environment variables
            'model_version': os.getenv('MODEL_VERSION', 'yolov8s'),
            'confidence_threshold': float(os.getenv('CONFIDENCE_THRESHOLD', '0.4')),
            'iou_threshold': 0.45,
            
            # Display and logging
            'display_window': True,
            'save_incidents': True,
            'log_detections': True,
            'frame_skip': 2,
            
            # Location configuration from environment
            'incident_location': os.getenv('INCIDENT_LOCATION', 'Traffic Camera Location'),
            
            # MULTI-LAYER COLLISION DETECTION SETTINGS
            'collision_distance_threshold': 35,    # Even tighter
            'prediction_horizon': 12,              # Shorter prediction
            'min_tracking_confidence': 0.7,        # Higher confidence
            'min_collision_speed': 5.0,            # Must be moving faster
            'collision_angle_threshold': 30,       # More restrictive angle
            'min_trajectory_length': 8,            # Longer history required
            'collision_persistence': 5,            # Must persist longer
            
            # DEPTH ESTIMATION SETTINGS
            'depth_analysis_enabled': True,
            'depth_difference_threshold': 0.3,     # Objects must be at different depths
            'shadow_detection_threshold': 0.8,     # Shadow intensity ratio
            
            # OPTICAL FLOW SETTINGS  
            'optical_flow_enabled': True,
            'flow_magnitude_threshold': 20.0,      # Sudden motion change
            'flow_direction_change_threshold': 45,  # Direction change in degrees
            
            # PHYSICS VALIDATION SETTINGS
            'physics_validation_enabled': True,
            'max_realistic_acceleration': 15.0,    # Max believable acceleration change
            'momentum_change_threshold': 25.0,     # Significant momentum change
            'deceleration_threshold': 12.0,        # Sudden stop indicator
            
            # FINAL VALIDATION REQUIREMENTS
            'require_all_layers': False,           # True = all layers must agree
            'minimum_layer_agreement': 3,          # At least 3 layers must agree
            'collision_confidence_threshold': 0.8, # Final confidence threshold
            
            # Other incident detection thresholds
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'pedestrian_road_threshold': 50,
        }
    
    def _load_api_config(self):
        """
        Securely load API configuration from environment variables.
        """
        api_key = os.getenv('API_KEY')
        
        if not api_key:
            print("⚠️ WARNING: API_KEY not found in environment variables!")
            print("   Please create a .env file with your API key")
            print("   API integration will be disabled")
            return {
                'endpoint': 'http://localhost:5000/api/incidents',
                'api_key': None,
                'timeout': 5,
                'retry_attempts': 2,
                'enabled': False
            }
        
        return {
            'endpoint': os.getenv('API_ENDPOINT', 'http://localhost:5000/api/incidents'),
            'api_key': api_key,
            'timeout': int(os.getenv('API_TIMEOUT', '5')),
            'retry_attempts': int(os.getenv('API_RETRY_ATTEMPTS', '2')),
            'enabled': True
        }

    # ... (All other existing methods remain unchanged)
    # Copy all the existing methods from the original code here
    # (_load_model, _detect_objects, etc.)


def load_camera_configurations():
    """Load camera configurations from cameras/cameras.json."""
    try:
        with open('cameras/cameras.json', 'r') as f:
            data = json.load(f)
            return data.get('cameras', [])
    except FileNotFoundError:
        print("✗ cameras/cameras.json not found")
        return []
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing cameras.json: {e}")
        return []


def run_camera_detection(camera_config, config):
    """Run detection for a single camera."""
    detector = AdvancedIncidentDetectionSystem(camera_config=camera_config, config=config)
    detector.run_detection()


def main():
    """Main function to run multi-camera incident detection system."""
    # Advanced configuration
    config = {
        # YOLO model settings
        'model_version': 'yolov8s',
        'confidence_threshold': 0.4,
        'iou_threshold': 0.45,
        
        # System settings
        'display_window': True,
        'save_incidents': True,
        'log_detections': True,
        'frame_skip': 2,
        
        # ADVANCED MULTI-LAYER COLLISION DETECTION
        'collision_distance_threshold': 35,
        'prediction_horizon': 12,
        'min_tracking_confidence': 0.7,
        'min_collision_speed': 5.0,
        'collision_angle_threshold': 30,
        'min_trajectory_length': 8,
        'collision_persistence': 5,
        
        # DEPTH ANALYSIS SETTINGS
        'depth_analysis_enabled': True,
        'depth_difference_threshold': 0.3,
        'shadow_detection_threshold': 0.8,
        
        # OPTICAL FLOW SETTINGS  
        'optical_flow_enabled': True,
        'flow_magnitude_threshold': 20.0,
        'flow_direction_change_threshold': 45,
        
        # PHYSICS VALIDATION SETTINGS
        'physics_validation_enabled': True,
        'max_realistic_acceleration': 15.0,
        'momentum_change_threshold': 25.0,
        'deceleration_threshold': 12.0,
        
        # FINAL VALIDATION REQUIREMENTS
        'require_all_layers': False,
        'minimum_layer_agreement': 3,
        'collision_confidence_threshold': 0.75,
        
        # Other settings
        'stopped_vehicle_time': 10,
        'speed_change_threshold': 0.8,
        'pedestrian_road_threshold': 50,
    }
    
    print("🚀 Initializing ADVANCED Multi-Camera Incident Detection System...")
    print("="*70)
    
    # Load camera configurations
    cameras = load_camera_configurations()
    
    if not cameras:
        print("✗ No camera configurations found")
        return
    
    print(f"📹 Found {len(cameras)} camera(s):")
    for cam in cameras:
        print(f"   Camera ID: {cam.get('camera_id', 'Unknown')}")
        print(f"   URL: {cam.get('url', 'Unknown')}")
    
    print("\n🔬 NEW FEATURES:")
    print("✓ Multi-camera support from cameras/cameras.json")
    print("✓ Video clip recording instead of API calls")
    print("✓ Automatic classification.py invocation")
    print("✓ Incident clips saved to incident_for_classification/")
    print("="*70)
    
    # Create and start detection threads for each camera
    threads = []
    
    for camera_config in cameras:
        if not camera_config.get('camera_id') or not camera_config.get('url'):
            print(f"⚠️ Skipping invalid camera config: {camera_config}")
            continue
            
        thread = threading.Thread(
            target=run_camera_detection,
            args=(camera_config, config),
            name=f"Camera-{camera_config['camera_id']}"
        )
        threads.append(thread)
        thread.start()
        print(f"🎬 Started detection thread for camera: {camera_config['camera_id']}")
    
    if not threads:
        print("✗ No valid camera configurations found")
        return
    
    try:
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        print("\n Stopping all camera detection threads...")


if __name__ == "__main__":
    main()