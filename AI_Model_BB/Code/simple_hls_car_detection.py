#!/usr/bin/env python3
"""
Simple HLS Car Detection for Frontend Integration
Focus: Connect AI car detection to the same HLS streams the frontend uses
"""
import cv2
import subprocess
import threading
import time
import queue
import numpy as np
import requests
import json
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleHLSCapture:
    """Simple HLS stream capture using FFmpeg"""
    
    def __init__(self, stream_url: str, camera_id: str = "HLS_CAM"):
        self.stream_url = stream_url
        self.camera_id = camera_id
        self.ffmpeg_process = None
        self.frame_queue = queue.Queue(maxsize=10)
        self.capture_thread = None
        self.is_running = False
        self.last_frame = None
        self.frame_count = 0
        
        # Simple FFmpeg command focused on performance
        self.ffmpeg_cmd = [
            'ffmpeg',
            '-i', stream_url,
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-vf', 'scale=640:360',  # Lower resolution for better performance
            '-r', '15',              # 15 FPS target
            '-an', '-sn',            # No audio/subtitles
            '-loglevel', 'error',
            '-'
        ]
        
    def start_capture(self) -> bool:
        """Start HLS capture"""
        try:
            print(f"🎥 Starting HLS capture for {self.camera_id}")
            
            # Test stream first
            response = requests.get(self.stream_url, timeout=5)
            if response.status_code != 200 or '#EXTM3U' not in response.text:
                print(f"❌ Invalid HLS stream: {self.stream_url}")
                return False
            
            # Start FFmpeg
            self.ffmpeg_process = subprocess.Popen(
                self.ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**6
            )
            
            # Start capture thread
            self.is_running = True
            self.capture_thread = threading.Thread(target=self._capture_frames, daemon=True)
            self.capture_thread.start()
            
            time.sleep(2)  # Wait for startup
            print(f"✅ HLS capture started for {self.camera_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start HLS capture: {e}")
            return False
    
    def _capture_frames(self):
        """Capture frames from FFmpeg"""
        frame_size = 640 * 360 * 3  # BGR24
        
        while self.is_running and self.ffmpeg_process.poll() is None:
            try:
                raw_frame = self.ffmpeg_process.stdout.read(frame_size)
                
                if len(raw_frame) != frame_size:
                    continue
                
                # Convert to numpy array
                frame = np.frombuffer(raw_frame, dtype=np.uint8)
                frame = frame.reshape((360, 640, 3))
                
                self.frame_count += 1
                self.last_frame = frame.copy()
                
                # Add to queue (non-blocking)
                try:
                    if self.frame_queue.full():
                        self.frame_queue.get_nowait()  # Remove old frame
                    self.frame_queue.put(frame, block=False)
                except queue.Full:
                    pass
                    
            except Exception as e:
                if self.is_running:
                    print(f"⚠️ Frame capture error: {e}")
                break
    
    def read(self) -> tuple[bool, Optional[np.ndarray]]:
        """Read next frame (OpenCV compatible)"""
        try:
            frame = self.frame_queue.get(timeout=0.1)
            return True, frame
        except queue.Empty:
            if self.last_frame is not None:
                return True, self.last_frame.copy()
            return False, None
    
    def isOpened(self) -> bool:
        return self.is_running and (self.ffmpeg_process is not None)
    
    def release(self):
        """Stop capture and cleanup"""
        self.is_running = False
        
        if self.ffmpeg_process:
            try:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.ffmpeg_process.kill()
            except Exception:
                pass
            finally:
                self.ffmpeg_process = None
        
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2)

