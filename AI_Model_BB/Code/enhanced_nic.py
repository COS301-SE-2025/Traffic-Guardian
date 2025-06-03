"""
Enhanced Network Interface Camera (NIC) with improved AI detection.
Features: Multi-model support, real-time analytics, and optimized performance.
"""
import cv2
import torch
import time
import json
from datetime import datetime
from improved_detection import ImprovedDetector

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
        self.detector = ImprovedDetector(
            model_version=self.config['model_version'],
            confidence_threshold=self.config['confidence_threshold'],
            iou_threshold=self.config['iou_threshold']
        )
        
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
                results = self.detector.detect_objects(frame)
                
                # Update analytics
                self._update_analytics(results)
                
                # Check for alerts
                self._check_alerts(results)
                
                # Draw enhanced visualization
                annotated_frame = self.detector.draw_detections(frame, results)
                
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
