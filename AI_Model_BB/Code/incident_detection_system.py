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
from hls_stream_adapter import StreamCapture

load_dotenv()

class AdvancedIncidentDetectionSystem:
    def __init__(self, camera_config=None, config=None):
        """
        Advanced incident detection system with multi-layer collision detection.
        Modified for multi-camera support and video clip recording.
        """
        self.camera_config = camera_config  # Single camera config
        self.config = config or self._default_config()
        
        # Apply camera-specific threshold adjustments
        self._adapt_thresholds_for_camera()
        
        # Initialize YOLO model
        self.model = self._load_model()
        self.target_classes = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
        # Vehicle tracking for trajectory analysis
        self.tracked_vehicles = {}
        self.vehicle_history = {}
        self.next_vehicle_id = 0
        self.history_length = 20  # Increased for better physics analysis
        
        self.frame_buffer = deque(maxlen=300)  # Store last 10 seconds at 30fps
        self.recording_incident = False
        self.incident_clips_folder = "incident_for_classification"
        os.makedirs(self.incident_clips_folder, exist_ok=True)
        self.recent_incidents = []  # Store recent incidents to prevent duplicates
        self.incident_cooldown = {}  # Cooldown periods for different incident types
        
        # ENHANCED COLLISION DETECTION COMPONENTS
        self.previous_frame = None
        self.collision_verification_layers = {
            'trajectory': [],
            'depth_analysis': [],
            'optical_flow': [],
            'physics_validation': []
        }
        
        # Enhanced evidence tracking
        self.collision_evidence_buffer = {}  # Track evidence over time
        self.incident_candidates = {}  # store incident candidates with persistence tracking
        self.persistence_required = 5  # number of consecutive frames to confirm incident
        self.ttc_history = {}  # track TTC trends
        
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
        
    def _adapt_thresholds_for_camera(self):
        """
        Adapt detection thresholds based on camera characteristics and stream type.
        Provides better balance between false positive reduction and collision detection.
        """
        if not self.camera_config:
            return
            
        camera_url = self.camera_config.get('url', '')
        camera_id = self.camera_config.get('camera_id', '')
        
        # Detect stream type and camera characteristics
        is_live_stream = '.m3u8' in camera_url.lower() or 'stream' in camera_url.lower()
        is_highway_camera = 'highway' in camera_url.lower() or 'arterial' in camera_url.lower()
        is_intersection_camera = 'intersection' in camera_url.lower() or 'traffic' in camera_url.lower()
        
        # Base adjustments for live streams (like camera 3)
        if is_live_stream:
            # Live streams have different motion patterns and latency
            self.config['collision_confidence_threshold'] = 0.5  # Reduced from 0.7
            self.config['minimum_layer_agreement'] = 2  # Keep at 2 for balance
            self.config['collision_distance_threshold'] = 25  # Slightly closer
            self.config['min_collision_speed'] = 6.0  # Lower minimum speed
            
        # Highway/arterial camera adjustments
        if is_highway_camera or camera_id == '3':  # Camera 3 is highway type
            self.config['collision_confidence_threshold'] = 0.45  # Even lower for highway
            self.config['collision_angle_threshold'] = 45  # Allow more varied collision angles
            self.config['min_collision_speed'] = 7.0  # Slightly higher speeds expected
            self.config['prediction_horizon'] = 20  # Longer prediction for highway speeds
            
        # Intersection camera adjustments  
        elif is_intersection_camera or camera_id in ['1', '2']:  # Cameras 1&2 are intersection type
            self.config['collision_confidence_threshold'] = 0.6  # Higher for intersections
            self.config['collision_angle_threshold'] = 25  # Stricter angles for T-bone detection
            self.config['min_collision_speed'] = 5.0  # Lower speeds in intersections
            
        # Video file adjustments (usually higher quality, stable feed)
        elif camera_url.endswith(('.mp4', '.avi', '.mov')):
            self.config['collision_confidence_threshold'] = 0.65  # Can be higher for stable video
            
        print(f"🎯 Camera {camera_id} thresholds adapted:")
        print(f"   Confidence threshold: {self.config['collision_confidence_threshold']}")
        print(f"   Distance threshold: {self.config['collision_distance_threshold']}")
        print(f"   Speed threshold: {self.config['min_collision_speed']}")
        print(f"   Angle threshold: {self.config['collision_angle_threshold']}")
        
        # Traffic density monitoring for adaptive thresholds
        self.traffic_density_history = deque(maxlen=30)  # Last 30 frames
        self.current_density_level = 'normal'  # low, normal, high, very_high
        
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
            'clips_recorded': 0 
        }
        
        # Video capture
        self.cap = None
        self.initialize_capture()

   
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
            
            # ENHANCED MULTI-LAYER COLLISION DETECTION SETTINGS
            'collision_distance_threshold': 30,    # Adjusted for better precision
            'prediction_horizon': 15,              # Prediction window for trajectory analysis
            'min_tracking_confidence': 0.7,        # Reasonable confidence for tracking
            'min_collision_speed': 8.0,            # Increased to avoid slow traffic
            'collision_angle_threshold': 30,       # Allow more collision angles (T-bone, side impacts)
            'min_trajectory_length': 10,           # Shorter history - accidents happen quickly
            'collision_persistence': 5,            # Shorter persistence requirement
            
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
            'deceleration_threshold': 10.0,        # Adjusted sudden stop indicator
            
            # ENHANCED VALIDATION REQUIREMENTS
            'require_all_layers': False,           # Don't require ALL layers - real accidents are complex
            'minimum_layer_agreement': 2,          # Require 2 out of 4 layers minimum
            'collision_confidence_threshold': 0.7, # Higher confidence threshold
            
            # Other incident detection thresholds
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'pedestrian_road_threshold': 50,
        }
    
    def _load_model(self):
        """Load YOLO model with error handling."""
        try:
            from ultralytics import YOLO
            model = YOLO(f"{self.config['model_version']}.pt")
            print(f"✓ Loaded {self.config['model_version']} model")
            self.model_type = 'yolov8'
            return model
        except ImportError:
            try:
                model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
                print("✓ Loaded YOLOv5 model (fallback)")
                self.model_type = 'yolov5'
                return model
            except Exception as e:
                print(f"✗ Failed to load model: {e}")
                return None
    
    def initialize_capture(self):
        """Initialize video capture for single camera with HLS support."""
        if not self.camera_config:
            print("No camera configuration provided")
            return False
            
        stream_url = self.camera_config['url']
        camera_id = self.camera_config['camera_id']
        
        print(f"Initializing camera {camera_id}...")
        
        # Use StreamCapture wrapper for both MP4 and HLS streams
        self.cap = StreamCapture(stream_url, max_retries=5)
        
        if self.cap.open():
            print(f"✓ Camera {camera_id} connected successfully")
            print(f"   URL: {stream_url}")
            return True
        else:
            print(f"✗ Failed to connect camera {camera_id}")
            print(f"   URL: {stream_url}")
            return False
    
    def _relative_velocity_score(self, v1, v2):
        v1 = np.array(v1)
        v2 = np.array(v2)
        return np.linalg.norm(v1 - v2)
    
    def _calculate_angle(self, v1, v2):
        v1 = np.array(v1)
        v2 = np.array(v2)
        if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
            return 0
        cos_angle = np.clip(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)), -1, 1)
        return math.degrees(math.acos(cos_angle))
    
    def _is_duplicate_incident(self, incident, current_frame):
        """Check if this incident is a duplicate of a recent one."""
        incident_type = incident['type']
        current_time = time.time()
        
        # Define cooldown periods for different incident types (in seconds)
        cooldown_periods = {
            'collision': 10,  
            'stopped_vehicle': 30,  
            'pedestrian_on_road': 15, 
            'sudden_speed_change': 20  
        }
        
        cooldown_period = cooldown_periods.get(incident_type, 15)
        
        # Check if this incident type is in cooldown
        if incident_type in self.incident_cooldown:
            time_since_last = current_time - self.incident_cooldown[incident_type]
            if time_since_last < cooldown_period:
                return True  # Still in cooldown, this is a duplicate
        
        # For collision incidents, also check vehicle positions to avoid duplicates
        if incident_type == 'collision':
            incident_pos = incident.get('positions', [])
            
            # Check recent incidents for similar collision positions
            for recent_incident in self.recent_incidents[-5:]:  # Check last 5 incidents
                if (recent_incident['type'] == 'collision' and 
                    current_time - recent_incident['timestamp'] < cooldown_period):
                    
                    recent_pos = recent_incident.get('positions', [])
                    
                    # Calculate distance between incident positions
                    if incident_pos and recent_pos:
                        try:
                            pos1 = incident_pos[0] if incident_pos else [0, 0]
                            pos2 = recent_pos[0] if recent_pos else [0, 0]
                            
                            distance = ((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)**0.5
                            
                            # If positions are very close (within 50 pixels), consider it duplicate
                            if distance < 50:
                                return True
                        except (IndexError, TypeError):
                            pass
        
        return False

    def _record_incident_if_not_duplicate(self, incident, current_frame):
        """Record incident only if it's not a duplicate."""
        if self._is_duplicate_incident(incident, current_frame):
            return False  # Skip recording, it's a duplicate
        
        # Record the incident
        self._record_incident_clip(incident)
        
        # Update cooldown and recent incidents
        incident_type = incident['type']
        current_time = time.time()
        
        self.incident_cooldown[incident_type] = current_time
        
        # Add to recent incidents with timestamp
        incident_with_timestamp = incident.copy()
        incident_with_timestamp['timestamp'] = current_time
        self.recent_incidents.append(incident_with_timestamp)
        
        # Keep only last 10 recent incidents
        if len(self.recent_incidents) > 10:
            self.recent_incidents.pop(0)
        
        return True  # Successfully recorded

    def _record_incident_clip(self, incident):
        """Record video clip of incident instead of calling API."""
        try:
            if len(self.frame_buffer) < 30:  # Need at least 1 second of footage
                print("Not enough frames buffered for clip recording")
                return
            
            # Create unique filename with timestamp and camera ID
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # Include milliseconds
            camera_id = self.camera_config['camera_id']
            incident_type = incident.get('type', 'unknown')
            
            filename = f"{self.incident_clips_folder}/incident_{camera_id}_{timestamp}_{incident_type}.mp4"
            
            # Get video properties - use actual frame dimensions instead of capture properties
            sample_frame = None
            for frame in self.frame_buffer:
                if frame is not None:
                    sample_frame = frame
                    break
            
            if sample_frame is None:
                print("✗ No valid frames in buffer")
                return
            
            height, width = sample_frame.shape[:2]
            fps = 30  # Use fixed FPS for consistency
            
            # Try different codecs for better compatibility
            codecs_to_try = [
                ('mp4v', '.mp4'),
                ('XVID', '.avi'), 
                ('MJPG', '.avi')
            ]
            
            out = None
            final_filename = filename
            
            for codec, extension in codecs_to_try:
                try:
                    test_filename = filename.replace('.mp4', extension)
                    fourcc = cv2.VideoWriter_fourcc(*codec)
                    out = cv2.VideoWriter(test_filename, fourcc, fps, (width, height))
                    
                    if out.isOpened():
                        final_filename = test_filename
                        print(f"✓ Using codec {codec} for video recording")
                        break
                    else:
                        out.release()
                        out = None
                except Exception as e:
                    if out:
                        out.release()
                    out = None
                    continue
            
            if out is None:
                print(f"✗ Failed to create video writer with any codec")
                return
            
            # Write frames from buffer (includes lead-up to incident)
            frames_written = 0
            print(f"Recording incident clip with {len(self.frame_buffer)} frames...")
            
            for frame in self.frame_buffer:
                if frame is not None:
                    # Ensure frame dimensions match
                    if frame.shape[:2] != (height, width):
                        frame = cv2.resize(frame, (width, height))
                    
                    # Ensure frame is in BGR format
                    if len(frame.shape) == 3 and frame.shape[2] == 3:
                        out.write(frame)
                        frames_written += 1
            
            # Properly close the video writer
            out.release()
            out = None
            
            if frames_written > 0:
                self.analytics['clips_recorded'] += 1
                print(f"✓ Incident clip recorded: {final_filename}")
                print(f"   Frames: {frames_written}, Duration: {frames_written/fps:.1f}s")
                print(f"   Resolution: {width}x{height}")
                
                # Small delay to ensure file is fully written
                time.sleep(0.5)
                
                # Call video_incident_classifier.py with camera_id
                self._call_classification()
            else:
                print(f"✗ No frames written to {final_filename}")
                # Clean up empty file
                if os.path.exists(final_filename):
                    os.remove(final_filename)
                    
        except Exception as e:
            print(f"✗ Error recording incident clip: {e}")
            import traceback
            traceback.print_exc()

    def _call_classification(self):
        """Call video_incident_classifier.py without camera_id."""
        try:
            # Run video_incident_classifier.py as subprocess
            subprocess.Popen([
                'python', 'video_incident_classifier.py'
            ], cwd='.', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            print(f"✓ Classification called")
            
        except Exception as e:
            print(f"✗ Error calling video_incident_classifier.py: {e}")
    
    def run_detection(self):
        """Main detection loop with enhanced multi-layer collision detection."""
        if not self.cap or not self.cap.isOpened():
            print("✗ Video capture not initialized")
            return
        
        camera_id = self.camera_config['camera_id']
        print(f"🚀 Starting detection for camera: {camera_id}")
        print("🔍 Enhanced collision detection enabled:")
        print("  Layer 1: Traffic-Aware Trajectory Prediction")
        print("  Layer 2: Evidence Persistence Validation") 
        print("  Layer 3: Enhanced Physics Analysis")
        print("  Layer 4: Smart Traffic Flow Filtering")
        print("Controls:")
        print("  'q' = quit")
        print("  's' = save frame") 
        print("  'r' = reset analytics")
        print("  'f' = toggle fullscreen")
        print("  ESC = exit fullscreen")
        
        frame_count = 0
        is_fullscreen = False
        video_ended = False
        last_incident_frame = -1  # Track when last incident occurred
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    stream_url = self.camera_config['url']
                    is_hls = stream_url.lower().endswith('.m3u8') or 'm3u8' in stream_url.lower()
                    is_video_file = stream_url.endswith(('.mp4', '.avi', '.mov'))
                    
                    if is_hls:
                        # For HLS streams, try to reconnect using the stream handler
                        print(f"🔄 HLS stream disconnected for camera {camera_id}")
                        if hasattr(self.cap, 'reconnect') and self.cap.reconnect():
                            print(f"✓ HLS stream reconnected")
                            continue
                        else:
                            print(f"✗ Failed to reconnect HLS stream")
                            break
                            
                    elif is_video_file:  
                        # Video file ended - restart from beginning
                        print(f"🔄 Video ended for camera {camera_id}, restarting...")
                        time.sleep(2)  # Allow video writing to complete
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Restart video
                        continue
                        
                    else:
                        # Other stream types - try to reconnect
                        print(f"🔄 Stream disconnected for camera {camera_id}, reconnecting...")
                        if not self.initialize_capture():
                            print(f"✗ Failed to reconnect stream")
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
                
                # Update traffic density for adaptive thresholds
                self._update_traffic_density(detection_results['detections'])
                
                # ENHANCED Multi-Layer Incident Detection with traffic awareness
                incidents = self._detect_incidents_multilayer(frame, detection_results, tracking_results)
                
                # Update analytics
                self._update_analytics(detection_results, incidents)
                
                # Process alerts and record clips instead of API calls
                if incidents:
                    # Only process if it's been a while since the last incident (avoid duplicates)
                    if frame_count - last_incident_frame > 90:  # 3 seconds gap at 30fps
                        self._process_alerts_and_record(incidents, frame_count)
                        last_incident_frame = frame_count
                        print(f"🎯 Incident recorded at frame {frame_count}. Press 'q' to exit after recording completes.")
                
                # Create visualization
                annotated_frame = self._create_visualization(frame, detection_results, incidents)
                
                # Display
                if self.config['display_window']:
                    window_name = f"Camera {camera_id} - Enhanced Incident Detection"
                    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
                    cv2.imshow(window_name, annotated_frame)
                
                # Store previous frame for optical flow
                self.previous_frame = frame.copy()
                
                # Handle keyboard input with improved timing
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print(f"🛑 Quit requested for camera {camera_id}")
                    # Give a moment for any ongoing video writing to complete
                    time.sleep(1)
                    break
                elif key == ord('s'):
                    self._save_frame(annotated_frame, frame_count, manual=True)
                elif key == ord('r'):
                    self._reset_analytics()
                elif key == ord('f'):
                    # Toggle fullscreen
                    window_name = f"Camera {camera_id} - Enhanced Incident Detection"
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
                        window_name = f"Camera {camera_id} - Enhanced Incident Detection"
                        is_fullscreen = False
                        cv2.setWindowProperty(window_name, 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                        print("🪟 Exited fullscreen mode")
                
        except KeyboardInterrupt:
            print(f"\n⏹️ Detection stopped for camera {camera_id}")
        finally:
            print(f"🧹 Cleaning up camera {camera_id}...")
            self._cleanup()
    
    def _detect_objects(self, frame):
        """Perform YOLO object detection."""
        start_time = time.time()
        
        if self.model is None:
            return {'detections': [], 'total_count': 0, 'class_counts': {}, 'fps': 0}
        
        try:
            if self.model_type == 'yolov8':
                results = self.model(frame, conf=self.config['confidence_threshold'], verbose=False)
                detections = self._process_yolov8_results(results[0])
            else:
                results = self.model(frame)
                detections = self._process_yolov5_results(results)
            
            processing_time = time.time() - start_time
            class_counts = defaultdict(int)
            for detection in detections:
                class_counts[detection['class']] += 1
            
            return {
                'detections': detections,
                'total_count': len(detections),
                'class_counts': dict(class_counts),
                'fps': 1.0 / processing_time if processing_time > 0 else 0
            }
        except Exception as e:
            print(f"Detection error: {e}")
            return {'detections': [], 'total_count': 0, 'class_counts': {}, 'fps': 0}
    
    def _process_yolov8_results(self, results):
        """Process YOLOv8 detection results."""
        detections = []
        if results.boxes is not None:
            boxes = results.boxes.xyxy.cpu().numpy()
            confidences = results.boxes.conf.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy()
            
            for box, conf, cls in zip(boxes, confidences, classes):
                class_name = results.names[int(cls)]
                if class_name in self.target_classes:
                    x1, y1, x2, y2 = map(int, box)
                    detections.append({
                        'bbox': [x1, y1, x2 - x1, y2 - y1],
                        'confidence': float(conf),
                        'class': class_name,
                        'center': [(x1 + x2) // 2, (y1 + y2) // 2],
                        'area': (x2 - x1) * (y2 - y1)
                    })
        return detections
    
    def _update_vehicle_tracking(self, detections):
        """Update vehicle tracking with enhanced history for physics analysis."""
        current_frame = self.analytics['total_frames']
        vehicles = [d for d in detections if d['class'] in ['car', 'truck', 'bus', 'motorcycle']]
        
        # Match with existing tracks
        matched_ids = []
        for vehicle in vehicles:
            if vehicle['confidence'] < self.config['min_tracking_confidence']:
                continue
            
            best_match = self._find_best_match(vehicle, current_frame)
            if best_match:
                self._update_track(best_match, vehicle, current_frame)
                matched_ids.append(best_match)
            else:
                new_id = self._create_new_track(vehicle, current_frame)
                matched_ids.append(new_id)
        
        # Calculate velocities and physics data
        self._calculate_velocities_and_physics(matched_ids)
        
        return {'active_tracks': matched_ids}
    
    def _detect_incidents_multilayer(self, frame, detection_results, tracking_results):
        """ENHANCED Multi-Layer Incident Detection Pipeline with Traffic Awareness."""
        incidents = []
        current_frame = self.analytics['total_frames']
        
        # 1. ENHANCED LAYER 1: Traffic-Aware Trajectory Collision Detection
        trajectory_collisions = self._enhanced_traffic_aware_collision_detection(tracking_results['active_tracks'])
        self.analytics['collision_layers']['trajectory_detected'] += len(trajectory_collisions)
        
        # 2. LAYER 2: Depth Analysis Validation (if enabled)
        if self.config['depth_analysis_enabled'] and trajectory_collisions:
            depth_validated = self._validate_collisions_with_depth(frame, trajectory_collisions, detection_results['detections'])
            self.analytics['collision_layers']['depth_confirmed'] += len(depth_validated)
        else:
            depth_validated = trajectory_collisions
        
        # 3. LAYER 3: Optical Flow Validation (if enabled)
        if self.config['optical_flow_enabled'] and depth_validated and self.previous_frame is not None:
            flow_validated = self._validate_collisions_with_optical_flow(frame, self.previous_frame, depth_validated)
            self.analytics['collision_layers']['flow_confirmed'] += len(flow_validated)
        else:
            flow_validated = depth_validated
        
        # 4. LAYER 4: Enhanced Physics Validation
        if self.config['physics_validation_enabled'] and flow_validated:
            physics_validated = self._validate_collisions_with_physics(flow_validated)
            self.analytics['collision_layers']['physics_confirmed'] += len(physics_validated)
        else:
            physics_validated = flow_validated
        
        # 5. ENHANCED FINAL VALIDATION: Evidence Persistence + Smart Filtering
        final_collisions = self._persistent_collision_validation(physics_validated)
        self.analytics['collision_layers']['final_confirmed'] += len(final_collisions)
        
        incidents.extend(final_collisions)
        
        # 6. Other incident types (simplified - no debris detection)
        stopped_incidents = self._detect_stopped_vehicles(current_frame)
        incidents.extend(stopped_incidents)
        
        pedestrian_incidents = self._detect_pedestrians_on_road(detection_results['detections'])
        incidents.extend(pedestrian_incidents)
        
        speed_incidents = self._detect_speed_anomalies()
        incidents.extend(speed_incidents)
        
        return incidents
    
# ADDITIONAL FALSE POSITIVE ELIMINATORS
# Add these methods to your enhanced system for even better precision

    def _enhanced_traffic_aware_collision_detection(self, active_tracks):
        """
        BALANCED VERSION - Catches real incidents while filtering false positives
        """
        potential_collisions = []
        
        # BALANCED traffic state assessment - less aggressive thresholds
        vehicle_count = len(active_tracks)
        if vehicle_count <= 2:
            traffic_state = 'sparse'
            distance_threshold = 50
            speed_threshold = 3.0        # Reduced from 4.0
            confidence_threshold = 0.3   # Reduced from 0.4
            parallel_filter_strict = False
        elif vehicle_count <= 6:
            traffic_state = 'moderate' 
            distance_threshold = 40
            speed_threshold = 5.0        # Reduced from 6.0
            confidence_threshold = 0.5   # Reduced from 0.65
            parallel_filter_strict = True
        elif vehicle_count <= 12:
            traffic_state = 'heavy'
            distance_threshold = 30      # Increased from 25
            speed_threshold = 7.0        # Reduced from 10.0
            confidence_threshold = 0.7   # Reduced from 0.85
            parallel_filter_strict = True
        else:
            traffic_state = 'congested'
            distance_threshold = 25      # Increased from 20
            speed_threshold = 10.0       # Reduced from 15.0
            confidence_threshold = 0.8   # Reduced from 0.95
            parallel_filter_strict = True
        
        print(f"   🚦 Traffic State: {traffic_state}, Vehicles: {vehicle_count}")
        
        # Pre-filter vehicle pairs using enhanced lane analysis
        viable_pairs = self._get_viable_collision_pairs(active_tracks, parallel_filter_strict)
        
        for track1_id, track2_id in viable_pairs:
            track1 = self.tracked_vehicles.get(track1_id)
            track2 = self.tracked_vehicles.get(track2_id)
            
            if not self._balanced_collision_candidate_check(track1, track2, speed_threshold, traffic_state):
                continue
            
            # Enhanced collision prediction with balanced validation
            collision_data = self._balanced_collision_prediction(
                track1, track2, distance_threshold, traffic_state)
            
            if collision_data and collision_data['confidence'] >= confidence_threshold:
                potential_collisions.append({
                    'track1_id': track1_id,
                    'track2_id': track2_id, 
                    'track1': track1,
                    'track2': track2,
                    'collision_data': collision_data,
                    'validation_layers': {'trajectory': True},
                    'traffic_state': traffic_state
                })
        
        return potential_collisions
    
    def _is_following_pattern(self, track1, track2):
        """
        Detect if vehicles are in a following pattern (major cause of false positives)
        FIXED: Added proper velocity null checks
        """
        # Add null checks first
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return False
        
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # Check if vehicles are roughly aligned (one behind the other)
        relative_pos = pos2 - pos1
        
        # If one vehicle's velocity aligns with the relative position vector,
        # they might be following each other
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(relative_pos) > 0:
            vel1_norm = vel1 / np.linalg.norm(vel1)
            rel_pos_norm = relative_pos / np.linalg.norm(relative_pos)
            
            # Check alignment
            alignment = np.dot(vel1_norm, rel_pos_norm)
            
            # If vehicle 1 is moving toward vehicle 2's current position (following)
            if alignment > 0.7:  # Strong alignment
                # Check if speeds are similar (following traffic)
                speed_diff = abs(np.linalg.norm(vel1) - np.linalg.norm(vel2))
                if speed_diff < 3.0:  # Similar speeds
                    return True
        
        return False
    def _same_lane_following(self, track1, track2):
        """
        Detect vehicles following in the same lane
        """
        # Add null checks first
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return False
        
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # Check if vehicles are vertically aligned (same lane in typical highway view)
        horizontal_diff = abs(pos1[0] - pos2[0])
        vertical_diff = abs(pos1[1] - pos2[1])
        
        # If horizontally close but vertically separated = same lane following
        if horizontal_diff < 80 and vertical_diff > 40:  # Adjust based on your camera angle
            # Check if both moving in similar direction
            if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
                vel_similarity = np.dot(vel1, vel2) / (np.linalg.norm(vel1) * np.linalg.norm(vel2))
                if vel_similarity > 0.8:  # Very similar directions
                    return True
        
        return False
    
    #balanced version 
    def _balanced_collision_candidate_check(self, track1, track2, speed_threshold, traffic_state):
        """
        BALANCED candidate filtering - less aggressive than ultra-strict version
        """
        if not track1 or not track2:
            return False
        
        # Enhanced null checks
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return False
        
        # BALANCED speed check - allow one vehicle to be slower
        speed1 = track1.get('speed', 0)
        speed2 = track2.get('speed', 0)
        
        # At least ONE vehicle must meet speed threshold (not both)
        if speed1 < speed_threshold and speed2 < speed_threshold:
            return False
        
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # BALANCED parallel traffic filtering - less strict
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            # Calculate angle between velocity vectors
            dot_product = np.dot(vel1, vel2)
            magnitudes = np.linalg.norm(vel1) * np.linalg.norm(vel2)
            
            if magnitudes > 0:
                cos_angle = np.clip(dot_product / magnitudes, -1, 1)
                angle = math.degrees(math.acos(cos_angle))
                
                # Less strict filtering for parallel traffic
                if angle < 30:  # Reduced from 45 degrees
                    relative_speed = np.linalg.norm(vel2 - vel1)
                    
                    # BALANCED relative speed thresholds - less aggressive
                    if traffic_state == 'congested':
                        if relative_speed < 5.0:  # Reduced from 8.0
                            return False
                    elif traffic_state == 'heavy':
                        if relative_speed < 4.0:  # Reduced from 6.0
                            return False
                    else:
                        if relative_speed < 3.0:  # Reduced from 4.0
                            return False
        
        # Enhanced distance check - more generous
        distance = np.linalg.norm(pos2 - pos1)
        max_distance = {
            'sparse': 250,     # Increased from 200
            'moderate': 200,   # Increased from 150
            'heavy': 150,      # Increased from 100
            'congested': 120   # Increased from 80
        }
        
        if distance > max_distance.get(traffic_state, 200):
            return False
        
        # BALANCED approach check - less strict
        relative_pos = pos2 - pos1
        relative_vel = vel2 - vel1
        approach_rate = np.dot(relative_pos, relative_vel)
        
        # More lenient approach thresholds
        approach_thresholds = {
            'sparse': -0.5,    # More lenient
            'moderate': -1.0,  # More lenient
            'heavy': -2.0,     # More lenient
            'congested': -3.0  # More lenient
        }
        
        return approach_rate < approach_thresholds.get(traffic_state, -1.0)

    def _balanced_collision_prediction(self, track1, track2, distance_threshold, traffic_state):
        """
        Balanced collision prediction - catches real incidents
        """
        # Enhanced null checks
        if not track1.get('velocity') or not track2.get('velocity'):
            return None
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return None
        
        pos1 = np.array(track1['center'], dtype=float)
        pos2 = np.array(track2['center'], dtype=float)
        vel1 = np.array(track1['velocity'], dtype=float)  
        vel2 = np.array(track2['velocity'], dtype=float)
        
        # BALANCED horizons - longer for better detection
        horizon_map = {'sparse': 20, 'moderate': 18, 'heavy': 15, 'congested': 12}
        horizon = horizon_map[traffic_state]
        
        min_distance = float('inf')
        collision_time = None
        collision_point = None
        trajectory_convergence = False
        
        # Track if trajectories are converging - less strict requirement
        convergence_count = 0
        
        for t in range(1, horizon + 1):
            future_pos1 = pos1 + vel1 * t
            future_pos2 = pos2 + vel2 * t
            distance = np.linalg.norm(future_pos2 - future_pos1)
            
            # Check if distance is decreasing (convergence)
            if t > 1 and distance < min_distance:
                convergence_count += 1
            
            min_distance = min(min_distance, distance)
            
            if distance < distance_threshold:
                collision_time = t
                collision_point = (future_pos1 + future_pos2) / 2
                trajectory_convergence = convergence_count >= 2  # Reduced from 3
                break
        
        if collision_time and trajectory_convergence:
            # BALANCED confidence calculation
            confidence = self._balanced_confidence_calculation(
                track1, track2, min_distance, collision_time, traffic_state)
            
            # Lower base confidence threshold
            if confidence > 0.2:  # Reduced from 0.4
                return {
                    'ttc': collision_time / 30,
                    'collision_point': collision_point.tolist(),
                    'min_distance': min_distance,
                    'confidence': confidence,
                    'traffic_context': traffic_state,
                    'trajectory_convergence': trajectory_convergence
                }
        
        return None

    def _balanced_confidence_calculation(self, track1, track2, distance, time_steps, traffic_state):
        """
        Balanced confidence calculation - not too strict
        """
        confidence = 0.0
        
        # Distance factor - more generous
        distance_score = max(0, 1.0 - (distance / 40.0))  # Increased from 30.0
        confidence += distance_score * 0.3
        
        # Enhanced null checks for velocity
        if not track1.get('velocity') or not track2.get('velocity'):
            return 0.0
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return 0.0
        
        # Speed differential - more lenient
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        relative_speed = np.linalg.norm(vel2 - vel1)
        speed_score = min(1.0, relative_speed / 10.0)  # Reduced from 15.0
        confidence += speed_score * 0.25
        
        # Time urgency - more generous
        time_score = max(0, 1.0 - (time_steps / 15.0))  # Increased from 10.0
        confidence += time_score * 0.2
        
        # BALANCED physics anomaly check - don't require both vehicles
        physics_score = 0.0
        anomaly_count = 0
        
        for track in [track1, track2]:
            if track['id'] in self.acceleration_history:
                recent_accel = self.acceleration_history[track['id']][-3:]
                if recent_accel and max(recent_accel) > 8.0:  # Reduced from 10.0
                    anomaly_count += 1
        
        if anomaly_count >= 1:  # Only require ONE vehicle (not both)
            physics_score = 0.3 if anomaly_count == 1 else 0.4
        
        confidence += physics_score
        
        # Trajectory angle - more generous scoring
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            cos_angle = np.dot(vel1, vel2) / (np.linalg.norm(vel1) * np.linalg.norm(vel2))
            angle = math.degrees(math.acos(np.clip(cos_angle, -1, 1)))
            
            # More generous angle requirements
            if 60 <= angle <= 120:  # T-bone (wider range)
                confidence += 0.15
            elif angle > 120:  # Head-on
                confidence += 0.2
            # No penalty for other angles
        
        # REDUCED traffic state penalties
        traffic_penalties = {
            'sparse': 0.0,
            'moderate': 0.05,  # Reduced from 0.1
            'heavy': 0.15,     # Reduced from 0.25
            'congested': 0.2   # Reduced from 0.35
        }
        confidence -= traffic_penalties.get(traffic_state, 0)
        
        return max(0.0, min(1.0, confidence))
     
    
    
    #ultra strict version of the code 
    def _ultra_strict_collision_candidate_check(self, track1, track2, speed_threshold, traffic_state):
        """
        ULTRA STRICT candidate filtering
        FIXED: Added proper velocity null checks
        """
        if not track1 or not track2:
            return False
        
        # Enhanced null checks
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return False
        
        # Enhanced speed check with traffic-aware thresholds
        speed1 = track1.get('speed', 0)
        speed2 = track2.get('speed', 0)
        
        # Both vehicles must have significant speed
        if speed1 < speed_threshold or speed2 < speed_threshold:
            return False
        
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # ULTRA STRICT parallel traffic filtering
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            # Calculate angle between velocity vectors
            dot_product = np.dot(vel1, vel2)
            magnitudes = np.linalg.norm(vel1) * np.linalg.norm(vel2)
            
            if magnitudes > 0:
                cos_angle = np.clip(dot_product / magnitudes, -1, 1)
                angle = math.degrees(math.acos(cos_angle))
                
                # Much stricter filtering for parallel traffic
                if angle < 45:  # Vehicles moving in similar direction
                    relative_speed = np.linalg.norm(vel2 - vel1)
                    
                    # Traffic-state aware relative speed thresholds
                    if traffic_state == 'congested':
                        if relative_speed < 8.0:  # Very strict for congested traffic
                            return False
                    elif traffic_state == 'heavy':
                        if relative_speed < 6.0:  # Strict for heavy traffic
                            return False
                    else:
                        if relative_speed < 4.0:  # Moderate for lighter traffic
                            return False
        
        # Enhanced distance check
        distance = np.linalg.norm(pos2 - pos1)
        max_distance = {
            'sparse': 200,
            'moderate': 150,
            'heavy': 100,
            'congested': 80
        }
        
        if distance > max_distance.get(traffic_state, 150):
            return False
        
        # ENHANCED approach check - must be strongly approaching
        relative_pos = pos2 - pos1
        relative_vel = vel2 - vel1
        approach_rate = np.dot(relative_pos, relative_vel)
        
        # Traffic-aware approach thresholds
        approach_thresholds = {
            'sparse': -1.0,
            'moderate': -2.0,
            'heavy': -4.0,
            'congested': -6.0
        }
        
        return approach_rate < approach_thresholds.get(traffic_state, -2.0)

    def _ultra_conservative_collision_prediction(self, track1, track2, distance_threshold, traffic_state):
        """
        Ultra conservative collision prediction with enhanced filtering
        FIXED: Added proper velocity null checks
        """
        # Enhanced null checks
        if not track1.get('velocity') or not track2.get('velocity'):
            return None
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return None
        
        pos1 = np.array(track1['center'], dtype=float)
        pos2 = np.array(track2['center'], dtype=float)
        vel1 = np.array(track1['velocity'], dtype=float)  
        vel2 = np.array(track2['velocity'], dtype=float)
        
        # Shorter horizons for stricter validation
        horizon_map = {'sparse': 15, 'moderate': 12, 'heavy': 8, 'congested': 6}
        horizon = horizon_map[traffic_state]
        
        min_distance = float('inf')
        collision_time = None
        collision_point = None
        trajectory_convergence = False
        
        # Track if trajectories are actually converging
        convergence_count = 0
        
        for t in range(1, horizon + 1):
            future_pos1 = pos1 + vel1 * t
            future_pos2 = pos2 + vel2 * t
            distance = np.linalg.norm(future_pos2 - future_pos1)
            
            # Check if distance is decreasing (convergence)
            if t > 1 and distance < min_distance:
                convergence_count += 1
            
            min_distance = min(min_distance, distance)
            
            if distance < distance_threshold:
                collision_time = t
                collision_point = (future_pos1 + future_pos2) / 2
                trajectory_convergence = convergence_count >= 3  # Require sustained convergence
                break
        
        if collision_time and trajectory_convergence:
            # Enhanced confidence calculation with stricter criteria
            confidence = self._ultra_strict_confidence_calculation(
                track1, track2, min_distance, collision_time, traffic_state)
            
            # Higher base confidence threshold
            if confidence > 0.4:
                return {
                    'ttc': collision_time / 30,
                    'collision_point': collision_point.tolist(),
                    'min_distance': min_distance,
                    'confidence': confidence,
                    'traffic_context': traffic_state,
                    'trajectory_convergence': trajectory_convergence
                }
        
        return None

    def _ultra_strict_confidence_calculation(self, track1, track2, distance, time_steps, traffic_state):
        """
        Ultra strict confidence calculation with enhanced penalties
        FIXED: Added proper velocity null checks
        """
        confidence = 0.0
        
        # Distance factor (much stricter)
        distance_score = max(0, 1.0 - (distance / 30.0))  # Stricter than before
        confidence += distance_score * 0.25
        
        # Enhanced null checks for velocity
        if not track1.get('velocity') or not track2.get('velocity'):
            return 0.0
        
        if track1['velocity'] is None or track2['velocity'] is None:
            return 0.0
        
        # Speed differential (require higher relative speed)
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        relative_speed = np.linalg.norm(vel2 - vel1)
        speed_score = min(1.0, relative_speed / 15.0)  # Higher threshold
        confidence += speed_score * 0.25
        
        # Time urgency (shorter time required)
        time_score = max(0, 1.0 - (time_steps / 10.0))  # Stricter timing
        confidence += time_score * 0.2
        
        # ENHANCED physics anomaly check (require stronger evidence)
        physics_score = 0.0
        anomaly_count = 0
        
        for track in [track1, track2]:
            if track['id'] in self.acceleration_history:
                recent_accel = self.acceleration_history[track['id']][-3:]
                if recent_accel and max(recent_accel) > 10.0:  # Higher threshold
                    anomaly_count += 1
        
        if anomaly_count >= 2:  # Require both vehicles to show anomalies
            physics_score = 0.5
        elif anomaly_count == 1:
            physics_score = 0.2
        
        confidence += physics_score
        
        # Trajectory angle (much stricter requirements)
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            cos_angle = np.dot(vel1, vel2) / (np.linalg.norm(vel1) * np.linalg.norm(vel2))
            angle = math.degrees(math.acos(np.clip(cos_angle, -1, 1)))
            
            # Only give credit for clear perpendicular/head-on collisions
            if 70 <= angle <= 110:  # T-bone (stricter range)
                confidence += 0.2
            elif angle > 130:  # Head-on (stricter range)
                confidence += 0.25
            else:
                confidence -= 0.1  # Penalty for unclear angles
        
        # ENHANCED traffic state penalties
        traffic_penalties = {
            'sparse': 0.0,
            'moderate': 0.1,
            'heavy': 0.25,     # Increased penalty
            'congested': 0.35  # Much higher penalty
        }
        confidence -= traffic_penalties.get(traffic_state, 0)
        
        return max(0.0, min(1.0, confidence))

    def _get_viable_collision_pairs(self, active_tracks, strict_filtering):
        """
        Pre-filter vehicle pairs to eliminate obvious non-collision scenarios
        FIXED: Added better error handling
        """
        viable_pairs = []
        
        for i, track1_id in enumerate(active_tracks):
            for track2_id in active_tracks[i+1:]:
                track1 = self.tracked_vehicles.get(track1_id)
                track2 = self.tracked_vehicles.get(track2_id)
                
                if not track1 or not track2:
                    continue
                
                try:
                    # Skip if vehicles are in obvious following pattern
                    if self._is_following_pattern(track1, track2):
                        continue
                    
                    # Skip if vehicles are in same lane (highway following)
                    if strict_filtering and self._same_lane_following(track1, track2):
                        continue
                    
                    # Skip if vehicles have been maintaining consistent distance
                    if self._maintaining_consistent_distance(track1_id, track2_id):
                        continue
                    
                    viable_pairs.append((track1_id, track2_id))
                    
                except Exception as e:
                    # Log the error but continue processing other pairs
                    print(f"   ⚠️ Error processing pair V{track1_id}-V{track2_id}: {e}")
                    continue
        
        return viable_pairs

        
    def _maintaining_consistent_distance(self, track1_id, track2_id):
        """
        Check if two vehicles have been maintaining consistent distance (not colliding)
        """
        if track1_id not in self.vehicle_history or track2_id not in self.vehicle_history:
            return False
        
        hist1 = self.vehicle_history[track1_id]
        hist2 = self.vehicle_history[track2_id]
        
        if len(hist1) < 5 or len(hist2) < 5:
            return False
        
        # Calculate distances over last 5 frames
        recent_distances = []
        for i in range(-5, 0):
            if i < -len(hist1) or i < -len(hist2):
                continue
            pos1 = np.array(hist1[i])
            pos2 = np.array(hist2[i])
            distance = np.linalg.norm(pos2 - pos1)
            recent_distances.append(distance)
        
        if len(recent_distances) < 3:
            return False
        
        # Check if distance variance is low (consistent following distance)
        distance_variance = np.var(recent_distances)
        if distance_variance < 100:  # Low variance = consistent distance
            return True
        
        return False


  # INTEGRATION INSTRUCTIONS:

    def _smart_collision_candidate_check(self, track1, track2, speed_threshold):
        """
        Enhanced candidate filtering that reduces false positives
        """
        if not track1 or not track2:
            return False
        
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        # Speed check with dynamic threshold
        speed1 = track1.get('speed', 0)
        speed2 = track2.get('speed', 0)
        
        if speed1 < speed_threshold and speed2 < speed_threshold:
            return False
        
        # Smart approach detection - filter out parallel traffic
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # Check if vehicles are moving in similar directions (parallel traffic)
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            # Calculate angle between velocity vectors
            dot_product = np.dot(vel1, vel2)
            magnitudes = np.linalg.norm(vel1) * np.linalg.norm(vel2)
            
            if magnitudes > 0:
                cos_angle = np.clip(dot_product / magnitudes, -1, 1)
                angle = math.degrees(math.acos(cos_angle))
                
                # If vehicles moving in same direction (< 30 degrees), check relative speed
                if angle < 30:
                    relative_speed = np.linalg.norm(vel2 - vel1)
                    # Parallel traffic typically has low relative speed
                    if relative_speed < 5.0:
                        return False
        
        # Distance check
        distance = np.linalg.norm(pos2 - pos1)
        if distance > 200:  # Too far apart
            return False
        
        # Enhanced approach check
        relative_pos = pos2 - pos1
        relative_vel = vel2 - vel1
        approach_rate = np.dot(relative_pos, relative_vel)
        
        return approach_rate < -1.5  # Must be approaching

    def _traffic_aware_collision_prediction(self, track1, track2, distance_threshold, traffic_state):
        """
        Enhanced collision prediction with evidence scoring
        """
        pos1 = np.array(track1['center'], dtype=float)
        pos2 = np.array(track2['center'], dtype=float)
        vel1 = np.array(track1['velocity'], dtype=float)  
        vel2 = np.array(track2['velocity'], dtype=float)
        
        # Adaptive horizon based on traffic
        horizon_map = {'sparse': 20, 'moderate': 15, 'heavy': 10, 'congested': 8}
        horizon = horizon_map[traffic_state]
        
        min_distance = float('inf')
        collision_time = None
        collision_point = None
        
        for t in range(1, horizon + 1):
            future_pos1 = pos1 + vel1 * t
            future_pos2 = pos2 + vel2 * t
            distance = np.linalg.norm(future_pos2 - future_pos1)
            
            if distance < min_distance:
                min_distance = distance
            
            if distance < distance_threshold:
                collision_time = t
                collision_point = (future_pos1 + future_pos2) / 2
                break
        
        if collision_time:
            # Calculate confidence score
            confidence = self._calculate_enhanced_confidence(
                track1, track2, min_distance, collision_time, traffic_state)
            
            if confidence > 0.3:  # Base threshold
                return {
                    'ttc': collision_time / 30,
                    'collision_point': collision_point.tolist(),
                    'min_distance': min_distance,
                    'confidence': confidence,
                    'traffic_context': traffic_state
                }
        
        return None

    def _calculate_enhanced_confidence(self, track1, track2, distance, time_steps, traffic_state):
        """
        Smart confidence calculation that considers multiple factors
        """
        confidence = 0.0
        
        # Distance factor (closer = higher confidence)
        distance_score = max(0, 1.0 - (distance / 50.0))
        confidence += distance_score * 0.3
        
        # Speed differential (higher relative speed = more confident)
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        relative_speed = np.linalg.norm(vel2 - vel1)
        speed_score = min(1.0, relative_speed / 12.0)
        confidence += speed_score * 0.25
        
        # Time urgency (shorter time = higher confidence)
        time_score = max(0, 1.0 - (time_steps / 15.0))
        confidence += time_score * 0.2
        
        # Physics anomaly check (sudden deceleration/direction change)
        physics_score = 0.0
        for track in [track1, track2]:
            if track['id'] in self.acceleration_history:
                recent_accel = self.acceleration_history[track['id']][-3:]
                if recent_accel and max(recent_accel) > 8.0:
                    physics_score = 0.4
                    break
        confidence += physics_score
        
        # Trajectory angle (perpendicular = higher confidence)
        if np.linalg.norm(vel1) > 0 and np.linalg.norm(vel2) > 0:
            cos_angle = np.dot(vel1, vel2) / (np.linalg.norm(vel1) * np.linalg.norm(vel2))
            angle = math.degrees(math.acos(np.clip(cos_angle, -1, 1)))
            # T-bone collisions (60-120 degrees) are more confident
            if 60 <= angle <= 120:
                confidence += 0.15
            elif angle > 120:  # Head-on
                confidence += 0.2
        
        # Traffic state penalty (reduce confidence in heavy traffic)
        traffic_penalties = {'sparse': 0.0, 'moderate': 0.05, 'heavy': 0.15, 'congested': 0.25}
        confidence -= traffic_penalties.get(traffic_state, 0)
        
        return max(0.0, min(1.0, confidence))

    def _persistent_collision_validation(self, potential_collisions):
        """
        EVENT-BASED collision validation - detects collision events immediately
        rather than requiring persistence. Real collisions are momentary events.
        """
        final_collisions = []
        current_frame = self.analytics['total_frames']
        
        for collision in potential_collisions:
            track1_id = collision['track1_id']
            track2_id = collision['track2_id']
            key = tuple(sorted([track1_id, track2_id]))
            
            confidence = collision['collision_data']['confidence']
            
            # Check if this collision pair was recently processed to prevent duplicates
            if key in self.collision_evidence_buffer:
                buffer = self.collision_evidence_buffer[key]
                # Skip if recently processed (within last 5 frames)
                if current_frame - buffer.get('last_detection_frame', 0) < 5:
                    continue
            
            # Count validation layers that passed
            validation_layers = collision.get('validation_layers', {})
            layers_passed = sum([
                validation_layers.get('trajectory', True),  # Always true if we got here
                validation_layers.get('depth', True),
                validation_layers.get('optical_flow', True), 
                validation_layers.get('physics', True)
            ])
            
            # Adaptive confidence threshold based on camera type and layers passed
            camera_id = self.camera_config.get('camera_id', '')
            base_threshold = self.config['collision_confidence_threshold']
            
            # Layer agreement bonus - more layers passed = lower threshold needed
            layer_bonus = (layers_passed - self.config['minimum_layer_agreement']) * 0.05
            effective_threshold = max(0.25, base_threshold - layer_bonus)
            
            # Immediate event detection - no persistence required
            validation_passed = (
                confidence >= effective_threshold and
                layers_passed >= self.config['minimum_layer_agreement']
            )
            
            if validation_passed:
                # Create collision incident immediately
                final_incident = self._create_enhanced_final_collision_incident(
                    collision, confidence, confidence)
                
                # Add event-based validation metrics
                final_incident['event_validation'] = {
                    'detection_method': 'immediate_event',
                    'layers_passed': layers_passed,
                    'effective_threshold': effective_threshold,
                    'confidence_margin': confidence - effective_threshold,
                    'camera_adaptive': True
                }
                
                final_collisions.append(final_incident)
                
                # Mark this pair as recently detected to prevent immediate duplicates
                self.collision_evidence_buffer[key] = {
                    'last_detection_frame': current_frame,
                    'confidence': confidence
                }
                
                print(f"🎯 Collision detected! Confidence: {confidence:.3f}, Threshold: {effective_threshold:.3f}, Layers: {layers_passed}/4")
        
        # Clean up old tracking data (prevent memory buildup)
        to_remove = []
        for key, buffer in self.collision_evidence_buffer.items():
            if current_frame - buffer.get('last_detection_frame', 0) > 30:
                to_remove.append(key)
        
        for key in to_remove:
            del self.collision_evidence_buffer[key]
        
        return final_collisions

    def _create_enhanced_final_collision_incident(self, collision, sustained_confidence, peak_confidence):
        """
        Create final incident with enhanced confidence metrics
        """
        track1 = collision['track1']
        track2 = collision['track2']
        collision_data = collision['collision_data']
        
        return {
            'type': 'collision',
            'severity': self._determine_enhanced_severity(sustained_confidence, peak_confidence),
            'time_to_collision': collision_data['ttc'],
            'vehicles': [track1['class'], track2['class']],
            'vehicle_ids': [track1['id'], track2['id']],
            'positions': [track1['center'], track2['center']],
            'predicted_point': collision_data['collision_point'],
            'confidence': sustained_confidence,
            'peak_confidence': peak_confidence,
            'validation_layers': collision['validation_layers'],
            'traffic_context': collision['traffic_state'],
            'timestamp': datetime.now().isoformat()
        }
    
    def _determine_enhanced_severity(self, sustained_confidence, peak_confidence):
        """Determine severity based on sustained and peak confidence."""
        if sustained_confidence >= 0.85 and peak_confidence >= 0.95:
            return 'CRITICAL'
        elif sustained_confidence >= 0.75 and peak_confidence >= 0.85:
            return 'HIGH'
        elif sustained_confidence >= 0.65 and peak_confidence >= 0.75:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _update_traffic_density(self, detections):
        """Monitor traffic density and adjust sensitivity accordingly."""
        # Count vehicles only (exclude pedestrians)
        vehicle_count = len([d for d in detections if d['class'] in ['car', 'truck', 'bus', 'motorcycle']])
        
        # Store in history
        self.traffic_density_history.append(vehicle_count)
        
        # Calculate average density over recent frames
        if len(self.traffic_density_history) >= 10:
            avg_density = sum(self.traffic_density_history) / len(self.traffic_density_history)
            
            # Determine density level and adjust thresholds
            previous_level = self.current_density_level
            
            if avg_density >= 20:
                self.current_density_level = 'very_high'
            elif avg_density >= 12:
                self.current_density_level = 'high'
            elif avg_density >= 6:
                self.current_density_level = 'normal'
            else:
                self.current_density_level = 'low'
            
            # Log density changes
            if previous_level != self.current_density_level:
                print(f"   🚦 Traffic density changed: {previous_level} → {self.current_density_level} (avg: {avg_density:.1f} vehicles)")
    
    def _validate_collisions_with_depth(self, frame, potential_collisions, all_detections):
        """LAYER 2: Validate collisions using depth estimation from intensity/shadows."""
        validated_collisions = []
        
        if not potential_collisions:
            return validated_collisions
        
        # Get depth estimates for all detections
        depth_estimates = self._estimate_depth_from_intensity(frame, all_detections)
        
        for collision in potential_collisions:
            track1 = collision['track1']
            track2 = collision['track2']
            
            # Find corresponding depth estimates
            depth1 = self._find_depth_for_vehicle(track1, all_detections, depth_estimates)
            depth2 = self._find_depth_for_vehicle(track2, all_detections, depth_estimates)
            
            if depth1 is not None and depth2 is not None:
                # Check if vehicles are at significantly different depths
                depth_diff = abs(depth1['depth_score'] - depth2['depth_score'])
                
                # Vehicles should be at similar depths for actual collision
                if depth_diff < self.config['depth_difference_threshold']:
                    collision['validation_layers']['depth'] = True
                    collision['depth_analysis'] = {
                        'depth_difference': depth_diff,
                        'vehicle1_depth': depth1['depth_score'],
                        'vehicle2_depth': depth2['depth_score'],
                        'shadow_indicators': [depth1['shadow_indicator'], depth2['shadow_indicator']]
                    }
                    validated_collisions.append(collision)
            else:
                # If we can't get depth data, pass it through (but mark as unvalidated)
                collision['validation_layers']['depth'] = False
                validated_collisions.append(collision)
        
        return validated_collisions
    
    def _estimate_depth_from_intensity(self, frame, detections):
        """Estimate relative depth using intensity and shadow analysis."""
        depth_estimates = {}
        
        for i, detection in enumerate(detections):
            x, y, w, h = detection['bbox']
            
            # Ensure we don't go out of bounds
            y_end = min(y + h, frame.shape[0])
            x_end = min(x + w, frame.shape[1])
            
            if y >= y_end or x >= x_end:
                continue
                
            roi = frame[y:y_end, x:x_end]
            
            if roi.size == 0:
                continue
            
            # Convert to grayscale if needed
            if len(roi.shape) == 3:
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            else:
                gray_roi = roi
            
            # Analyze intensity patterns
            mean_intensity = np.mean(gray_roi)
            
            # Check bottom portion for shadows
            bottom_start = max(0, int(h * 0.8))
            if bottom_start < gray_roi.shape[0]:
                bottom_intensity = np.mean(gray_roi[bottom_start:, :])
            else:
                bottom_intensity = mean_intensity
            
            # Objects closer to camera typically:
            # - Have higher contrast
            # - Cast shadows below them  
            # - Appear larger relative to distance
            
            relative_depth = (mean_intensity / 255.0) * (detection['area'] / max(w * h, 1))
            depth_estimates[i] = {
                'depth_score': relative_depth,
                'mean_intensity': mean_intensity,
                'shadow_indicator': bottom_intensity < mean_intensity * self.config['shadow_detection_threshold']
            }
        
        return depth_estimates
    
    def _validate_collisions_with_optical_flow(self, current_frame, previous_frame, potential_collisions):
        """LAYER 3: Validate collisions using optical flow analysis."""
        validated_collisions = []
        
        if not potential_collisions:
            return validated_collisions
        
        # Calculate optical flow for vehicle centers
        prev_gray = cv2.cvtColor(previous_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        
        for collision in potential_collisions:
            track1 = collision['track1']
            track2 = collision['track2']
            
            # Get previous positions (if available)
            if (track1['id'] in self.flow_points and track2['id'] in self.flow_points and
                len(self.flow_points[track1['id']]) > 0 and len(self.flow_points[track2['id']]) > 0):
                
                try:
                    # Calculate flow for both vehicles
                    prev_points1 = np.array([[self.flow_points[track1['id']][-1]]], dtype=np.float32)
                    prev_points2 = np.array([[self.flow_points[track2['id']][-1]]], dtype=np.float32)
                    
                    # Calculate optical flow
                    flow1, status1, error1 = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray, prev_points1, None)
                    flow2, status2, error2 = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray, prev_points2, None)
                    
                    if status1[0] and status2[0]:  # Both flows successful
                        # Calculate flow magnitudes
                        flow_vector1 = flow1[0][0] - prev_points1[0][0]
                        flow_vector2 = flow2[0][0] - prev_points2[0][0]
                        
                        magnitude1 = np.linalg.norm(flow_vector1)
                        magnitude2 = np.linalg.norm(flow_vector2)
                        
                        # Check for sudden motion changes (collision indicator)
                        if (magnitude1 > self.config['flow_magnitude_threshold'] or 
                            magnitude2 > self.config['flow_magnitude_threshold']):
                            
                            collision['validation_layers']['optical_flow'] = True
                            collision['optical_flow_analysis'] = {
                                'magnitude1': magnitude1,
                                'magnitude2': magnitude2,
                                'sudden_change_detected': True
                            }
                            validated_collisions.append(collision)
                        else:
                            # Normal flow - less likely to be collision
                            collision['validation_layers']['optical_flow'] = False
                            validated_collisions.append(collision)
                    else:
                        # Flow calculation failed, pass through
                        collision['validation_layers']['optical_flow'] = False
                        validated_collisions.append(collision)
                        
                except Exception as e:
                    # Error in flow calculation, pass through
                    collision['validation_layers']['optical_flow'] = False
                    validated_collisions.append(collision)
            else:
                # No previous flow data, pass through
                collision['validation_layers']['optical_flow'] = False
                validated_collisions.append(collision)
            
            # Update flow points for next frame
            self.flow_points[track1['id']] = self.flow_points.get(track1['id'], [])
            self.flow_points[track2['id']] = self.flow_points.get(track2['id'], [])
            
            self.flow_points[track1['id']].append(track1['center'])
            self.flow_points[track2['id']].append(track2['center'])
            
            # Keep only recent points
            if len(self.flow_points[track1['id']]) > 5:
                self.flow_points[track1['id']].pop(0)
            if len(self.flow_points[track2['id']]) > 5:
                self.flow_points[track2['id']].pop(0)
        
        return validated_collisions
    
    def _validate_collisions_with_physics(self, potential_collisions):
        """LAYER 4: Validate collisions using physics-based analysis."""
        validated_collisions = []
        
        for collision in potential_collisions:
            track1 = collision['track1']
            track2 = collision['track2']
            
            # Check for physics anomalies (sudden acceleration/deceleration)
            physics_anomaly1 = self._detect_physics_anomaly(track1['id'])
            physics_anomaly2 = self._detect_physics_anomaly(track2['id'])
            
            if physics_anomaly1 or physics_anomaly2:
                collision['validation_layers']['physics'] = True
                collision['physics_analysis'] = {
                    'vehicle1_anomaly': physics_anomaly1,
                    'vehicle2_anomaly': physics_anomaly2
                }
                validated_collisions.append(collision)
            else:
                collision['validation_layers']['physics'] = False
                validated_collisions.append(collision)
        
        return validated_collisions
    
    def _detect_physics_anomaly(self, vehicle_id):
        """Enhanced physics anomaly detection specifically for collisions."""
        if vehicle_id not in self.acceleration_history or vehicle_id not in self.velocity_history:
            return False
        
        accelerations = self.acceleration_history[vehicle_id]
        velocities = self.velocity_history[vehicle_id]
        
        if len(accelerations) < 3 or len(velocities) < 3:
            return False
        
        # Check for sudden deceleration (collision indicator)
        recent_accelerations = accelerations[-3:]
        max_deceleration = max(recent_accelerations)
        
        # Check for sudden direction change (T-bone collision indicator)
        if len(velocities) >= 3:
            vel_before = np.array(velocities[-3])
            vel_after = np.array(velocities[-1])
            
            # Calculate direction change
            if np.linalg.norm(vel_before) > 0 and np.linalg.norm(vel_after) > 0:
                dot_product = np.dot(vel_before, vel_after)
                magnitude_product = np.linalg.norm(vel_before) * np.linalg.norm(vel_after)
                
                if magnitude_product > 0:
                    cos_angle = np.clip(dot_product / magnitude_product, -1, 1)
                    direction_change = math.degrees(math.acos(abs(cos_angle)))
                    
                    # Sudden direction change indicates collision
                    if direction_change > 45:  # Significant direction change
                        return True
        
        # Check for acceleration spike followed by deceleration (impact pattern)
        if len(accelerations) >= 4:
            accel_pattern = accelerations[-4:]
            # Look for spike then drop pattern
            max_accel = max(accel_pattern)
            min_accel = min(accel_pattern)
            
            if max_accel > 8.0 and (max_accel - min_accel) > 6.0:
                return True
        
        # Standard deceleration check
        return max_deceleration > self.config['deceleration_threshold']
    
    def _find_depth_for_vehicle(self, vehicle, all_detections, depth_estimates):
        """Find depth estimate for a specific tracked vehicle."""
        vehicle_center = vehicle['center']
        
        # Find the detection that best matches this vehicle
        min_distance = float('inf')
        best_detection_idx = None
        
        for i, detection in enumerate(all_detections):
            detection_center = detection['center']
            distance = np.sqrt((vehicle_center[0] - detection_center[0])**2 + 
                             (vehicle_center[1] - detection_center[1])**2)
            
            if distance < min_distance and distance < 50:  # Reasonable matching threshold
                min_distance = distance
                best_detection_idx = i
        
        if best_detection_idx is not None and best_detection_idx in depth_estimates:
            return depth_estimates[best_detection_idx]
        
        return None
    
    def _calculate_velocities_and_physics(self, active_tracks):
        """Enhanced velocity calculation with physics tracking."""
        for track_id in active_tracks:
            history = self.vehicle_history.get(track_id, [])
            if len(history) < 2:
                continue
            
            # Calculate velocity
            current_pos = history[-1]
            prev_pos = history[-2]
            
            vx = current_pos[0] - prev_pos[0]
            vy = current_pos[1] - prev_pos[1]
            
            # Smooth velocity
            vehicle = self.tracked_vehicles[track_id]
            if vehicle.get('velocity'):
                old_vx, old_vy = vehicle['velocity']
                alpha = 0.7
                vx = alpha * vx + (1 - alpha) * old_vx
                vy = alpha * vy + (1 - alpha) * old_vy
            
            vehicle['velocity'] = [vx, vy]
            vehicle['speed'] = np.sqrt(vx**2 + vy**2)
            
            # Track velocity history for physics analysis
            if track_id not in self.velocity_history:
                self.velocity_history[track_id] = []
            self.velocity_history[track_id].append([vx, vy])
            if len(self.velocity_history[track_id]) > 10:
                self.velocity_history[track_id].pop(0)
            
            # Calculate acceleration for physics analysis
            if len(self.velocity_history[track_id]) >= 2:
                current_vel = np.array(self.velocity_history[track_id][-1])
                prev_vel = np.array(self.velocity_history[track_id][-2])
                acceleration = np.linalg.norm(current_vel - prev_vel)
                
                if track_id not in self.acceleration_history:
                    self.acceleration_history[track_id] = []
                self.acceleration_history[track_id].append(acceleration)
                if len(self.acceleration_history[track_id]) > 8:
                    self.acceleration_history[track_id].pop(0)
            
            # Update speed history
            if 'speed_history' not in vehicle:
                vehicle['speed_history'] = []
            vehicle['speed_history'].append(vehicle['speed'])
            if len(vehicle['speed_history']) > 10:
                vehicle['speed_history'].pop(0)
    
    def _detect_stopped_vehicles(self, current_frame):
        """Detect vehicles that have been stationary for too long."""
        incidents = []
        stopped_threshold = self.config['stopped_vehicle_time'] * 30
        
        for track_id, vehicle in self.tracked_vehicles.items():
            if 'velocity' not in vehicle or vehicle['velocity'] is None:
                continue
            
            speed = np.sqrt(vehicle['velocity'][0]**2 + vehicle['velocity'][1]**2)
            
            if speed < 2:
                if 'stopped_since' not in vehicle:
                    vehicle['stopped_since'] = current_frame
                
                stopped_duration = current_frame - vehicle['stopped_since']
                
                if stopped_duration > stopped_threshold:
                    incidents.append({
                        'type': 'stopped_vehicle',
                        'severity': 'MEDIUM',
                        'vehicle_id': track_id,
                        'vehicle_class': vehicle['class'],
                        'position': vehicle['center'],
                        'stopped_duration': stopped_duration / 30,
                        'timestamp': datetime.now().isoformat()
                    })
            else:
                vehicle.pop('stopped_since', None)
        
        return incidents
    
    def _detect_pedestrians_on_road(self, detections):
        """Detect pedestrians in dangerous road areas."""
        incidents = []
        
        pedestrians = [d for d in detections if d['class'] == 'person']
        
        for pedestrian in pedestrians:
            x, y = pedestrian['center']
            
            if self._is_in_road_area(x, y):
                incidents.append({
                    'type': 'pedestrian_on_road',
                    'severity': 'HIGH',
                    'position': pedestrian['center'],
                    'confidence': pedestrian['confidence'],
                    'timestamp': datetime.now().isoformat()
                })
        
        return incidents
    
    def _detect_speed_anomalies(self):
        """Detect sudden speed changes."""
        incidents = []
        
        for track_id, vehicle in self.tracked_vehicles.items():
            if 'speed_history' not in vehicle or len(vehicle['speed_history']) < 5:
                continue
            
            current_speed = vehicle.get('speed', 0)
            speed_history = vehicle['speed_history']
            
            if len(speed_history) > 1:
                speed_change = abs(current_speed - speed_history[-1]) / max(speed_history[-1], 1)
                
                if speed_change > self.config['speed_change_threshold']:
                    incidents.append({
                        'type': 'sudden_speed_change',
                        'severity': 'MEDIUM',
                        'vehicle_id': track_id,
                        'vehicle_class': vehicle['class'],
                        'position': vehicle['center'],
                        'speed_change': speed_change,
                        'current_speed': current_speed,
                        'previous_speed': speed_history[-1],
                        'timestamp': datetime.now().isoformat()
                    })
        
        return incidents
    
    def _find_best_match(self, vehicle, current_frame):
        """Find the best matching tracked vehicle with balanced filtering."""
        best_match = None
        min_distance = 80  # Reasonable matching distance
        
        for track_id, tracked in self.tracked_vehicles.items():
            if current_frame - tracked['last_seen'] > 3:  # Shorter tolerance
                continue
            
            distance = np.sqrt((vehicle['center'][0] - tracked['center'][0])**2 + 
                             (vehicle['center'][1] - tracked['center'][1])**2)
            
            # Additional filter: ensure similar sizes (prevents cars matching with trucks)
            if 'bbox' in tracked and 'bbox' in vehicle:
                tracked_area = tracked['bbox'][2] * tracked['bbox'][3]
                vehicle_area = vehicle['bbox'][2] * vehicle['bbox'][3]
                size_ratio = max(tracked_area, vehicle_area) / max(min(tracked_area, vehicle_area), 1)
                
                if size_ratio > 2.0:  # Skip if size difference is too large
                    continue
            
            if distance < min_distance:
                min_distance = distance
                best_match = track_id
        
        return best_match
    
    def _create_new_track(self, vehicle, current_frame):
        """Create a new vehicle track."""
        new_id = self.next_vehicle_id
        self.next_vehicle_id += 1
        
        self.tracked_vehicles[new_id] = {
            'id': new_id,
            'center': vehicle['center'],
            'bbox': vehicle['bbox'],
            'class': vehicle['class'],
            'confidence': vehicle['confidence'],
            'velocity': None,
            'speed': 0,
            'speed_history': [],
            'last_seen': current_frame,
            'created': current_frame
        }
        
        self.vehicle_history[new_id] = [vehicle['center']]
        return new_id
    
    def _update_track(self, track_id, vehicle, current_frame):
        """Update an existing vehicle track."""
        self.tracked_vehicles[track_id].update({
            'center': vehicle['center'],
            'bbox': vehicle['bbox'],
            'confidence': vehicle['confidence'],
            'last_seen': current_frame
        })
        
        if track_id not in self.vehicle_history:
            self.vehicle_history[track_id] = []
        
        self.vehicle_history[track_id].append(vehicle['center'])
        if len(self.vehicle_history[track_id]) > self.history_length:
            self.vehicle_history[track_id].pop(0)
    
    def _is_in_road_area(self, x, y):
        """Check if a point is in the main road area."""
        frame_width = 1280
        frame_height = 720
        
        road_left = frame_width * 0.1
        road_right = frame_width * 0.9
        road_top = frame_height * 0.3
        road_bottom = frame_height * 0.8
        
        return road_left <= x <= road_right and road_top <= y <= road_bottom

    def _process_alerts_and_record(self, incidents, current_frame):
        """Process alerts and record clips with enhanced traffic context awareness."""

        for incident in incidents:
            incident_type = incident['type']
            severity = incident.get('severity', 'MEDIUM')
            confidence = incident.get('confidence', 1)

            if incident_type == 'collision':
                ttc = incident['time_to_collision']
                vehicles = ' and '.join(incident['vehicles'])
                layers = incident.get('validation_layers', {})
                traffic_context = incident.get('traffic_context', 'unknown')
                peak_confidence = incident.get('peak_confidence', confidence)

                print(f"🚨 {severity} COLLISION ALERT:")
                print(f"   📹 Camera: {self.camera_config['camera_id']}")
                print(f"   🚗 Vehicles: {vehicles}")
                print(f"   ⏱️ Time to collision: {ttc:.1f}s")
                print(f"   📊 Sustained confidence: {confidence:.2f}")
                print(f"   📈 Peak confidence: {peak_confidence:.2f}")
                print(f"   🚦 Traffic context: {traffic_context}")
                print(f"   🔍 Validation layers: {layers}")

                if self._record_incident_if_not_duplicate(incident, current_frame):
                    print(f"   🎬 Recording collision incident clip")
                else:
                    print(f"   ⏭️ Skipping duplicate collision incident")

            elif incident_type == 'stopped_vehicle':
                duration = incident['stopped_duration']
                vehicle_class = incident['vehicle_class']
                print(f"🚨 {severity} ALERT: {vehicle_class} stopped for {duration:.1f}s")
                print(f"   📹 Camera: {self.camera_config['camera_id']}")

                if duration > 15:  # Only record for longer stops
                    if self._record_incident_if_not_duplicate(incident, current_frame):
                        print(f"   🎬 Recording stopped vehicle incident clip")
                    else:
                        print(f"   ⏭️ Skipping duplicate stopped vehicle incident")

            elif incident_type == 'pedestrian_on_road':
                print(f"🚨 {severity} ALERT: Pedestrian detected on roadway!")
                print(f"   📹 Camera: {self.camera_config['camera_id']}")

                if self._record_incident_if_not_duplicate(incident, current_frame):
                    print(f"   🎬 Recording pedestrian incident clip")
                else:
                    print(f"   ⏭️ Skipping duplicate pedestrian incident")

            elif incident_type == 'sudden_speed_change':
                vehicle_class = incident['vehicle_class']
                speed_change = incident['speed_change']
                print(f"🚨 {severity} ALERT: {vehicle_class} sudden speed change ({speed_change:.1f}x)")
                print(f"   📹 Camera: {self.camera_config['camera_id']}")

                if speed_change > 1.5:
                    if self._record_incident_if_not_duplicate(incident, current_frame):
                        print(f"   🎬 Recording speed change incident clip")
                    else:
                        print(f"   ⏭️ Skipping duplicate speed change incident")

            self.analytics['alerts'].append(incident)
    
    def _create_visualization(self, frame, detection_results, incidents):
        """Create annotated frame with enhanced visualizations."""
        viz_frame = frame.copy()
        
        # Draw object detections
        viz_frame = self._draw_detections(viz_frame, detection_results)
        
        # Draw incidents with layer information
        viz_frame = self._draw_enhanced_incidents(viz_frame, incidents)
        
        # Draw tracking information
        viz_frame = self._draw_tracking_info(viz_frame)
        
        # Add enhanced analytics overlay
        viz_frame = self._add_enhanced_analytics_overlay(viz_frame, incidents)
        
        return viz_frame
    
    def _draw_detections(self, frame, results):
        """Draw detection bounding boxes."""
        colors = {
            'person': (0, 255, 255),    # Yellow
            'car': (0, 255, 0),        # Green
            'truck': (0, 0, 255),      # Red
            'bus': (255, 255, 0),      # Cyan
            'motorcycle': (255, 0, 255), # Magenta
            'bicycle': (255, 165, 0)   # Orange
        }
        
        for detection in results['detections']:
            x, y, w, h = detection['bbox']
            class_name = detection['class']
            confidence = detection['confidence']
            
            color = colors.get(class_name, (128, 128, 128))
            
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        return frame
    
    def _draw_enhanced_incidents(self, frame, incidents):
        """Draw incidents with enhanced validation information."""
        for incident in incidents:
            incident_type = incident['type']
            severity = incident.get('severity', 'MEDIUM')
            
            # Color based on severity
            severity_colors = {
                'CRITICAL': (0, 0, 139),    # Dark Red
                'HIGH': (0, 0, 255),        # Red
                'MEDIUM': (0, 165, 255),    # Orange
                'LOW': (0, 255, 255)        # Yellow
            }
            color = severity_colors.get(severity, (128, 128, 128))
            
            if 'position' in incident:
                pos = incident['position']
                cv2.circle(frame, (int(pos[0]), int(pos[1])), 15, color, -1)
                cv2.circle(frame, (int(pos[0]), int(pos[1])), 20, color, 3)
                
                label = f"{incident_type.upper()}"
                cv2.putText(frame, label, (int(pos[0]) - 40, int(pos[1]) - 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Enhanced collision display with validation information
            if incident_type == 'collision' and 'predicted_point' in incident:
                pred_point = incident['predicted_point']
                cv2.circle(frame, (int(pred_point[0]), int(pred_point[1])), 25, color, 3)
                
                ttc = incident['time_to_collision']
                confidence = incident.get('confidence', 0)
                peak_confidence = incident.get('peak_confidence', confidence)
                traffic_context = incident.get('traffic_context', 'unknown')
                
                # Show collision details
                collision_text = f"COLLISION: {ttc:.1f}s"
                confidence_text = f"Conf: {confidence:.2f}/{peak_confidence:.2f}"
                context_text = f"Traffic: {traffic_context}"
                
                cv2.putText(frame, collision_text, 
                           (int(pred_point[0]) - 70, int(pred_point[1]) - 60),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                cv2.putText(frame, confidence_text, 
                           (int(pred_point[0]) - 60, int(pred_point[1]) - 35),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                cv2.putText(frame, context_text, 
                           (int(pred_point[0]) - 50, int(pred_point[1]) - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
                
                # Show validation layers
                if 'validation_layers' in incident:
                    layers = incident['validation_layers']
                    layer_text = f"Layers: T:{layers.get('trajectory', 'F')} D:{layers.get('depth', 'F')} O:{layers.get('optical_flow', 'F')} P:{layers.get('physics', 'F')}"
                    cv2.putText(frame, layer_text, 
                               (int(pred_point[0]) - 80, int(pred_point[1]) + 15),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        
        return frame
    
    def _draw_tracking_info(self, frame):
        """Draw clean vehicle tracking trajectories for demo presentation."""
        # Get frame dimensions for cleanup logic
        height, width = frame.shape[:2]
        
        for track_id, history in self.vehicle_history.items():
            if len(history) < 2:
                continue
            
            # Only draw trajectory if vehicle is still active (seen recently)
            vehicle = self.tracked_vehicles.get(track_id)
            if not vehicle:
                continue
                
            current_frame = self.analytics['total_frames']
            if current_frame - vehicle['last_seen'] > 10:  # Vehicle not seen for 10 frames
                continue
            
            # Draw a cleaner, shorter trajectory (last 8 points only)
            recent_history = history[-8:] if len(history) > 8 else history
            
            # Draw trajectory with fading effect
            for i in range(1, len(recent_history)):
                # Calculate alpha (transparency) - newer points are more visible
                alpha = i / len(recent_history)
                
                pt1 = tuple(map(int, recent_history[i-1]))
                pt2 = tuple(map(int, recent_history[i]))
                
                # Only draw if points are within frame bounds
                if (0 <= pt1[0] < width and 0 <= pt1[1] < height and 
                    0 <= pt2[0] < width and 0 <= pt2[1] < height):
                    
                    # Use thinner line and semi-transparent green
                    cv2.line(frame, pt1, pt2, (0, int(255 * alpha), 0), 1)
            
            # Draw clean vehicle info only for active vehicles
            if recent_history:
                last_pos = recent_history[-1]
                
                # Only show ID and speed if vehicle is in a good position (not at edges)
                if (50 < last_pos[0] < width - 100 and 50 < last_pos[1] < height - 50):
                    
                    # Create a small info box with background
                    info_x = int(last_pos[0]) + 15
                    info_y = int(last_pos[1]) - 20
                    
                    # Ensure info box doesn't go out of bounds
                    if info_x > width - 80:
                        info_x = int(last_pos[0]) - 70
                    if info_y < 30:
                        info_y = int(last_pos[1]) + 30
                    
                    # Draw semi-transparent background for text
                    cv2.rectangle(frame, (info_x - 5, info_y - 15), 
                                 (info_x + 65, info_y + 5), (0, 0, 0), -1)
                    cv2.rectangle(frame, (info_x - 5, info_y - 15), 
                                 (info_x + 65, info_y + 5), (255, 255, 255), 1)
                    
                    # Clean, minimal text display
                    speed = vehicle.get('speed', 0)
                    cv2.putText(frame, f"V{track_id}:{speed:.0f}", 
                               (info_x, info_y - 2),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        return frame
    
    def _add_enhanced_analytics_overlay(self, frame, incidents):
        """Add enhanced analytics overlay with traffic awareness information."""
        height, width = frame.shape[:2]
        
        # Create incident summary
        incident_counts = defaultdict(int)
        collision_incidents = []
        for incident in incidents:
            incident_counts[incident['type']] += 1
            if incident['type'] == 'collision':
                collision_incidents.append(incident)
        
        runtime = time.time() - self.analytics['start_time']
        layers = self.analytics['collision_layers']
        
        # Get current traffic analysis
        current_vehicles = len([d for d in self.tracked_vehicles.values() 
                               if self.analytics['total_frames'] - d.get('last_seen', 0) <= 10])
        
        # Create enhanced overlay text with traffic awareness info
        overlay_text = [
            f"🎥 Camera {self.camera_config['camera_id']} - Enhanced Traffic Monitor",
            "",
            f"⏱️ Runtime: {runtime:.0f}s",
            f"🚗 Current Vehicles: {current_vehicles}",
            f"📊 Frames: {self.analytics['total_frames']:,}",
            "",
            f"🚦 Traffic Density: {self.current_density_level.upper()}",
            "",
            "🔍 Enhanced Detection Layers:",
            f"  📡 Traffic-Aware Trajectory: {layers['trajectory_detected']}",
            f"  📏 Depth Analysis: {layers['depth_confirmed']}",
            f"  🌊 Motion Flow: {layers['flow_confirmed']}",
            f"  ⚡ Physics Validation: {layers['physics_confirmed']}",
            "",
            f"✅ Final Confirmed: {layers['final_confirmed']}",
            f"🎬 Clips Recorded: {self.analytics['clips_recorded']}",
        ]
        
        # Add active incidents if any
        if collision_incidents:
            overlay_text.append("")
            overlay_text.append("🚨 ACTIVE ALERTS:")
            for incident in collision_incidents[:2]:  # Show max 2
                ttc = incident.get('time_to_collision', 0)
                vehicles = ' & '.join(incident.get('vehicles', ['Unknown', 'Unknown']))
                confidence = incident.get('confidence', 0)
                traffic_context = incident.get('traffic_context', 'unknown')
                overlay_text.append(f"  🚗 {vehicles}: {ttc:.1f}s ({confidence:.2f})")
                overlay_text.append(f"     Context: {traffic_context}")
        
        # Calculate responsive overlay dimensions based on frame size
        # Scale overlay size based on resolution
        if width > 1500:  # Large/fullscreen
            overlay_width = 380
            font_scale = 0.6
            line_height = 28
            padding = 20
        elif width > 1000:  # Medium
            overlay_width = 330
            font_scale = 0.55
            line_height = 25
            padding = 15
        else:  # Small
            overlay_width = 280
            font_scale = 0.5
            line_height = 22
            padding = 12
        
        overlay_height = len(overlay_text) * line_height + (padding * 2)
        
        # Position overlay (top-right with responsive margins)
        margin = max(15, width // 100)  # Responsive margin
        overlay_x = width - overlay_width - margin
        overlay_y = margin
        
        # Ensure overlay doesn't go off screen
        if overlay_x < 0:
            overlay_x = 10
        if overlay_y + overlay_height > height:
            overlay_y = height - overlay_height - 10
        
        # Draw responsive background
        cv2.rectangle(frame, (overlay_x, overlay_y), 
                     (overlay_x + overlay_width, overlay_y + overlay_height), 
                     (40, 40, 40), -1)  # Dark gray background
        
        cv2.rectangle(frame, (overlay_x, overlay_y), 
                     (overlay_x + overlay_width, overlay_y + overlay_height), 
                     (200, 200, 200), 2)  # Light gray border
        
        # Draw text with enhanced responsive sizing
        for i, text in enumerate(overlay_text):
            text_y = overlay_y + padding + (i + 1) * line_height
            text_x = overlay_x + padding
            
            # Skip if text would go below frame
            if text_y > height - 10:
                break
            
            # Enhanced color scheme
            if i == 0:  # Title
                color = (255, 255, 255)
                font_size = font_scale + 0.1
                thickness = 2
            elif "Final Confirmed" in text:
                if layers['final_confirmed'] > 0:
                    color = (0, 100, 255)  # Orange for incidents
                else:
                    color = (100, 255, 100)  # Green for no incidents
                font_size = font_scale
                thickness = 2
            elif "ACTIVE ALERTS" in text:
                color = (0, 0, 255)  # Red for alerts
                font_size = font_scale
                thickness = 2
            elif text.startswith("  🚗") or text.startswith("     "):  # Alert details
                color = (0, 0, 255)  # Red for alert details
                font_size = font_scale - 0.05
                thickness = 1
            elif text.startswith("  ") and ":" in text:  # Layer stats
                color = (180, 180, 180)  # Light gray for stats
                font_size = font_scale - 0.05
                thickness = 1
            elif text == "":  # Empty lines
                continue
            else:  # Regular text
                color = (220, 220, 220)  # Light gray
                font_size = font_scale
                thickness = 1
            
            cv2.putText(frame, text, (text_x, text_y), 
                       cv2.FONT_HERSHEY_SIMPLEX, font_size, color, thickness)
        
        return frame
    
    def _update_analytics(self, detection_results, incidents):
        """Update analytics with detection and incident data."""
        self.analytics['total_frames'] += 1
        self.analytics['total_detections'] += detection_results['total_count']
        self.analytics['incidents_detected'] += len(incidents)
        
        # Update class totals
        for class_name, count in detection_results['class_counts'].items():
            if class_name not in self.analytics['class_totals']:
                self.analytics['class_totals'][class_name] = 0
            self.analytics['class_totals'][class_name] += count
        
        # Log incidents
        for incident in incidents:
            incident['frame_number'] = self.analytics['total_frames']
            incident['camera_id'] = self.camera_config['camera_id']
            self.analytics['incident_log'].append(incident)
    
    def _save_frame(self, frame, frame_number, manual=False):
        """Save frame manually."""
        import os
        os.makedirs('saved_frames', exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        camera_id = self.camera_config['camera_id']
        filename = f"saved_frames/frame_{camera_id}_{timestamp}_{frame_number}"
        if manual:
            filename += "_manual"
        filename += ".jpg"
        
        cv2.imwrite(filename, frame)
        print(f"📸 Frame saved: {filename}")
    
    def _reset_analytics(self):
        """Reset analytics counters."""
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
            'clips_recorded': 0
        }
        
        # Clear tracking data
        self.tracked_vehicles.clear()
        self.vehicle_history.clear()
        self.velocity_history.clear()
        self.acceleration_history.clear()
        self.flow_points.clear()
        self.collision_evidence_buffer.clear()  # Clear evidence buffer
        self.next_vehicle_id = 0
        self.recent_incidents.clear()
        self.incident_cooldown.clear()
        
        print(f"🔄 Analytics and tracking data reset for camera {self.camera_config['camera_id']}")
    
    def _cleanup(self):
        """Cleanup resources and save final report."""
        camera_id = self.camera_config['camera_id']
        print(f"🧹 Cleaning up resources for camera {camera_id}...")
        
        time.sleep(1)
        
        # Release video capture
        if self.cap:
            self.cap.release()
            print(f"✓ Released video capture for camera {camera_id}")
        
        # Close OpenCV windows for this camera
        try:
            window_name = f"Camera {camera_id} - Enhanced Incident Detection"
            cv2.destroyWindow(window_name)
            cv2.waitKey(1)  # Allow window destruction to complete
        except:
            pass
        
        # Generate final report
        self._generate_final_report()
        
        print(f"✅ Cleanup completed for camera {camera_id}")
    
    def _generate_final_report(self):
        """Generate and save final detection report."""
        runtime = time.time() - self.analytics['start_time']
        layers = self.analytics['collision_layers']
        camera_id = self.camera_config['camera_id']
        
        # Convert any numpy types to native Python types for JSON serialization
        def convert_to_json_serializable(obj):
            """Convert numpy types and other non-serializable types to JSON-serializable types."""
            if hasattr(obj, 'tolist'):  # numpy arrays
                return obj.tolist()
            elif hasattr(obj, 'item'):  # numpy scalars
                return obj.item()
            elif isinstance(obj, np.bool_):
                return bool(obj)
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_to_json_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_json_serializable(item) for item in obj]
            else:
                return obj
        
        report = {
            'camera_id': str(camera_id),
            'session_summary': {
                'runtime_seconds': float(runtime),
                'total_frames': int(self.analytics['total_frames']),
                'total_detections': int(self.analytics['total_detections']),
                'total_incidents': int(self.analytics['incidents_detected']),
                'average_fps': float(self.analytics['total_frames'] / runtime if runtime > 0 else 0)
            },
            'detection_summary': {k: int(v) for k, v in self.analytics['class_totals'].items()},
            'incident_summary': {},
            'enhanced_collision_performance': {
                'traffic_aware_trajectory_detected': int(layers['trajectory_detected']),
                'depth_confirmed': int(layers['depth_confirmed']),
                'flow_confirmed': int(layers['flow_confirmed']),
                'physics_confirmed': int(layers['physics_confirmed']),
                'final_validated_collisions': int(layers['final_confirmed']),
                'false_positive_reduction': float((layers['trajectory_detected'] - layers['final_confirmed']) / max(layers['trajectory_detected'], 1))
            },
            'all_incidents': convert_to_json_serializable(self.analytics['incident_log']),
            'clip_recording': {
                'clips_recorded': int(self.analytics['clips_recorded']),
                'clips_folder': str(self.incident_clips_folder)
            }
        }
        
        # Summarize incidents by type
        for incident in self.analytics['incident_log']:
            incident_type = incident['type']
            if incident_type not in report['incident_summary']:
                report['incident_summary'][incident_type] = 0
            report['incident_summary'][incident_type] += 1
        
        # Save report with error handling
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"enhanced_incident_report_{camera_id}_{timestamp}.json"
            
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)  # Use default=str as fallback
            
            # Print enhanced summary
            print(f"\n{'='*60}")
            print(f"📊 CAMERA {camera_id} - ENHANCED INCIDENT DETECTION REPORT")
            print(f"{'='*60}")
            print(f"⏱️ Runtime: {runtime:.1f} seconds")
            print(f"📊 Frames processed: {self.analytics['total_frames']}")
            print(f"🎯 Average FPS: {report['session_summary']['average_fps']:.1f}")
            print(f"🔍 Total detections: {self.analytics['total_detections']}")
            print(f"🚨 Total incidents: {self.analytics['incidents_detected']}")
            print(f"🎬 Clips recorded: {self.analytics['clips_recorded']}")
            
            print(f"\n🚀 ENHANCED COLLISION DETECTION PERFORMANCE:")
            print(f"  🚦 Traffic-Aware Trajectory: {layers['trajectory_detected']} detected")
            print(f"  📏 Depth Validation: {layers['depth_confirmed']} confirmed")
            print(f"  🌊 Optical Flow: {layers['flow_confirmed']} confirmed")
            print(f"  ⚡ Physics Validation: {layers['physics_confirmed']} confirmed")
            print(f"  ✅ FINAL Validated: {layers['final_confirmed']} confirmed")
            
            if layers['trajectory_detected'] > 0:
                reduction = (layers['trajectory_detected'] - layers['final_confirmed']) / layers['trajectory_detected'] * 100
                print(f"  🎯 False Positive Reduction: {reduction:.1f}%")
            
            if report['incident_summary']:
                print(f"\n📋 Incident breakdown:")
                for incident_type, count in report['incident_summary'].items():
                    print(f"  {incident_type}: {count}")
            else:
                print("\n✅ No incidents detected during session")
            
            print(f"\n🎬 VIDEO CLIPS:")
            print(f"  Clips recorded: {self.analytics['clips_recorded']}")
            print(f"  Clips folder: {self.incident_clips_folder}")
            
            print(f"\n📄 Detailed report saved to: {filename}")
            
        except Exception as e:
            print(f"❌ Error saving report: {e}")
            print("📊 Analytics data:")
            print(f"  Runtime: {runtime:.1f}s")
            print(f"  Frames: {self.analytics['total_frames']}")
            print(f"  Incidents: {self.analytics['incidents_detected']}")
            print(f"  Clips: {self.analytics['clips_recorded']}")


def load_camera_configurations():
    """Load camera configurations from cameras/cameras.json."""
    try:
        with open('Cameras/camera.json', 'r') as f:
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
    # Enhanced configuration
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
        
        # ENHANCED MULTI-LAYER COLLISION DETECTION
        'collision_distance_threshold': 30,        # Adjusted for better precision
        'prediction_horizon': 15,
        'min_tracking_confidence': 0.7,
        'min_collision_speed': 8.0,               # Increased to avoid slow traffic
        'collision_angle_threshold': 30,
        'min_trajectory_length': 10,
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
        'deceleration_threshold': 10.0,        # Adjusted for better detection
        
        # ENHANCED VALIDATION REQUIREMENTS
        'require_all_layers': False,
        'minimum_layer_agreement': 2,
        'collision_confidence_threshold': 0.7,  # Higher confidence threshold
        
        # Other settings
        'stopped_vehicle_time': 10,
        'speed_change_threshold': 0.8,
        'pedestrian_road_threshold': 50,
    }
    
    print("🚀 Initializing ENHANCED Multi-Camera Incident Detection System...")
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
    
    # Create and start detection threads for each camera
    threads = []
    
    for camera_config in cameras:
        if not camera_config.get('camera_id') or not camera_config.get('url'):
            print(f"⚠️ Skipping invalid camera config: {camera_config}")
            continue
            
        thread = threading.Thread(
            target=run_camera_detection,
            args=(camera_config, config),
            name=f"Camera-{camera_config['camera_id']}",
            daemon=True  # Make threads daemon so they'll exit when main exits
        )
        threads.append(thread)
        thread.start()
        print(f" Started detection thread for camera: {camera_config['camera_id']}")
        time.sleep(1)  # Small delay between camera starts
    
    if not threads:
        print("✗ No valid camera configurations found")
        return
    
    print(f"\n {len(threads)} camera thread(s) running. Press Ctrl+C to stop all cameras.")
    print(" Enhanced Features Active:")
    print("  • Traffic-aware collision detection")
    print("  • Evidence persistence validation")
    print("  • Smart parallel traffic filtering")
    print("  • Enhanced physics analysis")
    print("  • Adaptive threshold adjustment")
    
    try:
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        print("\n Stopping all camera detection threads...")
        print("   Waiting for cleanup to complete...")
        time.sleep(3)  # Give time for cleanup
        
    print(" All camera threads stopped.")
    
    # Final cleanup of any remaining OpenCV windows
    cv2.destroyAllWindows()
    cv2.waitKey(1)


if __name__ == "__main__":
    main()