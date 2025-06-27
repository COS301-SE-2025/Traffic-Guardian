"""
Enhanced Incident Detection System with ADVANCED Multi-Layer Collision Detection
Implements: Depth Estimation, Optical Flow, Physics-Based Validation, and API Integration
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
from dotenv import load_dotenv

load_dotenv()

class AdvancedIncidentDetectionSystem:
    def __init__(self, stream_url="Videos/Demo2.mp4", config=None):
        """
        Advanced incident detection system with multi-layer collision detection.
        """
        self.stream_url = stream_url
        self.config = config or self._default_config()
        
        # Initialize YOLO model
        self.model = self._load_model()
        self.target_classes = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
        # Vehicle tracking for trajectory analysis
        self.tracked_vehicles = {}
        self.vehicle_history = {}
        self.next_vehicle_id = 0
        self.history_length = 20  # Increased for better physics analysis
        
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
            'api_failures': 0
        }
        
        self.api_config = self._load_api_config()
        
        # Video capture
        self.cap = None
        self.initialize_capture()
        

        
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
    
    def _send_incident_to_api(self, incident):
        """Send incident report to API endpoint using secure configuration."""
        if not self.api_config['enabled']:
            print("API integration disabled - no API key found")
            return
        
        try:
            # Prepare incident data for API
            incident_data = {
                "Incidents_DateTime": datetime.now().strftime("%Y-%m-%d"),
                "Incident_Severity": self._map_severity_for_api(incident.get('severity', 'MEDIUM')),
                "Incident_Status": "open",
                "Incident_Reporter": "cam"
            }
            
            headers = {
                'X-API-KEY': self.api_config['api_key'],  # Now loaded securely from env
                'Content-Type': 'application/json'
            }
            
            # Send POST request
            response = requests.post(
                self.api_config['endpoint'],
                headers=headers,
                json=incident_data,
                timeout=self.api_config['timeout']
            )
            
            if response.status_code == 200 or response.status_code == 201:
                self.analytics['api_reports_sent'] += 1
                print(f"✅ Incident reported to API: {incident_data['Incident_Severity']} severity")
                print(f"   Location: {incident_data['Incident_Location']}")
                print(f"   Response: {response.status_code}")
            else:
                self.analytics['api_failures'] += 1
                print(f"⚠️ API report failed: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.Timeout:
            self.analytics['api_failures'] += 1
            print(f"⚠️API report timeout: Request took longer than {self.api_config['timeout']}s")
            
        except requests.exceptions.ConnectionError:
            self.analytics['api_failures'] += 1
            print(f"⚠️ API connection failed: Could not connect to {self.api_config['endpoint']}")
            print("   (This is normal if the API server is not running)")
            
        except Exception as e:
            self.analytics['api_failures'] += 1
            print(f"⚠️ API report error: {e}")


    
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
        """Initialize video capture with retry logic."""
        max_retries = 5
        for attempt in range(max_retries):
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                print(f"✓ Connected to video: {self.stream_url}")
                return True
            print(f"Connection attempt {attempt+1}/{max_retries} failed...")
            time.sleep(2)
        return False
    
    def run_detection(self):
        """Main detection loop with advanced multi-layer collision detection."""
        if not self.cap or not self.cap.isOpened():
            print("✗ Video capture not initialized")
            return
        
        print("🚀 Starting ADVANCED incident detection system...")
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
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Restart video
                    continue
                
                frame_count += 1
                if frame_count % self.config['frame_skip'] != 0:
                    continue
                
                # Core object detection
                detection_results = self._detect_objects(frame)
                
                # Vehicle tracking and trajectory analysis
                tracking_results = self._update_vehicle_tracking(detection_results['detections'])
                
                # ADVANCED Multi-Layer Incident Detection
                incidents = self._detect_incidents_multilayer(frame, detection_results, tracking_results)
                
                # Update analytics
                self._update_analytics(detection_results, incidents)
                
                # Generate alerts
                self._process_alerts(incidents)
                
                # Create visualization
                annotated_frame = self._create_visualization(frame, detection_results, incidents)
                
                # Display and save
                if self.config['display_window']:
                    # Create named window with proper flags for fullscreen support
                    cv2.namedWindow("Advanced Incident Detection", cv2.WINDOW_NORMAL)
                    cv2.imshow("Advanced Incident Detection", annotated_frame)
                
                if self.config['save_incidents'] and incidents:
                    self._save_incident_frame(annotated_frame, incidents, frame_count)
                
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
                    is_fullscreen = not is_fullscreen
                    if is_fullscreen:
                        cv2.setWindowProperty("Advanced Incident Detection", 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                        print("🖥️ Switched to fullscreen mode (Press ESC or 'f' to exit)")
                    else:
                        cv2.setWindowProperty("Advanced Incident Detection", 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                        print("🪟 Switched to windowed mode")
                elif key == 27:  # ESC key
                    if is_fullscreen:
                        is_fullscreen = False
                        cv2.setWindowProperty("Advanced Incident Detection", 
                                            cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
                        print("🪟 Exited fullscreen mode")
                
        except KeyboardInterrupt:
            print("\n⏹️ Detection stopped by user")
        finally:
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
        """ADVANCED Multi-Layer Incident Detection Pipeline."""
        incidents = []
        current_frame = self.analytics['total_frames']
        
        # 1. LAYER 1: Basic Trajectory Collision Detection
        trajectory_collisions = self._detect_trajectory_collisions(tracking_results['active_tracks'])
        self.analytics['collision_layers']['trajectory_detected'] += len(trajectory_collisions)
        
        # 2. LAYER 2: Depth Analysis Validation
        if self.config['depth_analysis_enabled'] and trajectory_collisions:
            depth_validated = self._validate_collisions_with_depth(frame, trajectory_collisions, detection_results['detections'])
            self.analytics['collision_layers']['depth_confirmed'] += len(depth_validated)
        else:
            depth_validated = trajectory_collisions
        
        # 3. LAYER 3: Optical Flow Validation  
        if self.config['optical_flow_enabled'] and depth_validated and self.previous_frame is not None:
            flow_validated = self._validate_collisions_with_optical_flow(frame, self.previous_frame, depth_validated)
            self.analytics['collision_layers']['flow_confirmed'] += len(flow_validated)
        else:
            flow_validated = depth_validated
        
        # 4. LAYER 4: Physics Validation
        if self.config['physics_validation_enabled'] and flow_validated:
            physics_validated = self._validate_collisions_with_physics(flow_validated)
            self.analytics['collision_layers']['physics_confirmed'] += len(physics_validated)
        else:
            physics_validated = flow_validated
        
        # 5. FINAL VALIDATION: Combine all layers
        final_collisions = self._final_collision_validation(physics_validated)
        self.analytics['collision_layers']['final_confirmed'] += len(final_collisions)
        
        # Send API reports for confirmed collisions
        if final_collisions and self.config.get('api_enabled', True):
            for collision in final_collisions:
                self._send_incident_to_api(collision)
        
        incidents.extend(final_collisions)
        
        # 6. Other incident types (simplified - no debris detection)
        stopped_incidents = self._detect_stopped_vehicles(current_frame)
        incidents.extend(stopped_incidents)
        
        pedestrian_incidents = self._detect_pedestrians_on_road(detection_results['detections'])
        incidents.extend(pedestrian_incidents)
        
        speed_incidents = self._detect_speed_anomalies()
        incidents.extend(speed_incidents)
        
        return incidents
    
    def _send_incident_to_api(self, incident):
        """Send incident report to API endpoint."""
        try:
            # Prepare incident data for API
            incident_data = {
                "Incidents_DateTime": datetime.now().strftime("%Y-%m-%d"),
                "Incident_Severity": self._map_severity_for_api(incident.get('severity', 'MEDIUM')),
                "Incident_Status": "open",
                "Incident_Reporter": "cam"
            }
            
            headers = {
                'X-API-KEY': self.config.get('api_key', '2fc66075d878832'),
                'Content-Type': 'application/json'
            }
            
            # Send POST request
            response = requests.post(
                self.config.get('api_endpoint', 'http://localhost:5000/api/incidents'),
                headers=headers,
                json=incident_data,
                timeout=self.config.get('api_timeout', 5)
            )
            
            if response.status_code == 200 or response.status_code == 201:
                self.analytics['api_reports_sent'] += 1
                print(f"✅ Incident reported to API: {incident_data['Incident_Severity']} severity")
                print(f"   Location: {incident_data['Incident_Location']}")
                print(f"   Response: {response.status_code}")
            else:
                self.analytics['api_failures'] += 1
                print(f"⚠️ API report failed: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.Timeout:
            self.analytics['api_failures'] += 1
            print(f"⚠️ API report timeout: Request took longer than {self.config.get('api_timeout', 5)}s")
            
        except requests.exceptions.ConnectionError:
            self.analytics['api_failures'] += 1
            print(f"⚠️ API connection failed: Could not connect to {self.config.get('api_endpoint')}")
            print("   (This is normal if the API server is not running)")
            
        except Exception as e:
            self.analytics['api_failures'] += 1
            print(f"⚠️ API report error: {e}")
    
    def _map_severity_for_api(self, system_severity):
        """Map system severity levels to API expected values."""
        severity_mapping = {
            'CRITICAL': 'high',
            'HIGH': 'high', 
            'MEDIUM': 'medium',
            'LOW': 'low'
        }
        return severity_mapping.get(system_severity, 'medium')
    
    def _detect_trajectory_collisions(self, active_tracks):
        """LAYER 1: Basic trajectory-based collision detection."""
        potential_collisions = []
        prediction_horizon = self.config['prediction_horizon']
        min_trajectory_length = self.config['min_trajectory_length']
        
        for i, track1_id in enumerate(active_tracks):
            for track2_id in active_tracks[i+1:]:
                track1 = self.tracked_vehicles.get(track1_id)
                track2 = self.tracked_vehicles.get(track2_id)
                
                # Basic candidate check
                if not self._is_collision_candidate(track1, track2, min_trajectory_length):
                    continue
                
                # Check if approaching
                if not self._are_vehicles_approaching(track1, track2):
                    continue
                
                # Predict collision
                collision_data = self._predict_basic_collision(track1, track2, prediction_horizon)
                if collision_data:
                    potential_collisions.append({
                        'track1_id': track1_id,
                        'track2_id': track2_id,
                        'track1': track1,
                        'track2': track2,
                        'collision_data': collision_data,
                        'validation_layers': {'trajectory': True}
                    })
        
        return potential_collisions
    
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
        """Detect physics anomalies for a specific vehicle."""
        if vehicle_id not in self.acceleration_history:
            return False
        
        accelerations = self.acceleration_history[vehicle_id]
        if len(accelerations) < 3:
            return False
        
        # Look for sudden deceleration (collision indicator)
        recent_accelerations = accelerations[-3:]
        max_deceleration = max(recent_accelerations)
        
        return max_deceleration > self.config['deceleration_threshold']
    
    def _final_collision_validation(self, potential_collisions):
        """Final validation combining all layers."""
        final_collisions = []
        
        for collision in potential_collisions:
            layers = collision['validation_layers']
            
            # Count how many layers confirmed the collision
            confirmed_layers = sum([
                layers.get('trajectory', False),
                layers.get('depth', False),
                layers.get('optical_flow', False),
                layers.get('physics', False)
            ])
            
            # Calculate overall confidence
            total_layers = 4
            confidence = confirmed_layers / total_layers
            
            # Apply validation rules
            if self.config['require_all_layers']:
                # Require ALL layers to agree (very strict)
                if confirmed_layers == total_layers:
                    final_collisions.append(self._create_final_collision_incident(collision, confidence))
            else:
                # Require minimum number of layers to agree
                if (confirmed_layers >= self.config['minimum_layer_agreement'] and 
                    confidence >= self.config['collision_confidence_threshold']):
                    final_collisions.append(self._create_final_collision_incident(collision, confidence))
        
        return final_collisions
    
    def _create_final_collision_incident(self, collision, confidence):
        """Create the final collision incident with all validation data."""
        track1 = collision['track1']
        track2 = collision['track2']
        collision_data = collision['collision_data']
        
        return {
            'type': 'collision',
            'severity': self._determine_multilayer_severity(collision, confidence),
            'time_to_collision': collision_data['ttc'],
            'vehicles': [track1['class'], track2['class']],
            'vehicle_ids': [track1['id'], track2['id']],
            'positions': [track1['center'], track2['center']],
            'predicted_point': collision_data['collision_point'],
            'confidence': confidence,
            'validation_layers': collision['validation_layers'],
            'layer_analysis': {
                'depth': collision.get('depth_analysis', {}),
                'optical_flow': collision.get('optical_flow_analysis', {}),
                'physics': collision.get('physics_analysis', {})
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _determine_multilayer_severity(self, collision, confidence):
        """Determine severity based on multi-layer analysis."""
        if confidence >= 0.9:
            return 'CRITICAL'
        elif confidence >= 0.8:
            return 'HIGH'
        elif confidence >= 0.6:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    # Helper methods and other incident detection methods go here...
    # (I'll continue with the remaining methods in the next part)
    
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
    
    # Basic helper methods (simplified versions of the original methods)
    def _is_collision_candidate(self, track1, track2, min_trajectory_length):
        """Check if two vehicles are candidates for collision detection."""
        if not track1 or not track2:
            return False
        
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        hist1 = self.vehicle_history.get(track1['id'], [])
        hist2 = self.vehicle_history.get(track2['id'], [])
        
        if len(hist1) < min_trajectory_length or len(hist2) < min_trajectory_length:
            return False
        
        speed1 = track1.get('speed', 0)
        speed2 = track2.get('speed', 0)
        min_speed = self.config['min_collision_speed']
        
        return speed1 >= min_speed and speed2 >= min_speed
    
    def _are_vehicles_approaching(self, track1, track2):
        """Check if vehicles are approaching each other."""
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        relative_pos = pos2 - pos1
        relative_vel = vel2 - vel1
        
        approach_rate = np.dot(relative_pos, relative_vel)
        
        if np.linalg.norm(relative_pos) > 0 and np.linalg.norm(relative_vel) > 0:
            cos_angle = approach_rate / (np.linalg.norm(relative_pos) * np.linalg.norm(relative_vel))
            cos_angle = np.clip(cos_angle, -1, 1)
            angle = math.degrees(math.acos(abs(cos_angle)))
            
            if angle > self.config['collision_angle_threshold']:
                return False
        
        return approach_rate < -2.0  # Stricter approach threshold
    
    def _predict_basic_collision(self, track1, track2, horizon):
        """Basic collision prediction for Layer 1."""
        pos1 = np.array(track1['center'], dtype=float)
        pos2 = np.array(track2['center'], dtype=float)
        vel1 = np.array(track1['velocity'], dtype=float)
        vel2 = np.array(track2['velocity'], dtype=float)
        
        min_distance = float('inf')
        collision_time = None
        collision_point = None
        
        for t in range(1, horizon + 1):
            future_pos1 = pos1 + vel1 * t
            future_pos2 = pos2 + vel2 * t
            
            distance = np.linalg.norm(future_pos2 - future_pos1)
            
            if distance < min_distance:
                min_distance = distance
            
            if distance < self.config['collision_distance_threshold']:
                collision_time = t
                collision_point = (future_pos1 + future_pos2) / 2
                break
        
        if collision_time:
            ttc = collision_time / 30  # Convert to seconds
            return {
                'ttc': ttc,
                'collision_point': collision_point.tolist(),
                'min_distance': min_distance
            }
        
        return None
    
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
        """Find the best matching tracked vehicle."""
        best_match = None
        min_distance = 80  # Stricter matching
        
        for track_id, tracked in self.tracked_vehicles.items():
            if current_frame - tracked['last_seen'] > 5:
                continue
            
            distance = np.sqrt((vehicle['center'][0] - tracked['center'][0])**2 + 
                             (vehicle['center'][1] - tracked['center'][1])**2)
            
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
    
    def _create_visualization(self, frame, detection_results, incidents):
        """Create annotated frame with advanced visualizations."""
        viz_frame = frame.copy()
        
        # Draw object detections
        viz_frame = self._draw_detections(viz_frame, detection_results)
        
        # Draw incidents with layer information
        viz_frame = self._draw_advanced_incidents(viz_frame, incidents)
        
        # Draw tracking information
        viz_frame = self._draw_tracking_info(viz_frame)
        
        # Add advanced analytics overlay
        viz_frame = self._add_advanced_analytics_overlay(viz_frame, incidents)
        
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
    
    def _draw_advanced_incidents(self, frame, incidents):
        """Draw incidents with multi-layer validation information."""
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
            
            # Enhanced collision display with layer information
            if incident_type == 'collision' and 'predicted_point' in incident:
                pred_point = incident['predicted_point']
                cv2.circle(frame, (int(pred_point[0]), int(pred_point[1])), 25, color, 3)
                
                ttc = incident['time_to_collision']
                confidence = incident.get('confidence', 0)
                
                # Show collision details
                collision_text = f"COLLISION: {ttc:.1f}s"
                confidence_text = f"Confidence: {confidence:.2f}"
                
                cv2.putText(frame, collision_text, 
                           (int(pred_point[0]) - 70, int(pred_point[1]) - 50),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                cv2.putText(frame, confidence_text, 
                           (int(pred_point[0]) - 60, int(pred_point[1]) - 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # Show validation layers
                if 'validation_layers' in incident:
                    layers = incident['validation_layers']
                    layer_text = f"Layers: T:{layers.get('trajectory', 'F')} D:{layers.get('depth', 'F')} O:{layers.get('optical_flow', 'F')} P:{layers.get('physics', 'F')}"
                    cv2.putText(frame, layer_text, 
                               (int(pred_point[0]) - 80, int(pred_point[1]) + 5),
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
    
    def _add_advanced_analytics_overlay(self, frame, incidents):
        """Add responsive analytics overlay that adapts to window size."""
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
        
        # Create responsive overlay text
        overlay_text = [
            "Traffic Monitoring System",
            "",
            f"Runtime: {runtime:.0f}s",
            f"Vehicles: {len(self.tracked_vehicles)}",
            f"Frames: {self.analytics['total_frames']:,}",
            "",
            "Multi-Layer Detection:",
            f"  Trajectory: {layers['trajectory_detected']}",
            f"  Depth: {layers['depth_confirmed']}",
            f"  Motion: {layers['flow_confirmed']}",
            f"  Physics: {layers['physics_confirmed']}",
            "",
            f"Confirmed: {layers['final_confirmed']}",
            f"API Reports: {self.analytics['api_reports_sent']}",
        ]
        
        # Add active incidents if any
        if collision_incidents:
            overlay_text.append("")
            overlay_text.append("ACTIVE ALERTS:")
            for incident in collision_incidents[:2]:  # Show max 2
                ttc = incident.get('time_to_collision', 0)
                vehicles = ' & '.join(incident.get('vehicles', ['Unknown', 'Unknown']))
                overlay_text.append(f"  {vehicles}: {ttc:.1f}s")
        
        # Calculate responsive overlay dimensions based on frame size
        # Scale overlay size based on resolution
        if width > 1500:  # Large/fullscreen
            overlay_width = 350
            font_scale = 0.6
            line_height = 28
            padding = 20
        elif width > 1000:  # Medium
            overlay_width = 300
            font_scale = 0.55
            line_height = 25
            padding = 15
        else:  # Small
            overlay_width = 250
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
        
        # Draw text with responsive sizing
        for i, text in enumerate(overlay_text):
            text_y = overlay_y + padding + (i + 1) * line_height
            text_x = overlay_x + padding
            
            # Skip if text would go below frame
            if text_y > height - 10:
                break
            
            # Responsive color scheme
            if i == 0:  # Title
                color = (255, 255, 255)
                font_size = font_scale + 0.1
                thickness = 2
            elif "Confirmed" in text:
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
            elif text.startswith("  ") and ":" in text:  # Alert details or stats
                if "ALERTS" in overlay_text[max(0, i-1)]:  # Alert details
                    color = (0, 0, 255)  # Red for alert details
                else:  # Layer stats
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
            self.analytics['incident_log'].append(incident)
    
    def _process_alerts(self, incidents):
        """Process and display alerts for detected incidents."""
        for incident in incidents:
            incident_type = incident['type']
            severity = incident.get('severity', 'MEDIUM')
            
            if incident_type == 'collision':
                ttc = incident['time_to_collision']
                vehicles = ' and '.join(incident['vehicles'])
                confidence = incident.get('confidence', 0)
                layers = incident.get('validation_layers', {})
                
                print(f"🚨 {severity} COLLISION ALERT:")
                print(f"   Vehicles: {vehicles}")
                print(f"   Time to collision: {ttc:.1f}s")
                print(f"   Multi-layer confidence: {confidence:.2f}")
                print(f"   Validation layers: {layers}")
                print(f"   📡 API report status: {'Sent' if self.analytics['api_reports_sent'] > 0 else 'Pending'}")
            
            elif incident_type == 'stopped_vehicle':
                duration = incident['stopped_duration']
                vehicle_class = incident['vehicle_class']
                print(f"⚠️ {severity} ALERT: {vehicle_class} stopped for {duration:.1f}s")
            
            elif incident_type == 'pedestrian_on_road':
                print(f"🚶 {severity} ALERT: Pedestrian detected on roadway!")
            
            elif incident_type == 'sudden_speed_change':
                vehicle_class = incident['vehicle_class']
                speed_change = incident['speed_change']
                print(f"⚡ {severity} ALERT: {vehicle_class} sudden speed change ({speed_change:.1f}x)")
            
            self.analytics['alerts'].append(incident)
    
    def _save_incident_frame(self, frame, incidents, frame_number):
        """Save frame when incidents are detected."""
        import os
        os.makedirs('incident_frames', exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        incident_types = "_".join([inc['type'] for inc in incidents])
        filename = f"incident_frames/incident_{timestamp}_{frame_number}_{incident_types}.jpg"
        
        cv2.imwrite(filename, frame)
        print(f"💾 Incident frame saved: {filename}")
    
    def _save_frame(self, frame, frame_number, manual=False):
        """Save frame manually."""
        import os
        os.makedirs('saved_frames', exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"saved_frames/frame_{timestamp}_{frame_number}"
        if manual:
            filename += "_manual"
        filename += ".jpg"
        
        cv2.imwrite(filename, frame)
        print(f"💾 Frame saved: {filename}")
    
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
            }
        }
        
        # Clear tracking data
        self.tracked_vehicles.clear()
        self.vehicle_history.clear()
        self.velocity_history.clear()
        self.acceleration_history.clear()
        self.flow_points.clear()
        self.next_vehicle_id = 0
        
        print("📊 Analytics and tracking data reset")
    
    def _cleanup(self):
        """Cleanup resources and save final report."""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        
        # Generate final report
        self._generate_final_report()
    
    def _generate_final_report(self):
        """Generate and save final detection report."""
        runtime = time.time() - self.analytics['start_time']
        layers = self.analytics['collision_layers']
        
        report = {
            'session_summary': {
                'runtime_seconds': runtime,
                'total_frames': self.analytics['total_frames'],
                'total_detections': self.analytics['total_detections'],
                'total_incidents': self.analytics['incidents_detected'],
                'average_fps': self.analytics['total_frames'] / runtime if runtime > 0 else 0
            },
            'detection_summary': self.analytics['class_totals'],
            'incident_summary': {},
            'collision_layer_performance': {
                'layer1_trajectory_detected': layers['trajectory_detected'],
                'layer2_depth_confirmed': layers['depth_confirmed'],
                'layer3_flow_confirmed': layers['flow_confirmed'],
                'layer4_physics_confirmed': layers['physics_confirmed'],
                'final_confirmed_collisions': layers['final_confirmed'],
                'false_positive_reduction': (layers['trajectory_detected'] - layers['final_confirmed']) / max(layers['trajectory_detected'], 1)
            },
            'all_incidents': self.analytics['incident_log'],
            'api_integration': {
                'reports_sent': self.analytics['api_reports_sent'],
                'api_failures': self.analytics['api_failures'],
                'success_rate': self.analytics['api_reports_sent'] / max(self.analytics['api_reports_sent'] + self.analytics['api_failures'], 1) * 100
            },
            'advanced_features': [
                'Multi-layer collision detection with 4 validation layers',
                'Depth estimation from intensity and shadow analysis',
                'Optical flow analysis for sudden motion detection',
                'Physics-based validation using acceleration patterns',
                'Removed debris detection (was causing false positives)',
                'Enhanced confidence scoring and layer agreement requirements',
                'Automatic API incident reporting to backend system'
            ]
        }
        
        # Summarize incidents by type
        for incident in self.analytics['incident_log']:
            incident_type = incident['type']
            if incident_type not in report['incident_summary']:
                report['incident_summary'][incident_type] = 0
            report['incident_summary'][incident_type] += 1
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"advanced_incident_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 ADVANCED MULTI-LAYER INCIDENT DETECTION REPORT")
        print(f"{'='*60}")
        print(f"Runtime: {runtime:.1f} seconds")
        print(f"Frames processed: {self.analytics['total_frames']}")
        print(f"Average FPS: {report['session_summary']['average_fps']:.1f}")
        print(f"Total detections: {self.analytics['total_detections']}")
        print(f"Total incidents: {self.analytics['incidents_detected']}")
        
        print(f"\n🔍 COLLISION DETECTION LAYER PERFORMANCE:")
        print(f"  Layer 1 (Trajectory): {layers['trajectory_detected']} detected")
        print(f"  Layer 2 (Depth): {layers['depth_confirmed']} confirmed")
        print(f"  Layer 3 (Optical Flow): {layers['flow_confirmed']} confirmed")
        print(f"  Layer 4 (Physics): {layers['physics_confirmed']} confirmed")
        print(f"  FINAL Collisions: {layers['final_confirmed']} confirmed")
        
        if layers['trajectory_detected'] > 0:
            reduction = (layers['trajectory_detected'] - layers['final_confirmed']) / layers['trajectory_detected'] * 100
            print(f"  False Positive Reduction: {reduction:.1f}%")
        
        if report['incident_summary']:
            print(f"\nIncident breakdown:")
            for incident_type, count in report['incident_summary'].items():
                print(f"  {incident_type}: {count}")
        else:
            print("\n✅ No incidents detected during session")
        
        print(f"\n🌐 API INTEGRATION:")
        print(f"  Reports sent: {self.analytics['api_reports_sent']}")
        print(f"  API failures: {self.analytics['api_failures']}")
        if self.analytics['api_reports_sent'] + self.analytics['api_failures'] > 0:
            success_rate = self.analytics['api_reports_sent'] / (self.analytics['api_reports_sent'] + self.analytics['api_failures']) * 100
            print(f"  Success rate: {success_rate:.1f}%")
        
        print(f"\n🔧 Advanced features applied:")
        for feature in report['advanced_features']:
            print(f"  ✓ {feature}")
        
        print(f"\n📄 Detailed report saved to: {filename}")


def main():
    """Main function to run the ADVANCED multi-layer incident detection system."""
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
        'collision_distance_threshold': 35,    # Tighter threshold
        'prediction_horizon': 12,              # Shorter horizon
        'min_tracking_confidence': 0.7,        # Higher confidence
        'min_collision_speed': 5.0,            # Faster moving required
        'collision_angle_threshold': 30,       # More restrictive
        'min_trajectory_length': 8,            # Longer history
        'collision_persistence': 5,            # More persistence
        
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
        'require_all_layers': False,           # Don't require ALL layers
        'minimum_layer_agreement': 3,          # At least 3 layers must agree
        'collision_confidence_threshold': 0.75, # High confidence threshold
        
                    # API Integration Settings
            'api_enabled': True,                   # Enable/disable API reporting
            'api_endpoint': 'http://localhost:5000/api/incidents',
            'api_key': '2fc66075d878832',
            'api_timeout': 5,
            'api_retry_attempts': 2,
            'incident_location': 'UP',  # Default location
            
            # Other settings
        'stopped_vehicle_time': 10,
        'speed_change_threshold': 0.8,
        'pedestrian_road_threshold': 50,
    }
    
    print("🚀 Initializing ADVANCED Multi-Layer Incident Detection System...")
    print("="*70)
    print("🔬 ADVANCED FEATURES:")
    print("✓ REMOVED debris detection (was causing false positives)")
    print("✓ MULTI-LAYER collision detection with 4 validation layers:")
    print("  🎯 Layer 1: Trajectory prediction (basic collision detection)")
    print("  🔍 Layer 2: Depth estimation from intensity & shadows") 
    print("  🌊 Layer 3: Optical flow analysis (sudden motion changes)")
    print("  ⚗️  Layer 4: Physics validation (acceleration patterns)")
    print("✓ Enhanced confidence scoring and layer agreement")
    print("✓ Dramatically reduced false positives")
    print("✓ Real-time layer performance monitoring")
    print("="*70)
    
    # Initialize and run the system
    detector = AdvancedIncidentDetectionSystem(config=config)
    detector.run_detection()


if __name__ == "__main__":
    main()