class SimpleCarDetector:
    """Simple car detection using YOLO"""
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load YOLO model"""
        try:
            from ultralytics import YOLO
            self.model = YOLO('yolov8s.pt')
            print("✅ YOLO model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load YOLO model: {e}")
            self.model = None
    
    def detect_cars(self, frame):
        """Detect cars in frame"""
        if self.model is None:
            return []
        
        try:
            results = self.model(frame, conf=0.3, verbose=False)
            
            detections = []
            if results and len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for i in range(len(boxes)):
                    cls = int(boxes.cls[i])
                    conf = float(boxes.conf[i])
                    class_name = self.model.names[cls]
                    
                    # Focus on vehicles
                    if class_name in ['car', 'truck', 'bus', 'motorcycle']:
                        x1, y1, x2, y2 = map(int, boxes.xyxy[i])
                        detections.append({
                            'class': class_name,
                            'confidence': conf,
                            'bbox': [x1, y1, x2, y2]
                        })
            
            return detections
            
        except Exception as e:
            print(f"⚠️ Detection error: {e}")
            return []

def fetch_district12_cameras():
    """Fetch cameras from District 12 like the frontend does"""
    url = "https://cwwp2.dot.ca.gov/data/d12/cctv/cctvStatusD12.json"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return []
        
        data = response.json()
        cameras = []
        
        for item in data.get('data', [])[:5]:  # First 5 cameras
            cctv = item['cctv']
            
            if cctv['inService'] != 'true':
                continue
            
            stream_url = cctv['imageData']['streamingVideoURL']
            if not stream_url or stream_url == 'Not Reported':
                continue
            
            # Convert to HTTPS like frontend does
            if stream_url.startswith('http://cwwp2.dot.ca.gov'):
                stream_url = stream_url.replace('http://cwwp2.dot.ca.gov', 'https://caltrans.blinktag.com/api')
            
            # Only include HLS streams
            if stream_url.endswith('.m3u8'):
                cameras.append({
                    'id': cctv['index'],
                    'location': cctv['location']['locationName'] or cctv['location']['nearbyPlace'],
                    'url': stream_url
                })
        
        return cameras
        
    except Exception as e:
        print(f"❌ Error fetching cameras: {e}")
        return []

def run_simple_detection(camera_config):
    """Run simple car detection on HLS stream"""
    camera_id = camera_config['id']
    location = camera_config['location']
    stream_url = camera_config['url']
    
    print(f"\n🎯 Starting detection for Camera {camera_id}")
    print(f"📍 Location: {location}")
    print(f"🔗 Stream: {stream_url}")
    
    # Initialize components
    capture = SimpleHLSCapture(stream_url, camera_id)
    detector = SimpleCarDetector()
    
    if not capture.start_capture():
        print(f"❌ Failed to start capture for camera {camera_id}")
        return
    
    if detector.model is None:
        print(f"❌ No detection model available for camera {camera_id}")
        capture.release()
        return
    
    print(f"🚀 Detection running for Camera {camera_id}. Press 'q' to quit.")
    
    frame_count = 0
    cars_detected = 0
    start_time = time.time()
    
    try:
        while True:
            ret, frame = capture.read()
            
            if not ret or frame is None:
                time.sleep(0.1)
                continue
            
            frame_count += 1
            
            # Detect cars every 5 frames for performance
            if frame_count % 5 == 0:
                detections = detector.detect_cars(frame)
                
                if detections:
                    cars_detected += len(detections)
                    print(f"🚗 Frame {frame_count}: Found {len(detections)} vehicles")
                    
                    # Draw detections on frame
                    for det in detections:
                        x1, y1, x2, y2 = det['bbox']
                        class_name = det['class']
                        confidence = det['confidence']
                        
                        # Draw bounding box
                        color = (0, 255, 0) if class_name == 'car' else (0, 0, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        
                        # Draw label
                        label = f"{class_name}: {confidence:.2f}"
                        cv2.putText(frame, label, (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            # Add info overlay
            runtime = time.time() - start_time
            fps = frame_count / runtime if runtime > 0 else 0
            
            info_text = f"Camera {camera_id} | FPS: {fps:.1f} | Cars: {cars_detected}"
            cv2.putText(frame, info_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Display frame
            cv2.imshow(f"HLS Car Detection - Camera {camera_id}", frame)
            
            # Check for quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    except KeyboardInterrupt:
        print(f"\n🛑 Stopping detection for camera {camera_id}")
    
    finally:
        capture.release()
        cv2.destroyAllWindows()
        
        # Final stats
        runtime = time.time() - start_time
        print(f"\n📊 Camera {camera_id} Summary:")
        print(f"   Runtime: {runtime:.1f} seconds")
        print(f"   Frames: {frame_count}")
        print(f"   FPS: {frame_count/runtime:.1f}")
        print(f"   Cars detected: {cars_detected}")

def main():
    """Main function - simple HLS car detection"""
    print("🎥 Simple HLS Car Detection for Frontend Integration")
    print("=" * 60)
    
    # Check dependencies
    try:
        import cv2
        from ultralytics import YOLO
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        print("✅ All dependencies available")
    except Exception as e:
        print(f"❌ Missing dependencies: {e}")
        return
    
    # Fetch cameras
    print("\n🔍 Fetching cameras from District 12...")
    cameras = fetch_district12_cameras()
    
    if not cameras:
        print("❌ No HLS cameras found. Testing with example URL...")
        # Fallback to example camera
        cameras = [{
            'id': 'TEST',
            'location': 'Test HLS Camera',
            'url': 'https://caltrans.blinktag.com/api/d12/NB57Ball.stream/playlist.m3u8'
        }]
    
    print(f"✅ Found {len(cameras)} HLS camera(s):")
    for i, cam in enumerate(cameras):
        print(f"   {i+1}. Camera {cam['id']}: {cam['location']}")
    
    # Run detection on first camera
    if cameras:
        print(f"\n🎯 Running detection on Camera {cameras[0]['id']}")
        run_simple_detection(cameras[0])
    
    print("\n✅ Simple HLS detection completed!")

if __name__ == "__main__":
    main()