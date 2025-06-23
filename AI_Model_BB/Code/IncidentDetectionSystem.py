"""
Enhanced Incident Detection System - IMPROVED VERSION
Fixed collision detection and removed wrong direction detection
"""
import cv2
import torch
import time
import json
from datetime import datetime
import numpy as np
from collections import defaultdict, deque
import math

class IncidentDetectionSystem:
    def __init__(self, stream_url="Videos\Traffic_Video1.mp4", config=None):
        """
        Advanced incident detection system for traffic monitoring.
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
        self.history_length = 15
        
        # Incident detection components (REMOVED wrong_direction)
        self.incident_types = {
            'collision': [],
            'stopped_vehicle': [],
            'pedestrian_on_road': [],
            'debris': [],
            'sudden_speed_change': []
        }
        
        # Speed and motion analysis
        self.speed_zones = {}
        self.motion_history = deque(maxlen=30)
        
        # Analytics and logging
        self.analytics = {
            'total_frames': 0,
            'total_detections': 0,
            'incidents_detected': 0,
            'class_totals': {},
            'start_time': time.time(),
            'alerts': [],
            'incident_log': []
        }
        
        # Video capture
        self.cap = None
        self.initialize_capture()
        
        # Background subtraction for debris/obstacle detection
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            detectShadows=True, varThreshold=50, history=500
        )
        
    def _default_config(self):
        """Enhanced configuration for incident detection."""
        return {
            # YOLO settings
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4,
            'iou_threshold': 0.45,
            
            # Display and logging
            'display_window': True,
            'save_incidents': True,
            'log_detections': True,
            'frame_skip': 2,
            
            # IMPROVED COLLISION DETECTION SETTINGS
            'collision_distance_threshold': 40,  # Reduced - closer proximity needed
            'prediction_horizon': 15,            # Reduced prediction window
            'min_tracking_confidence': 0.6,      # Higher confidence required
            'min_collision_speed': 3.0,          # Both vehicles must be moving
            'collision_angle_threshold': 45,     # Vehicles must be approaching each other
            'min_trajectory_length': 5,          # Need more tracking history
            'collision_persistence': 3,          # Alert must persist for 3 frames
            
            # Incident detection thresholds
            'stopped_vehicle_time': 10,  # seconds
            'speed_change_threshold': 0.8,  # relative change
            'pedestrian_road_threshold': 50,  # pixels from road edge
            
            # Speed monitoring
            'speed_zones': {
                'highway': {'min': 45, 'max': 80},
                'city': {'min': 20, 'max': 50}
            },
            
            # Area definitions
            'road_boundaries': {
                'lanes': [(100, 200), (300, 400), (500, 600)],
                'shoulders': [(50, 100), (650, 700)]
            }
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
        """Initialize video capture with retry logic."""
        max_retries = 5
        for attempt in range(max_retries):
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                print(f"✓ Connected to stream: {self.stream_url}")
                return True
            print(f"Connection attempt {attempt+1}/{max_retries} failed...")
            time.sleep(2)
        return False
    
    def run_detection(self):
        """Main detection loop with incident analysis."""
        if not self.cap or not self.cap.isOpened():
            print("✗ Video capture not initialized")
            return
        
        print("🚀 Starting incident detection system...")
        print("Controls: 'q' = quit, 's' = save frame, 'r' = reset analytics")
        
        frame_count = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    if not self.initialize_capture():
                        break
                    continue
                
                frame_count += 1
                if frame_count % self.config['frame_skip'] != 0:
                    continue
                
                # Core object detection
                detection_results = self._detect_objects(frame)
                
                # Vehicle tracking and trajectory analysis
                tracking_results = self._update_vehicle_tracking(detection_results['detections'])
                
                # Incident detection pipeline (NO MORE WRONG DIRECTION)
                incidents = self._detect_incidents(frame, detection_results, tracking_results)
                
                # Update analytics
                self._update_analytics(detection_results, incidents)
                
                # Generate alerts
                self._process_alerts(incidents)
                
                # Create visualization
                annotated_frame = self._create_visualization(frame, detection_results, incidents)
                
                # Display and save
                if self.config['display_window']:
                    cv2.imshow("Incident Detection System", annotated_frame)
                
                if self.config['save_incidents'] and incidents:
                    self._save_incident_frame(annotated_frame, incidents, frame_count)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self._save_frame(annotated_frame, frame_count, manual=True)
                elif key == ord('r'):
                    self._reset_analytics()
                
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
        """Update vehicle tracking across frames."""
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
        
        # Update velocities and trajectories
        self._calculate_velocities(matched_ids)
        
        return {'active_tracks': matched_ids}
    
    def _detect_incidents(self, frame, detection_results, tracking_results):
        """Main incident detection pipeline - REMOVED WRONG DIRECTION."""
        incidents = []
        current_frame = self.analytics['total_frames']
        
        # 1. IMPROVED Collision Detection (trajectory-based)
        collision_incidents = self._detect_smart_collisions(tracking_results['active_tracks'])
        incidents.extend(collision_incidents)
        
        # 2. Stopped Vehicle Detection
        stopped_incidents = self._detect_stopped_vehicles(current_frame)
        incidents.extend(stopped_incidents)
        
        # 3. REMOVED: Wrong Direction Detection
        # (No longer detecting wrong direction since camera can see both lanes)
        
        # 4. Pedestrian on Road Detection
        pedestrian_incidents = self._detect_pedestrians_on_road(detection_results['detections'])
        incidents.extend(pedestrian_incidents)
        
        # 5. Debris/Obstacle Detection
        debris_incidents = self._detect_debris(frame)
        incidents.extend(debris_incidents)
        
        # 6. Sudden Speed Change Detection
        speed_incidents = self._detect_speed_anomalies()
        incidents.extend(speed_incidents)
        
        return incidents
    
    def _detect_smart_collisions(self, active_tracks):
        """
        IMPROVED collision detection with smarter logic to reduce false positives.
        """
        incidents = []
        prediction_horizon = self.config['prediction_horizon']
        min_trajectory_length = self.config['min_trajectory_length']
        
        for i, track1_id in enumerate(active_tracks):
            for track2_id in active_tracks[i+1:]:
                track1 = self.tracked_vehicles.get(track1_id)
                track2 = self.tracked_vehicles.get(track2_id)
                
                # Skip if either vehicle doesn't have enough data
                if not self._is_collision_candidate(track1, track2, min_trajectory_length):
                    continue
                
                # Check if vehicles are actually approaching each other
                if not self._are_vehicles_approaching(track1, track2):
                    continue
                
                # Predict collision with improved logic
                collision_data = self._predict_smart_collision(track1, track2, prediction_horizon)
                if collision_data:
                    # Check collision persistence (reduce flicker)
                    collision_key = f"{track1_id}_{track2_id}"
                    
                    # Initialize collision counter if not exists
                    if not hasattr(self, 'collision_counters'):
                        self.collision_counters = {}
                    
                    if collision_key not in self.collision_counters:
                        self.collision_counters[collision_key] = 0
                    
                    self.collision_counters[collision_key] += 1
                    
                    # Only alert after collision persists for required frames
                    if self.collision_counters[collision_key] >= self.config['collision_persistence']:
                        incidents.append({
                            'type': 'collision',
                            'severity': collision_data['severity'],
                            'time_to_collision': collision_data['ttc'],
                            'vehicles': [track1['class'], track2['class']],
                            'vehicle_ids': [track1_id, track2_id],
                            'positions': [track1['center'], track2['center']],
                            'predicted_point': collision_data['collision_point'],
                            'approach_angle': collision_data['approach_angle'],
                            'relative_speed': collision_data['relative_speed'],
                            'confidence': collision_data['confidence'],
                            'timestamp': datetime.now().isoformat()
                        })
                else:
                    # Reset counter if no collision detected
                    collision_key = f"{track1_id}_{track2_id}"
                    if hasattr(self, 'collision_counters') and collision_key in self.collision_counters:
                        self.collision_counters[collision_key] = 0
        
        return incidents
    
    def _is_collision_candidate(self, track1, track2, min_trajectory_length):
        """Check if two vehicles are candidates for collision detection."""
        if not track1 or not track2:
            return False
        
        # Both vehicles must have velocity data
        if not track1.get('velocity') or not track2.get('velocity'):
            return False
        
        # Both vehicles must have sufficient tracking history
        hist1 = self.vehicle_history.get(track1['id'], [])
        hist2 = self.vehicle_history.get(track2['id'], [])
        
        if len(hist1) < min_trajectory_length or len(hist2) < min_trajectory_length:
            return False
        
        # Both vehicles must be moving at minimum speed
        speed1 = track1.get('speed', 0)
        speed2 = track2.get('speed', 0)
        min_speed = self.config['min_collision_speed']
        
        if speed1 < min_speed or speed2 < min_speed:
            return False
        
        return True
    
    def _are_vehicles_approaching(self, track1, track2):
        """
        Check if two vehicles are actually approaching each other.
        This reduces false positives from vehicles in parallel lanes.
        """
        pos1 = np.array(track1['center'])
        pos2 = np.array(track2['center'])
        vel1 = np.array(track1['velocity'])
        vel2 = np.array(track2['velocity'])
        
        # Vector from vehicle 1 to vehicle 2
        relative_pos = pos2 - pos1
        
        # Relative velocity (how fast they're approaching)
        relative_vel = vel2 - vel1
        
        # Check if relative velocity is pointing towards each other
        # (dot product of relative position and relative velocity should be negative)
        approach_rate = np.dot(relative_pos, relative_vel)
        
        # Also check if they're within reasonable angular approach
        if np.linalg.norm(relative_pos) > 0 and np.linalg.norm(relative_vel) > 0:
            cos_angle = approach_rate / (np.linalg.norm(relative_pos) * np.linalg.norm(relative_vel))
            cos_angle = np.clip(cos_angle, -1, 1)  # Handle numerical errors
            angle = math.degrees(math.acos(abs(cos_angle)))
            
            # Vehicles must be approaching within reasonable angle
            if angle > self.config['collision_angle_threshold']:
                return False
        
        # They are approaching if approach_rate is negative (getting closer)
        return approach_rate < -1.0  # Threshold for approach rate
    
    def _predict_smart_collision(self, track1, track2, horizon):
        """
        Improved collision prediction with better physics and confidence scoring.
        """
        pos1 = np.array(track1['center'], dtype=float)
        pos2 = np.array(track2['center'], dtype=float)
        vel1 = np.array(track1['velocity'], dtype=float)
        vel2 = np.array(track2['velocity'], dtype=float)
        
        min_distance = float('inf')
        collision_time = None
        collision_point = None
        closest_approach_time = None
        
        # Check each future time step
        for t in range(1, horizon + 1):
            # Predict future positions
            future_pos1 = pos1 + vel1 * t
            future_pos2 = pos2 + vel2 * t
            
            # Distance at this time step
            distance = np.linalg.norm(future_pos2 - future_pos1)
            
            if distance < min_distance:
                min_distance = distance
                closest_approach_time = t
            
            # Check for collision
            if distance < self.config['collision_distance_threshold']:
                collision_time = t
                collision_point = (future_pos1 + future_pos2) / 2
                break
        
        if collision_time:
            ttc = collision_time / 30  # Convert to seconds (assume 30 FPS)
            
            # Calculate additional metrics for confidence
            current_distance = np.linalg.norm(pos2 - pos1)
            relative_speed = np.linalg.norm(vel2 - vel1)
            
            # Calculate approach angle
            relative_pos = pos2 - pos1
            relative_vel = vel2 - vel1
            
            if np.linalg.norm(relative_pos) > 0 and np.linalg.norm(relative_vel) > 0:
                cos_angle = np.dot(relative_pos, relative_vel) / (np.linalg.norm(relative_pos) * np.linalg.norm(relative_vel))
                cos_angle = np.clip(cos_angle, -1, 1)
                approach_angle = math.degrees(math.acos(abs(cos_angle)))
            else:
                approach_angle = 90
            
            # Calculate confidence based on multiple factors
            confidence = self._calculate_collision_confidence(
                ttc, current_distance, relative_speed, approach_angle, min_distance
            )
            
            # Only return high-confidence collisions
            if confidence > 0.6:  # Threshold for collision confidence
                severity = self._determine_collision_severity(ttc, relative_speed, confidence)
                
                return {
                    'ttc': ttc,
                    'severity': severity,
                    'collision_point': collision_point.tolist(),
                    'min_distance': min_distance,
                    'approach_angle': approach_angle,
                    'relative_speed': relative_speed,
                    'confidence': confidence
                }
        
        return None
    
    def _calculate_collision_confidence(self, ttc, current_distance, relative_speed, approach_angle, min_distance):
        """
        Calculate confidence score for collision prediction based on multiple factors.
        """
        confidence = 0.0
        
        # Time factor: shorter time = higher confidence
        if ttc <= 1.0:
            confidence += 0.4
        elif ttc <= 2.0:
            confidence += 0.3
        elif ttc <= 3.0:
            confidence += 0.2
        
        # Distance factor: closer vehicles = higher confidence
        if current_distance < 100:
            confidence += 0.2
        elif current_distance < 150:
            confidence += 0.1
        
        # Speed factor: higher relative speed = higher confidence
        if relative_speed > 10:
            confidence += 0.2
        elif relative_speed > 5:
            confidence += 0.1
        
        # Angle factor: head-on approach = higher confidence
        if approach_angle < 30:
            confidence += 0.2
        elif approach_angle < 60:
            confidence += 0.1
        
        # Minimum distance factor
        if min_distance < 20:
            confidence += 0.1
        
        return min(confidence, 1.0)  # Cap at 1.0
    
    def _determine_collision_severity(self, ttc, relative_speed, confidence):
        """Determine collision severity based on time, speed, and confidence."""
        if ttc < 1.0 and relative_speed > 10 and confidence > 0.8:
            return 'CRITICAL'
        elif ttc < 2.0 and confidence > 0.7:
            return 'HIGH'
        elif ttc < 3.0 and confidence > 0.6:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _detect_stopped_vehicles(self, current_frame):
        """Detect vehicles that have been stationary for too long."""
        incidents = []
        stopped_threshold = self.config['stopped_vehicle_time'] * 30  # Assume 30 FPS
        
        for track_id, vehicle in self.tracked_vehicles.items():
            if 'velocity' not in vehicle or vehicle['velocity'] is None:
                continue
            
            # Calculate if vehicle has been essentially stationary
            speed = np.sqrt(vehicle['velocity'][0]**2 + vehicle['velocity'][1]**2)
            
            if speed < 2:  # Very low speed threshold
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
                        'stopped_duration': stopped_duration / 30,  # Convert to seconds
                        'timestamp': datetime.now().isoformat()
                    })
            else:
                # Reset stopped timer if vehicle is moving
                vehicle.pop('stopped_since', None)
        
        return incidents
    
    # REMOVED: _detect_wrong_direction method entirely
    
    def _detect_pedestrians_on_road(self, detections):
        """Detect pedestrians in dangerous road areas."""
        incidents = []
        
        pedestrians = [d for d in detections if d['class'] == 'person']
        
        for pedestrian in pedestrians:
            x, y = pedestrian['center']
            
            # Check if pedestrian is in the main road area
            if self._is_in_road_area(x, y):
                incidents.append({
                    'type': 'pedestrian_on_road',
                    'severity': 'HIGH',
                    'position': pedestrian['center'],
                    'confidence': pedestrian['confidence'],
                    'timestamp': datetime.now().isoformat()
                })
        
        return incidents
    
    def _detect_debris(self, frame):
        """Detect debris or obstacles using background subtraction."""
        incidents = []
        
        # Apply background subtraction
        fg_mask = self.bg_subtractor.apply(frame)
        
        # Clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Look for medium-sized objects that might be debris
            if 500 < area < 5000:  # Adjust based on camera resolution
                x, y, w, h = cv2.boundingRect(contour)
                
                # Check if it's in the road area and not already detected as a vehicle
                if self._is_in_road_area(x + w//2, y + h//2) and not self._is_existing_vehicle(x, y, w, h):
                    incidents.append({
                        'type': 'debris',
                        'severity': 'MEDIUM',
                        'position': [x + w//2, y + h//2],
                        'bbox': [x, y, w, h],
                        'area': area,
                        'timestamp': datetime.now().isoformat()
                    })
        
        return incidents
    
    def _detect_speed_anomalies(self):
        """Detect sudden speed changes or unusual speeds."""
        incidents = []
        
        for track_id, vehicle in self.tracked_vehicles.items():
            if 'velocity' not in vehicle or 'speed_history' not in vehicle:
                continue
            
            current_speed = vehicle.get('speed', 0)
            speed_history = vehicle.get('speed_history', [])
            
            if len(speed_history) >= 5:
                # Detect sudden speed changes
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
    
    # Helper methods (unchanged)
    def _find_best_match(self, vehicle, current_frame):
        """Find the best matching tracked vehicle."""
        best_match = None
        min_distance = 100  # Maximum matching distance
        
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
    
    def _calculate_velocities(self, active_tracks):
        """Calculate velocities for tracked vehicles."""
        for track_id in active_tracks:
            history = self.vehicle_history.get(track_id, [])
            if len(history) < 2:
                continue
            
            # Calculate velocity from last two positions
            current_pos = history[-1]
            prev_pos = history[-2]
            
            vx = current_pos[0] - prev_pos[0]
            vy = current_pos[1] - prev_pos[1]
            
            # Smooth velocity if previous velocity exists
            vehicle = self.tracked_vehicles[track_id]
            if vehicle.get('velocity'):
                old_vx, old_vy = vehicle['velocity']
                alpha = 0.7
                vx = alpha * vx + (1 - alpha) * old_vx
                vy = alpha * vy + (1 - alpha) * old_vy
            
            vehicle['velocity'] = [vx, vy]
            vehicle['speed'] = np.sqrt(vx**2 + vy**2)
            
            # Update speed history
            if 'speed_history' not in vehicle:
                vehicle['speed_history'] = []
            vehicle['speed_history'].append(vehicle['speed'])
            if len(vehicle['speed_history']) > 10:
                vehicle['speed_history'].pop(0)
    
    def _is_in_road_area(self, x, y):
        """Check if a point is in the main road area."""
        frame_width = 1280  # Adjust based on your resolution
        frame_height = 720
        
        # Assume road is in the middle portion of the frame
        road_left = frame_width * 0.1
        road_right = frame_width * 0.9
        road_top = frame_height * 0.3
        road_bottom = frame_height * 0.8
        
        return road_left <= x <= road_right and road_top <= y <= road_bottom
    
    def _is_existing_vehicle(self, x, y, w, h):
        """Check if a bounding box overlaps with existing vehicle detections."""
        center_x, center_y = x + w//2, y + h//2
        
        for vehicle in self.tracked_vehicles.values():
            vx, vy = vehicle['center']
            distance = np.sqrt((center_x - vx)**2 + (center_y - vy)**2)
            if distance < 50:  # Close enough to be the same object
                return True
        
        return False
    
    def _create_visualization(self, frame, detection_results, incidents):
        """Create annotated frame with all visualizations."""
        viz_frame = frame.copy()
        
        # Draw object detections
        viz_frame = self._draw_detections(viz_frame, detection_results)
        
        # Draw incidents
        viz_frame = self._draw_incidents(viz_frame, incidents)
        
        # Draw tracking information
        viz_frame = self._draw_tracking_info(viz_frame)
        
        # Add analytics overlay
        viz_frame = self._add_analytics_overlay(viz_frame, incidents)
        
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
            
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        return frame
    
    def _draw_incidents(self, frame, incidents):
        """Draw incident markers and alerts."""
        for incident in incidents:
            incident_type = incident['type']
            severity = incident.get('severity', 'MEDIUM')
            
            # Color based on severity
            if severity == 'CRITICAL':
                color = (0, 0, 139)      # Dark Red
            elif severity == 'HIGH':
                color = (0, 0, 255)      # Red
            elif severity == 'MEDIUM':
                color = (0, 165, 255)    # Orange
            else:
                color = (0, 255, 255)    # Yellow
            
            # Draw incident marker
            if 'position' in incident:
                pos = incident['position']
                cv2.circle(frame, (int(pos[0]), int(pos[1])), 15, color, -1)
                cv2.circle(frame, (int(pos[0]), int(pos[1])), 20, color, 3)
                
                # Add incident type label
                label = f"{incident_type.upper()}"
                cv2.putText(frame, label, (int(pos[0]) - 40, int(pos[1]) - 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Special handling for IMPROVED collisions
            if incident_type == 'collision' and 'predicted_point' in incident:
                pred_point = incident['predicted_point']
                cv2.circle(frame, (int(pred_point[0]), int(pred_point[1])), 25, (0, 0, 255), 3)
                
                ttc = incident['time_to_collision']
                confidence = incident.get('confidence', 0)
                
                # Enhanced collision display
                collision_text = f"COLLISION: {ttc:.1f}s"
                confidence_text = f"Conf: {confidence:.1f}"
                
                cv2.putText(frame, collision_text, 
                           (int(pred_point[0]) - 70, int(pred_point[1]) - 40),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                cv2.putText(frame, confidence_text, 
                           (int(pred_point[0]) - 40, int(pred_point[1]) - 15),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        return frame
    
    def _draw_tracking_info(self, frame):
        """Draw vehicle tracking trajectories."""
        for track_id, history in self.vehicle_history.items():
            if len(history) < 2:
                continue
            
            # Draw trajectory
            for i in range(1, len(history)):
                pt1 = tuple(map(int, history[i-1]))
                pt2 = tuple(map(int, history[i]))
                cv2.line(frame, pt1, pt2, (0, 255, 0), 2)
            
            # Draw vehicle ID and speed
            if history:
                last_pos = history[-1]
                vehicle = self.tracked_vehicles.get(track_id)
                if vehicle:
                    speed = vehicle.get('speed', 0)
                    cv2.putText(frame, f"ID:{track_id}", 
                               (int(last_pos[0]) + 10, int(last_pos[1]) - 25),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                    cv2.putText(frame, f"Speed:{speed:.1f}", 
                               (int(last_pos[0]) + 10, int(last_pos[1]) - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        return frame
    
    def _add_analytics_overlay(self, frame, incidents):
        """Add comprehensive analytics overlay."""
        height, width = frame.shape[:2]
        
        # Create incident summary
        incident_counts = defaultdict(int)
        for incident in incidents:
            incident_counts[incident['type']] += 1
        
        # Runtime statistics
        runtime = time.time() - self.analytics['start_time']
        
        overlay_text = [
            f"Runtime: {runtime:.0f}s",
            f"Frames: {self.analytics['total_frames']}",
            f"Active Tracks: {len(self.tracked_vehicles)}",
            f"Total Incidents: {self.analytics['incidents_detected']}",
            "",
            "CURRENT INCIDENTS:",
        ]
        
        # Add current incidents
        if incidents:
            for incident_type, count in incident_counts.items():
                severity_color = self._get_severity_display(incidents, incident_type)
                overlay_text.append(f"  {incident_type}: {count} {severity_color}")
        else:
            overlay_text.append("  None detected")
        
        # Add improved collision stats
        if hasattr(self, 'collision_counters'):
            active_collisions = sum(1 for count in self.collision_counters.values() if count > 0)
            overlay_text.append("")
            overlay_text.append(f"Collision Tracking:")
            overlay_text.append(f"  Active: {active_collisions}")
        
        # Draw overlay background
        overlay_height = len(overlay_text) * 25 + 30
        cv2.rectangle(frame, (width - 350, 10), (width - 10, overlay_height), 
                     (0, 0, 0), -1)
        cv2.rectangle(frame, (width - 350, 10), (width - 10, overlay_height), 
                     (255, 255, 255), 2)
        
        # Draw text
        for i, text in enumerate(overlay_text):
            if "CRITICAL" in text:
                color = (0, 0, 139)  # Dark red
            elif "HIGH" in text:
                color = (0, 0, 255)  # Red
            elif "MEDIUM" in text:
                color = (0, 165, 255)  # Orange
            else:
                color = (255, 255, 255)  # White
                
            cv2.putText(frame, text, (width - 340, 35 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        return frame
    
    def _get_severity_display(self, incidents, incident_type):
        """Get severity indicator for display."""
        for incident in incidents:
            if incident['type'] == incident_type:
                return f"[{incident.get('severity', 'MEDIUM')}]"
        return ""
    
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
            
            # Create alert message
            if incident_type == 'collision':
                ttc = incident['time_to_collision']
                vehicles = ' and '.join(incident['vehicles'])
                confidence = incident.get('confidence', 0)
                relative_speed = incident.get('relative_speed', 0)
                
                print(f"🚨 {severity} COLLISION ALERT:")
                print(f"   Vehicles: {vehicles}")
                print(f"   Time to collision: {ttc:.1f}s")
                print(f"   Confidence: {confidence:.2f}")
                print(f"   Relative speed: {relative_speed:.1f}")
            
            elif incident_type == 'stopped_vehicle':
                duration = incident['stopped_duration']
                vehicle_class = incident['vehicle_class']
                print(f"⚠️ {severity} ALERT: {vehicle_class} stopped for {duration:.1f}s")
            
            elif incident_type == 'pedestrian_on_road':
                print(f"🚶 {severity} ALERT: Pedestrian detected on roadway!")
            
            elif incident_type == 'debris':
                area = incident['area']
                print(f"🗑️ {severity} ALERT: Possible debris detected (area: {area} pixels)")
            
            elif incident_type == 'sudden_speed_change':
                vehicle_class = incident['vehicle_class']
                speed_change = incident['speed_change']
                print(f"⚡ {severity} ALERT: {vehicle_class} sudden speed change ({speed_change:.1f}x)")
            
            # Add to alerts list
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
            'incident_log': []
        }
        
        # Clear tracking data
        self.tracked_vehicles.clear()
        self.vehicle_history.clear()
        self.next_vehicle_id = 0
        
        # Clear collision counters
        if hasattr(self, 'collision_counters'):
            self.collision_counters.clear()
        
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
            'all_incidents': self.analytics['incident_log'],
            'improvements_applied': [
                'Removed wrong direction detection (bidirectional road support)',
                'Enhanced collision detection with approach angle analysis',
                'Added collision confidence scoring',
                'Implemented collision persistence filtering',
                'Added minimum speed requirements for collision detection',
                'Improved trajectory length requirements'
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
        filename = f"incident_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print(f"\n{'='*50}")
        print("🏁 IMPROVED INCIDENT DETECTION REPORT")
        print(f"{'='*50}")
        print(f"Runtime: {runtime:.1f} seconds")
        print(f"Frames processed: {self.analytics['total_frames']}")
        print(f"Average FPS: {report['session_summary']['average_fps']:.1f}")
        print(f"Total detections: {self.analytics['total_detections']}")
        print(f"Total incidents: {self.analytics['incidents_detected']}")
        
        if report['incident_summary']:
            print(f"\nIncident breakdown:")
            for incident_type, count in report['incident_summary'].items():
                print(f"  {incident_type}: {count}")
        else:
            print("\n✅ No incidents detected during session")
        
        print(f"\n🔧 Improvements applied:")
        for improvement in report['improvements_applied']:
            print(f"  ✓ {improvement}")
        
        print(f"\n📄 Detailed report saved to: {filename}")


def main():
    """Main function to run the IMPROVED incident detection system."""
    # Enhanced configuration for incident detection
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
        
        # IMPROVED COLLISION DETECTION SETTINGS
        'collision_distance_threshold': 40,    # Closer proximity needed
        'prediction_horizon': 15,              # Shorter prediction window  
        'min_tracking_confidence': 0.6,        # Higher confidence required
        'min_collision_speed': 3.0,            # Both vehicles must be moving
        'collision_angle_threshold': 45,       # Vehicles must be approaching
        'min_trajectory_length': 5,            # More tracking history needed
        'collision_persistence': 3,            # Alert must persist for 3 frames
        
        # Other incident detection thresholds
        'stopped_vehicle_time': 8,      # seconds before alert
        'speed_change_threshold': 0.7,  # relative speed change
        'pedestrian_road_threshold': 50,
        
        # Speed monitoring
        'speed_zones': {
            'highway': {'min': 45, 'max': 80},
            'city': {'min': 20, 'max': 50}
        }
    }
    
    print("🚀 Initializing IMPROVED Incident Detection System...")
    print("="*60)
    print("🔧 IMPROVEMENTS APPLIED:")
    print("✓ REMOVED wrong direction detection (bidirectional road support)")
    print("✓ ENHANCED collision detection with smarter logic:")
    print("  - Approach angle analysis")
    print("  - Collision confidence scoring") 
    print("  - Persistence filtering (reduces false positives)")
    print("  - Minimum speed requirements")
    print("  - Better trajectory analysis")
    print("✓ Stopped vehicle detection")
    print("✓ Pedestrian safety monitoring") 
    print("✓ Debris/obstacle detection")
    print("✓ Speed anomaly detection")
    print("✓ Real-time alerting and logging")
    print("="*60)
    
    # Initialize and run the system
    detector = IncidentDetectionSystem(config=config)
    detector.run_detection()


if __name__ == "__main__":
    main()