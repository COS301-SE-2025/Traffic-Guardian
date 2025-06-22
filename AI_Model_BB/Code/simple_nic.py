"""
Simple Network Interface Camera (NIC) with YOLO Detection

"""
import cv2
import torch
import time
from datetime import datetime

class SimpleNIC:
    def __init__(self, stream_url="Videos\CarTrainingVideo.mp4"):
        """Initialize Simple NIC with YOLO detection."""
        self.stream_url = stream_url
        self.target_classes = ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
        
        # Load YOLO model
        self.model = self._load_model()
        
        # Initialize video capture
        self.cap = None
        self.initialize_capture()
        
        # Simple analytics
        self.frame_count = 0
        self.start_time = time.time()
        
    def _load_model(self):
        """Load YOLO model with fallback options."""
        try:
            # Try YOLOv8 first
            from ultralytics import YOLO
            model = YOLO('yolov8s.pt')
            print("✓ Loaded YOLOv8 model")
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
    
    def initialize_capture(self):
        """Initialize video capture with retry logic."""
        max_retries = 5
        
        for attempt in range(max_retries):
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                print(f"✓ Connected to stream: {self.stream_url}")
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
                return True
            
            print(f"✗ Connection attempt {attempt+1}/{max_retries} failed...")
            time.sleep(2)
        
        print("✗ Failed to connect to stream")
        return False
    
    def run_detection(self):
        """Main detection loop."""
        if not self.cap or not self.cap.isOpened():
            print("✗ Video capture not initialized")
            return
        
        print("🚀 Starting YOLO detection...")
        print("Controls: 'q' = quit, 's' = save frame")
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("✗ Failed to grab frame, reconnecting...")
                    if not self.initialize_capture():
                        break
                    continue
                
                self.frame_count += 1
                
                # Run YOLO detection
                detections = self._detect_objects(frame)
                
                # Draw results
                annotated_frame = self._draw_detections(frame, detections)
                
                # Add info overlay
                annotated_frame = self._add_info_overlay(annotated_frame, detections)
                
                # Display frame
                cv2.imshow("Simple NIC - YOLO Detection", annotated_frame)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self._save_frame(annotated_frame)
                
        except KeyboardInterrupt:
            print("\n⏹️ Detection stopped by user")
        finally:
            self._cleanup()
    
    def _detect_objects(self, frame):
        """Run YOLO detection on frame."""
        if self.model is None:
            return []
        
        try:
            if self.model_type == 'yolov8':
                results = self.model(frame, conf=0.4, verbose=False)
                return self._process_yolov8_results(results[0])
            else:  # yolov5
                results = self.model(frame)
                return self._process_yolov5_results(results)
        except Exception as e:
            print(f"Detection error: {e}")
            return []
    
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
                        'class': class_name
                    })
        return detections
    
    def _process_yolov5_results(self, results):
        """Process YOLOv5 detection results."""
        detections = []
        df = results.pandas().xyxy[0]
        
        for _, row in df.iterrows():
            if row['name'] in self.target_classes and row['confidence'] >= 0.4:
                x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])
                detections.append({
                    'bbox': [x1, y1, x2 - x1, y2 - y1],
                    'confidence': float(row['confidence']),
                    'class': row['name']
                })
        return detections
    
    def _draw_detections(self, frame, detections):
        """Draw detection boxes and labels."""
        colors = {
            'person': (0, 255, 255),    # Yellow
            'car': (0, 255, 0),        # Green
            'truck': (0, 0, 255),      # Red
            'bus': (255, 255, 0),      # Cyan
            'motorcycle': (255, 0, 255), # Magenta
            'bicycle': (255, 165, 0)   # Orange
        }
        
        for detection in detections:
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
    
    def _add_info_overlay(self, frame, detections):
        """Add information overlay to frame."""
        # Count detections by class
        class_counts = {}
        for detection in detections:
            class_name = detection['class']
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        # Runtime info
        runtime = time.time() - self.start_time
        fps = self.frame_count / runtime if runtime > 0 else 0
        
        # Draw info
        info_lines = [
            f"Frame: {self.frame_count}",
            f"FPS: {fps:.1f}",
            f"Objects: {len(detections)}"
        ]
        
        # Add class counts
        for class_name, count in class_counts.items():
            info_lines.append(f"{class_name}: {count}")
        
        # Draw background
        overlay_height = len(info_lines) * 25 + 20
        cv2.rectangle(frame, (10, 10), (250, overlay_height), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (250, overlay_height), (255, 255, 255), 2)
        
        # Draw text
        for i, line in enumerate(info_lines):
            cv2.putText(frame, line, (20, 35 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return frame
    
    def _save_frame(self, frame):
        """Save current frame."""
        import os
        os.makedirs('output/saved_frames', exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"output/saved_frames/frame_{timestamp}_{self.frame_count}.jpg"
        
        cv2.imwrite(filename, frame)
        print(f"💾 Frame saved: {filename}")
    
    def _cleanup(self):
        """Clean up resources."""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        
        runtime = time.time() - self.start_time
        fps = self.frame_count / runtime if runtime > 0 else 0
        
        print(f"\n📊 Session Statistics:")
        print(f"   Runtime: {runtime:.1f} seconds")
        print(f"   Frames processed: {self.frame_count}")
        print(f"   Average FPS: {fps:.1f}")


def main():
    """Main function."""
    print("🎯 Simple NIC - YOLO Object Detection")
    print("=" * 40)
    
    # Initialize and run
    nic = SimpleNIC()
    nic.run_detection()


if __name__ == "__main__":
    main()