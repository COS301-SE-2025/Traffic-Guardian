"""
Fixed Enhanced Network Interface Camera (NIC) with built-in AI detection.
This version works without external dependencies and includes all necessary functions.
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
        
        # Analytics
        self.analytics = {
            'total_frames': 0,
            'total_detections': 0,
            'class_totals': {},
            'start_time': time.time(),
            'alerts': []
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
            'frame_skip': 1  # Process every N frames for performance
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
                
                # Update analytics
                self._update_analytics(results)
                
                # Check for alerts
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
                        'class': class_name,
                        'center': [(x1 + x2) // 2, (y1 + y2) // 2]
                    })
        return detections
    
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
            f"Alerts: {len(self.analytics['alerts'])}"
        ]
        
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

def main():
    """Main function to run enhanced NIC."""
    # Custom configuration
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
        'frame_skip': 1  # Process every frame
    }
    
    # Initialize and run enhanced NIC
    nic = EnhancedNIC(config=config)
    nic.run_detection()

if __name__ == "__main__":
    main()
