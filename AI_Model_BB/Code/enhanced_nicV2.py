"""
Fixed Enhanced Network Interface Camera (NIC) V2
"""
import cv2
import torch
import time
import json
from datetime import datetime
import numpy as np
from collections import defaultdict

class EnhancedNIC:
    def __init__(self, stream_url="http://127.0.0.1:8080/", config=None):
        """
        Initialize Enhanced NIC with configurable settings.
        
        Args:
            stream_url: Video stream URL (will be set by streamlink)
            config: Configuration dictionary
        """
        self.stream_url = stream_url
        self.config = config or self._default_config()
          # Initialize detector
        self.model = self._load_model()
        self.target_classes = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
        # Collision detection tracking
        self.previous_detections = []
        self.collision_threshold = 50  # pixels - minimum distance for collision detection
        self.stationary_threshold = 10  # pixels - threshold for stationary detection
        self.traffic_density_zones = []  # For traffic monitoring
        
        # Vehicle tracking for trajectory prediction
        self.tracked_vehicles = {}
        self.vehicle_history = {}
        self.next_vehicle_id = 0
        self.history_length = 10  # Number of frames to keep in history
        
        # Analytics
        self.analytics = {
            'total_frames': 0,
            'total_detections': 0,
            'class_totals': {},
            'start_time': time.time(),
            'alerts': [],
            'collisions_detected': 0,
            'traffic_density': 'LOW',
            'stationary_vehicles': 0
        }
        
        # Video capture
        self.cap = None
        self.initialize_capture()
        
    def _load_model(self):
        """Load the best available YOLO model."""
        try:
            # Try YOLOv8 first
            from ultralytics import YOLO
            model = YOLO(f"{self.config['model_version']}.pt")
            print(f"✓ Loaded YOLOv8 model: {self.config['model_version']}")
            self.model_type = 'yolov8'
            return model
        except ImportError:
            try:
                # Fallback to YOLOv5
                model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
                print("✓ Loaded YOLOv5 model (fallback)")
                self.model_type = 'yolov5'
                return model
            except Exception as e:
                print(f"✗ Failed to load any model: {e}")
                return None
    def _default_config(self):
        """Default configuration settings."""
        return {
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4,
            'iou_threshold': 0.45,
            'display_window': True,
            'save_frames': False,
            'alert_thresholds': {
                'person': 1,  # Alert if more than 1 people detected
                'car': 2,    # Alert if more than 2 cars detected
            },
            'log_detections': True,
            'frame_skip': 3,  # Process every 3rd frame for performance
            # Collision detection settings
            'collision_detection': True,
            'collision_distance_threshold': 50,  # pixels
            'stationary_time_threshold': 5,  # seconds
            # Traffic monitoring settings
            'traffic_monitoring': True,
            'traffic_density_thresholds': {
                'low': 5,    # vehicles per frame
                'medium': 15,
                'high': 25
            },
            # Highway traffic specific settings
            'highway_mode': True,
            'trajectory_prediction': True,
            'prediction_horizon': 15,  # Frames to look ahead
            'highway_collision_threshold': 40,  # Distance threshold for predicted collisions
            'min_tracking_confidence': 0.5,  # Minimum confidence for tracking
            'min_trajectory_length': 3,  # Minimum trajectory length for prediction
            'visualize_trajectories': True,  # Show predicted paths
        }
    
    def initialize_capture(self):
        """Initialize video capture with retry logic."""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                print(f"Successfully connected to stream: {self.stream_url}")
                
                # Set buffer size to reduce latency
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                return True
            
            retry_count += 1
            print(f"Connection attempt {retry_count}/{max_retries} failed. Retrying...")
            time.sleep(2)
        
        print("Failed to connect to stream after multiple attempts.")
        return False
    
    def run_detection(self):
        """Main detection loop with enhanced features."""
        if not self.cap or not self.cap.isOpened():
            print("Video capture not initialized properly.")
            return
        
        print("Starting enhanced detection...")
        print("Press 'q' to quit, 's' to save frame, 'r' to reset analytics")
        
        frame_count = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("Failed to grab frame. Attempting to reconnect...")
                    if not self.initialize_capture():
                        break
                    continue
                  # Skip frames for performance if configured
                frame_count += 1
                if frame_count % self.config['frame_skip'] != 0:
                    continue
                  # Perform detection
                results = self._detect_objects(frame)
                
                # Track vehicles for trajectory prediction (better for highways)
                if self.config.get('highway_mode', True) and self.config.get('trajectory_prediction', True):
                    trajectory_results = self._track_and_predict_collisions(results['detections'], frame)
                    results['trajectory_alerts'] = trajectory_results['alerts']
                    frame = trajectory_results['frame']  # Updated frame with visualizations
                # Traditional collision detection (as fallback)
                elif self.config.get('collision_detection', True):
                    collision_alerts = self._detect_collisions(results['detections'])
                    results['collision_alerts'] = collision_alerts
                
                # Traffic density analysis
                if self.config.get('traffic_monitoring', True):
                    traffic_info = self._analyze_traffic(results['detections'])
                    results['traffic_info'] = traffic_info
                
                # Update analytics
                self._update_analytics(results)
                
                # Check for alerts (including collisions and traffic)
                self._check_alerts(results)
                
                # Draw enhanced visualization
                annotated_frame = self._draw_detections(frame, results)
                
                # Add analytics overlay
                annotated_frame = self._add_analytics_overlay(annotated_frame)
                
                # Display frame
                if self.config['display_window']:
                    cv2.imshow("Enhanced Traffic Detection", annotated_frame)
                
                # Save frame if configured
                if self.config['save_frames']:
                    self._save_frame(annotated_frame, frame_count)
                
                # Log detections
                if self.config['log_detections'] and results['total_count'] > 0:
                    self._log_detection(results)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self._save_frame(annotated_frame, frame_count, manual=True)
                elif key == ord('r'):
                    self._reset_analytics()
                
        except KeyboardInterrupt:
            print("\\nDetection interrupted by user.")
        finally:
            self._cleanup()
    
    def _detect_objects(self, frame):
        """Perform object detection."""
        start_time = time.time()
        
        if self.model is None:
            return {'detections': [], 'total_count': 0, 'class_counts': {}, 'processing_time': 0, 'fps': 0}
        
        try:
            if self.model_type == 'yolov8':
                results = self.model(frame, conf=self.config['confidence_threshold'], verbose=False)
                detections = self._process_yolov8_results(results[0])
            else:  # yolov5
                results = self.model(frame)
                detections = self._process_yolov5_results(results)
                
            # Calculate performance metrics
            processing_time = time.time() - start_time
            
            # Count by class
            class_counts = defaultdict(int)
            for detection in detections:
                class_counts[detection['class']] += 1
            
            return {
                'detections': detections,
                'total_count': len(detections),
                'class_counts': dict(class_counts),
                'processing_time': processing_time,
                'fps': 1.0 / processing_time if processing_time > 0 else 0
            }
        except Exception as e:
            print(f"Detection error: {e}")
            return {'detections': [], 'total_count': 0, 'class_counts': {}, 'processing_time': 0, 'fps': 0}
    
    def _process_yolov8_results(self, results):
        """Process YOLOv8 results format."""
        detections = []
        if results.boxes is not None:
            boxes = results.boxes.xyxy.cpu().numpy()
            confidences = results.boxes.conf.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy()
            
            for i, (box, conf, cls) in enumerate(zip(boxes, confidences, classes)):
                class_name = results.names[int(cls)]
                if class_name in self.target_classes:
                    x1, y1, x2, y2 = map(int, box)
                    detections.append({
                        'bbox': [x1, y1, x2 - x1, y2 - y1],
                        'confidence': float(conf),
                        'class': class_name,                        'center': [(x1 + x2) // 2, (y1 + y2) // 2]
                    })
        return detections
    
    def _detect_collisions(self, detections):
        """Detect potential collisions between vehicles."""
        collision_alerts = []
        vehicles = [d for d in detections if d['class'] in ['car', 'truck', 'bus', 'motorcycle']]
        
        for i, vehicle1 in enumerate(vehicles):
            for j, vehicle2 in enumerate(vehicles[i+1:], i+1):
                # Calculate distance between vehicle centers
                x1, y1 = vehicle1['center']
                x2, y2 = vehicle2['center']
                distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                
                # Check if vehicles are too close (potential collision)
                if distance < self.config['collision_distance_threshold']:
                    collision_alert = {
                        'type': 'collision_warning',
                        'vehicles': [vehicle1['class'], vehicle2['class']],
                        'distance': distance,
                        'positions': [(x1, y1), (x2, y2)],
                        'timestamp': datetime.now().isoformat()
                    }
                    collision_alerts.append(collision_alert)
                    
        return collision_alerts
    
    def _analyze_traffic(self, detections):
        """Analyze traffic density and flow."""
        vehicles = [d for d in detections if d['class'] in ['car', 'truck', 'bus', 'motorcycle']]
        vehicle_count = len(vehicles)
        
        # Determine traffic density
        thresholds = self.config['traffic_density_thresholds']
        if vehicle_count <= thresholds['low']:
            density = 'LOW'
        elif vehicle_count <= thresholds['medium']:
            density = 'MEDIUM'
        else:
            density = 'HIGH'
        
        # Update analytics
        self.analytics['traffic_density'] = density
        
        traffic_info = {
            'vehicle_count': vehicle_count,
            'density': density,
            'congestion_level': self._calculate_congestion(vehicles)
        }
        
        return traffic_info
    
    def _calculate_congestion(self, vehicles):
        """Calculate congestion level based on vehicle spacing."""
        if len(vehicles) < 2:
            return 'NONE'
        
        # Calculate average distance between vehicles
        distances = []
        for i, v1 in enumerate(vehicles):
            for v2 in vehicles[i+1:]:
                x1, y1 = v1['center']
                x2, y2 = v2['center']
                distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                distances.append(distance)
        
        if distances:
            avg_distance = np.mean(distances)
            if avg_distance < 80:
                return 'HIGH'
            elif avg_distance < 150:
                return 'MEDIUM'
            else:
                return 'LOW'
        
        return 'NONE'
    
    def _process_yolov5_results(self, results):
        """Process YOLOv5 results format."""
        detections = []
        df = results.pandas().xyxy[0]
        
        for _, row in df.iterrows():
            if row['name'] in self.target_classes and row['confidence'] >= self.config['confidence_threshold']:
                x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
                detections.append({
                    'bbox': [x1, y1, x2 - x1, y2 - y1],
                    'confidence': float(row['confidence']),
                    'class': row['name'],
                    'center': [(x1 + x2) // 2, (y1 + y2) // 2]
                })
        return detections
    
    def _draw_detections(self, frame, results):
        """Draw detection visualization."""
        annotated_frame = frame.copy()
        detections = results['detections']
        
        # Color map for different classes
        colors = {
            'person': (255, 0, 0),      # Blue
            'car': (0, 255, 0),        # Green
            'truck': (0, 0, 255),      # Red
            'bus': (255, 255, 0),      # Cyan
            'motorcycle': (255, 0, 255), # Magenta
            'bicycle': (0, 255, 255)   # Yellow
        }
        
        for detection in detections:
            x, y, w, h = detection['bbox']
            class_name = detection['class']
            confidence = detection['confidence']
            
            color = colors.get(class_name, (128, 128, 128))
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), color, 2)
            
            # Draw label with confidence
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(annotated_frame, (x, y - label_size[1] - 10), 
                         (x + label_size[0], y), color, -1)
            cv2.putText(annotated_frame, label, (x, y - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Draw performance info
        fps = results['fps']
        total_count = results['total_count']
        cv2.putText(annotated_frame, f"FPS: {fps:.1f} | Objects: {total_count}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Draw class counts
        y_offset = 60
        for class_name, count in results['class_counts'].items():
            cv2.putText(annotated_frame, f"{class_name}: {count}", 
                       (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_offset += 25
        
        return annotated_frame
    
    def _update_analytics(self, results):
        """Update detection analytics."""
        self.analytics['total_frames'] += 1
        self.analytics['total_detections'] += results['total_count']
        
        for class_name, count in results['class_counts'].items():
            if class_name not in self.analytics['class_totals']:
                self.analytics['class_totals'][class_name] = 0
            self.analytics['class_totals'][class_name] += count
    def _check_alerts(self, results):
        """Check for alert conditions."""
        current_time = datetime.now()
        
        # Check count thresholds
        for class_name, count in results['class_counts'].items():
            threshold = self.config['alert_thresholds'].get(class_name)
            if threshold and count > threshold:
                alert = {
                    'timestamp': current_time.isoformat(),
                    'type': 'count_threshold',
                    'class': class_name,
                    'count': count,
                    'threshold': threshold
                }
                self.analytics['alerts'].append(alert)
                print(f"⚠️  ALERT: {count} {class_name}s detected (threshold: {threshold})")
          # Check collision alerts
        if 'collision_alerts' in results:
            for collision in results['collision_alerts']:
                self.analytics['alerts'].append(collision)
                self.analytics['collisions_detected'] += 1
                vehicles = ' and '.join(collision['vehicles'])
                distance = collision['distance']
                print(f"🚨 COLLISION ALERT: {vehicles} too close! Distance: {distance:.1f} pixels")
        
        # Check trajectory-based collision predictions (for highways)
        if 'trajectory_alerts' in results:
            for alert in results['trajectory_alerts']:
                self.analytics['alerts'].append(alert)
                if alert['type'] == 'predicted_collision':
                    self.analytics['collisions_detected'] += 1
                    vehicles = ' and '.join(alert['vehicles'])
                    ttc = alert['time_to_collision']
                    print(f"⚠️ TRAJECTORY ALERT: Potential collision between {vehicles} in {ttc:.1f} seconds!")
        
        # Check traffic density alerts
        if 'traffic_info' in results:
            traffic = results['traffic_info']
            if traffic['density'] == 'HIGH' and traffic['congestion_level'] == 'HIGH':
                alert = {
                    'timestamp': current_time.isoformat(),
                    'type': 'traffic_congestion',
                    'density': traffic['density'],
                    'congestion': traffic['congestion_level'],
                    'vehicle_count': traffic['vehicle_count']
                }
                self.analytics['alerts'].append(alert)
                print(f"🚦 TRAFFIC ALERT: High congestion detected! {traffic['vehicle_count']} vehicles")
    def _add_analytics_overlay(self, frame):
        """Add analytics information to frame."""
        height, width = frame.shape[:2]
        
        # Runtime statistics
        runtime = time.time() - self.analytics['start_time']
        avg_detections = (self.analytics['total_detections'] / 
                         max(1, self.analytics['total_frames']))
        # Create overlay text
        overlay_text = [
            f"Runtime: {runtime:.0f}s",
            f"Frames: {self.analytics['total_frames']}",
            f"Avg Detections/Frame: {avg_detections:.1f}",
            f"Traffic: {self.analytics.get('traffic_density', 'LOW')}",
            f"Collisions: {self.analytics.get('collisions_detected', 0)}",
            f"Alerts: {len(self.analytics['alerts'])}"
        ]
        
        if self.config.get('highway_mode', True):
            overlay_text.append(f"Mode: Highway (Trajectory Prediction)")
            
            # Count active tracked vehicles
            active_count = 0
            for v_id, vehicle in self.tracked_vehicles.items():
                if self.analytics['total_frames'] - vehicle.get('last_seen', 0) < 5:
                    active_count += 1
            overlay_text.append(f"Tracked Vehicles: {active_count}")
        
        # Draw overlay background
        overlay_height = len(overlay_text) * 25 + 20
        cv2.rectangle(frame, (width - 300, 10), (width - 10, overlay_height), 
                     (0, 0, 0), -1)
        cv2.rectangle(frame, (width - 300, 10), (width - 10, overlay_height), 
                     (255, 255, 255), 2)
        
        # Draw text
        for i, text in enumerate(overlay_text):
            cv2.putText(frame, text, (width - 290, 35 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return frame
    
    def _save_frame(self, frame, frame_number, manual=False):
        """Save frame with timestamp."""
        import os
        os.makedirs('output_frames', exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"output_frames/frame_{timestamp}_{frame_number}"
        if manual:
            filename += "_manual"
        filename += ".jpg"
        
        cv2.imwrite(filename, frame)
        print(f"Frame saved: {filename}")
    
    def _log_detection(self, results):
        """Log detection results to file."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'frame_number': self.analytics['total_frames'],
            'detections': results['class_counts'],
            'total_count': results['total_count'],
            'fps': results['fps']
        }
        
        # Append to log file
        with open('detection_log.jsonl', 'a') as f:
            f.write(json.dumps(log_entry) + '\\n')
    
    def _reset_analytics(self):
        """Reset analytics counters."""
        self.analytics = {
            'total_frames': 0,
            'total_detections': 0,
            'class_totals': {},
            'start_time': time.time(),
            'alerts': []
        }
        print("Analytics reset.")
    
    def _cleanup(self):
        """Cleanup resources."""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        
        # Print final statistics
        runtime = time.time() - self.analytics['start_time']
        print(f"\\n=== Final Statistics ===")
        print(f"Runtime: {runtime:.1f} seconds")
        print(f"Total frames processed: {self.analytics['total_frames']}")
        print(f"Total detections: {self.analytics['total_detections']}")
        print(f"Class totals: {self.analytics['class_totals']}")
        print(f"Total alerts: {len(self.analytics['alerts'])}")
        
        if self.analytics['total_frames'] > 0:
            fps = self.analytics['total_frames'] / runtime
            print(f"Average processing FPS: {fps:.1f}")

    def _track_and_predict_collisions(self, detections, frame):
        """
        Track vehicles across frames and predict potential collisions based on trajectories.
        This method is especially effective for highway scenarios.
        """
        # Filter for vehicle classes
        vehicles = [d for d in detections if d['class'] in ['car', 'truck', 'bus', 'motorcycle']]
        
        # Match detections with existing tracked vehicles
        tracked_ids = self._update_vehicle_tracking(vehicles)
        
        # Calculate velocities and predict trajectories
        self._update_velocities(tracked_ids)
        
        # Predict potential collisions based on trajectories
        collision_alerts = self._predict_collisions(tracked_ids)
        
        # Visualize trajectories if configured
        if self.config.get('visualize_trajectories', True):
            frame = self._visualize_trajectories(frame, tracked_ids, collision_alerts)
        
        return {
            'alerts': collision_alerts,
            'frame': frame
        }
    
    def _update_vehicle_tracking(self, vehicles):
        """
        Match current detections with tracked vehicles and assign IDs.
        Returns a list of active vehicle IDs.
        """
        current_frame = self.analytics['total_frames']
        active_ids = []
        max_distance = 80  # Maximum pixel distance for matching
        
        # Match vehicles with existing tracks
        unmatched_vehicles = []
        
        for vehicle in vehicles:
            if vehicle['confidence'] < self.config.get('min_tracking_confidence', 0.5):
                continue  # Skip low confidence detections for tracking
                
            center = vehicle['center']
            best_match = None
            min_distance = max_distance
            
            # Try to match with existing tracked vehicles
            for vehicle_id, tracked in self.tracked_vehicles.items():
                # Only consider recently seen vehicles (within last 5 frames)
                if current_frame - tracked['last_seen'] > 5:
                    continue
                    
                last_center = tracked['center']
                distance = np.sqrt((center[0] - last_center[0])**2 + (center[1] - last_center[1])**2)
                
                # For highways, consider direction of travel in matching
                if 'velocity' in tracked and tracked['velocity'] is not None:
                    # Predicted position based on velocity
                    frames_since_seen = current_frame - tracked['last_seen']
                    pred_x = last_center[0] + tracked['velocity'][0] * frames_since_seen
                    pred_y = last_center[1] + tracked['velocity'][1] * frames_since_seen
                    pred_distance = np.sqrt((center[0] - pred_x)**2 + (center[1] - pred_y)**2)
                    # Give preference to matches that follow expected trajectory
                    distance = min(distance, pred_distance * 0.8)
                
                if distance < min_distance:
                    min_distance = distance
                    best_match = vehicle_id
            
            if best_match is not None:
                # Update matched vehicle
                self.tracked_vehicles[best_match].update({
                    'center': center,
                    'bbox': vehicle['bbox'],
                    'class': vehicle['class'],
                    'confidence': vehicle['confidence'],
                    'last_seen': current_frame
                })
                
                # Update history
                if best_match not in self.vehicle_history:
                    self.vehicle_history[best_match] = []
                
                self.vehicle_history[best_match].append(center)
                if len(self.vehicle_history[best_match]) > self.history_length:
                    self.vehicle_history[best_match].pop(0)
                    
                active_ids.append(best_match)
            else:
                # Add to unmatched for creating new tracks
                unmatched_vehicles.append(vehicle)
        
        # Create new tracks for unmatched vehicles
        for vehicle in unmatched_vehicles:
            new_id = self.next_vehicle_id
            self.next_vehicle_id += 1
            
            self.tracked_vehicles[new_id] = {
                'id': new_id,
                'center': vehicle['center'],
                'bbox': vehicle['bbox'],
                'class': vehicle['class'],
                'confidence': vehicle['confidence'],
                'velocity': None,  # Will be calculated after tracking for 2+ frames
                'last_seen': current_frame,
                'tracked_since': current_frame
            }
            
            self.vehicle_history[new_id] = [vehicle['center']]
            active_ids.append(new_id)
        
        return active_ids
    
    def _update_velocities(self, active_ids):
        """
        Update velocity vectors for tracked vehicles.
        Velocity is calculated based on position history.
        """
        current_frame = self.analytics['total_frames']
        
        for vehicle_id in active_ids:
            # Need at least 2 points to calculate velocity
            history = self.vehicle_history.get(vehicle_id, [])
            if len(history) < 2:
                continue
            
            # Calculate velocity from last two positions
            current_pos = history[-1]
            prev_pos = history[-2]
            
            # Calculate raw velocity vector
            vx = current_pos[0] - prev_pos[0]
            vy = current_pos[1] - prev_pos[1]
            
            # Apply exponential smoothing if previous velocity exists
            if 'velocity' in self.tracked_vehicles[vehicle_id] and self.tracked_vehicles[vehicle_id]['velocity'] is not None:
                old_vx, old_vy = self.tracked_vehicles[vehicle_id]['velocity']
                # Smoothing factor (higher value gives more weight to new measurement)
                alpha = 0.7
                vx = alpha * vx + (1 - alpha) * old_vx
                vy = alpha * vy + (1 - alpha) * old_vy
            
            self.tracked_vehicles[vehicle_id]['velocity'] = [vx, vy]
            
            # Calculate speed (magnitude of velocity vector)
            speed = np.sqrt(vx**2 + vy**2)
            self.tracked_vehicles[vehicle_id]['speed'] = speed
    
    def _predict_collisions(self, active_ids):
        """
        Predict potential collisions based on vehicle trajectories.
        This is more effective for highway scenarios than simple proximity detection.
        """
        collision_alerts = []
        prediction_horizon = self.config.get('prediction_horizon', 15)
        min_trajectory_length = self.config.get('min_trajectory_length', 3)
        current_frame = self.analytics['total_frames']
        
        # Process each pair of vehicles
        for i, v1_id in enumerate(active_ids):
            v1 = self.tracked_vehicles.get(v1_id)
            if v1 is None or 'velocity' not in v1 or v1['velocity'] is None:
                continue
                
            # Skip vehicles with insufficient tracking history
            if len(self.vehicle_history.get(v1_id, [])) < min_trajectory_length:
                continue
            
            # Current position and velocity
            pos1 = v1['center']
            vel1 = v1['velocity']
            
            # Predict future positions for first vehicle
            future_positions1 = []
            for t in range(1, prediction_horizon + 1):
                future_x = pos1[0] + vel1[0] * t
                future_y = pos1[1] + vel1[1] * t
                future_positions1.append((future_x, future_y))
            
            # Check against all other vehicles
            for j, v2_id in enumerate(active_ids[i+1:], i+1):
                v2 = self.tracked_vehicles.get(v2_id)
                if v2 is None or 'velocity' not in v2 or v2['velocity'] is None:
                    continue
                    
                # Skip vehicles with insufficient tracking history
                if len(self.vehicle_history.get(v2_id, [])) < min_trajectory_length:
                    continue
                
                # Current position and velocity of second vehicle
                pos2 = v2['center']
                vel2 = v2['velocity']
                
                # Calculate current distance (for immediate proximity warnings)
                current_distance = np.sqrt((pos2[0] - pos1[0])**2 + (pos2[1] - pos1[1])**2)
                
                # If vehicles are already too close, issue immediate alert
                if current_distance < self.config.get('collision_distance_threshold', 50):
                    collision_alerts.append({
                        'type': 'immediate_proximity',
                        'vehicles': [v1['class'], v2['class']],
                        'vehicle_ids': [v1_id, v2_id],
                        'distance': current_distance,
                        'positions': [pos1, pos2],
                        'severity': 'HIGH',
                        'timestamp': datetime.now().isoformat()
                    })
                    continue  # Skip trajectory prediction for vehicles already too close
                
                # Predict future positions of second vehicle
                future_positions2 = []
                for t in range(1, prediction_horizon + 1):
                    future_x = pos2[0] + vel2[0] * t
                    future_y = pos2[1] + vel2[1] * t
                    future_positions2.append((future_x, future_y))
                
                # Check for collision at each future time step
                collision_time = None
                min_future_distance = float('inf')
                collision_positions = None
                
                for t in range(prediction_horizon):
                    fp1 = future_positions1[t]
                    fp2 = future_positions2[t]
                    
                    # Distance at this future time step
                    future_distance = np.sqrt((fp2[0] - fp1[0])**2 + (fp2[1] - fp1[1])**2)
                    
                    if future_distance < min_future_distance:
                        min_future_distance = future_distance
                        collision_positions = (fp1, fp2)
                    
                    # Check if vehicles will be too close (potential collision)
                    if future_distance < self.config.get('highway_collision_threshold', 40):
                        collision_time = t + 1
                        break
                
                # If a future collision is predicted
                if collision_time is not None:
                    # Calculate time to collision in seconds (approximate)
                    fps = 30  # Assume 30 fps if not available
                    if 'fps' in self.analytics and self.analytics['fps'] > 0:
                        fps = self.analytics['fps']
                    
                    time_to_collision = collision_time / fps
                    
                    # Determine severity based on time to collision
                    if time_to_collision < 1.0:
                        severity = 'HIGH'
                    elif time_to_collision < 2.0:
                        severity = 'MEDIUM'
                    else:
                        severity = 'LOW'
                    
                    collision_alerts.append({
                        'type': 'predicted_collision',
                        'vehicles': [v1['class'], v2['class']],
                        'vehicle_ids': [v1_id, v2_id],
                        'current_distance': current_distance,
                        'min_future_distance': min_future_distance,
                        'time_to_collision': time_to_collision,
                        'collision_frame': current_frame + collision_time,
                        'predicted_positions': collision_positions,
                        'severity': severity,
                        'timestamp': datetime.now().isoformat()
                    })
        
        return collision_alerts
    
    def _visualize_trajectories(self, frame, active_ids, collision_alerts):
        """
        Visualize vehicle trajectories and predicted collision paths.
        """
        # Create a copy of the frame to avoid modifying the original
        viz_frame = frame.copy()
        prediction_horizon = self.config.get('prediction_horizon', 15)
        
        # Draw past trajectory for each active vehicle
        for vehicle_id in active_ids:
            if vehicle_id not in self.vehicle_history:
                continue
                
            # Get trajectory history
            trajectory = self.vehicle_history[vehicle_id]
            if len(trajectory) < 2:
                continue
                
            # Draw line connecting past positions (trajectory history)
            for i in range(1, len(trajectory)):
                pt1 = tuple(map(int, trajectory[i-1]))
                pt2 = tuple(map(int, trajectory[i]))
                cv2.line(viz_frame, pt1, pt2, (0, 255, 0), 2)
            
            # Draw predicted future trajectory if velocity is available
            vehicle = self.tracked_vehicles[vehicle_id]
            if 'velocity' in vehicle and vehicle['velocity'] is not None:
                # Get current position and velocity
                current_pos = trajectory[-1]
                vx, vy = vehicle['velocity']
                
                # Draw predicted future trajectory
                prev_point = current_pos
                for t in range(1, prediction_horizon + 1):
                    # Predict position at this time step
                    future_x = int(current_pos[0] + vx * t)
                    future_y = int(current_pos[1] + vy * t)
                    future_point = (future_x, future_y)
                    
                    # Draw line segment
                    cv2.line(viz_frame, 
                             tuple(map(int, prev_point)), 
                             future_point, 
                             (255, 165, 0), 1)  # Orange for prediction
                    
                    prev_point = future_point
        
        # Highlight predicted collision points
        for alert in collision_alerts:
            if alert['type'] == 'predicted_collision' and 'predicted_positions' in alert:
                # Get predicted collision positions
                pos1, pos2 = alert['predicted_positions']
                
                # Draw collision point
                collision_pt = ((int(pos1[0]) + int(pos2[0])) // 2, 
                               (int(pos1[1]) + int(pos2[1])) // 2)
                
                # Draw red circle at collision point
                cv2.circle(viz_frame, collision_pt, 10, (0, 0, 255), -1)
                
                # Draw line between vehicles
                cv2.line(viz_frame, 
                         (int(pos1[0]), int(pos1[1])), 
                         (int(pos2[0]), int(pos2[1])), 
                         (0, 0, 255), 2)
                
                # Add time to collision text
                ttc = alert['time_to_collision']
                cv2.putText(viz_frame, f"TTC: {ttc:.1f}s", 
                           (collision_pt[0] - 40, collision_pt[1] - 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        return viz_frame
def main():
    """Main function to run enhanced NIC."""    # Custom configuration
    config = {
        'model_version': 'yolov8s',  # Use YOLOv8 small for better performance
        'confidence_threshold': 0.4,
        'iou_threshold': 0.45,
        'display_window': True,
        'save_frames': False,
        'alert_thresholds': {
            'person': 3,   # Alert if more than 3 people
            'car': 5,     # Alert if more than 5 cars
            'truck': 2     # Alert if more than 2 trucks
        },
        'log_detections': True,
        'frame_skip': 3,  # Process every 3rd frame for performance
        # Collision detection settings
        'collision_detection': True,
        'collision_distance_threshold': 50,  # pixels
        'stationary_time_threshold': 5,  # seconds
        # Traffic monitoring settings
        'traffic_monitoring': True,
        'traffic_density_thresholds': {
            'low': 5,    # vehicles per frame
            'medium': 15,
            'high': 25
        },
        # Highway traffic specific settings
        'highway_mode': True,
        'trajectory_prediction': True,
        'prediction_horizon': 15,  # Frames to look ahead
        'highway_collision_threshold': 40,  # Distance threshold for predicted collisions
        'min_tracking_confidence': 0.5,  # Minimum confidence for tracking
        'min_trajectory_length': 3,  # Minimum trajectory length for prediction
        'visualize_trajectories': True  # Show predicted paths
    }
    
    
    # Initialize and run enhanced NIC
    nic = EnhancedNIC(config=config)
    nic.run_detection()

if __name__ == "__main__":
    main()


# what ways could we use to detect a collision other then identification boxes overlapping. we are currently thinking of grey scale and getting the 3D information by the darkness or lightness of the grey scale cars or by sending the supposed collision image to a Amazon Q cli to verify if a collision has occured?