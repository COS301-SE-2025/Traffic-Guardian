"""
HLS Stream Adapter for AI Incident Detection
Bridges the gap between HLS streams and OpenCV processing
"""
import cv2
import subprocess
import threading
import time
import queue
import numpy as np
import os
import tempfile
import logging
from typing import Optional, Callable
import requests
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class HLSStreamAdapter:
    """
    Adapter that converts HLS (.m3u8) streams to OpenCV-compatible format
    using FFmpeg subprocess for reliable stream processing.
    """
    
    def __init__(self, stream_url: str, camera_id: str = None):
        self.stream_url = stream_url
        self.camera_id = camera_id
        self.ffmpeg_process = None
        self.frame_queue = queue.Queue(maxsize=30)  # Buffer 1 second at 30fps
        self.capture_thread = None
        self.is_running = False
        self.last_frame = None
        self.frame_count = 0
        self.connection_retries = 0
        self.max_retries = 5
        
        # FFmpeg command for HLS stream processing
        self.ffmpeg_cmd = [
            'ffmpeg',
            '-i', stream_url,
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            '-an',  # No audio
            '-sn',  # No subtitles
            '-vf', 'scale=1280:720',  # Standardize resolution
            '-r', '15',  # Reduce to 15fps for better performance
            '-loglevel', 'error',  # Minimize ffmpeg output
            '-'
        ]
        
    def start_capture(self) -> bool:
        """Start capturing frames from HLS stream."""
        if self.is_running:
            return True
            
        try:
            logger.info(f"Starting HLS capture for camera {self.camera_id}: {self.stream_url}")
            
            # Test stream accessibility first
            if not self._test_stream_accessibility():
                logger.error(f"Stream not accessible: {self.stream_url}")
                return False
            
            # Start FFmpeg process
            self.ffmpeg_process = subprocess.Popen(
                self.ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8
            )
            
            # Start capture thread
            self.is_running = True
            self.capture_thread = threading.Thread(target=self._capture_frames, daemon=True)
            self.capture_thread.start()
            
            # Wait a moment to see if capture starts successfully
            time.sleep(2)
            
            if not self.frame_queue.empty():
                logger.info(f"HLS capture started successfully for camera {self.camera_id}")
                return True
            else:
                logger.warning(f"HLS capture started but no frames received yet for camera {self.camera_id}")
                return True  # Give it a chance, might be slow to start
                
        except Exception as e:
            logger.error(f"Failed to start HLS capture for camera {self.camera_id}: {e}")
            self.stop_capture()
            return False
    
    def _test_stream_accessibility(self) -> bool:
        """Test if the HLS stream is accessible."""
        try:
            # Try to fetch the m3u8 playlist
            response = requests.get(self.stream_url, timeout=10, 
                                  headers={'User-Agent': 'TrafficGuardian-AI/1.0'})
            
            if response.status_code == 200:
                content = response.text
                # Check if it looks like an HLS playlist
                if '#EXTM3U' in content or '#EXT-X-VERSION' in content:
                    logger.info(f"HLS playlist accessible for {self.camera_id}")
                    return True
                else:
                    logger.warning(f"URL accessible but doesn't appear to be HLS playlist: {self.stream_url}")
                    return False
            else:
                logger.error(f"HTTP {response.status_code} when accessing {self.stream_url}")
                return False
                
        except Exception as e:
            logger.error(f"Error testing stream accessibility: {e}")
            return False
    
    def _capture_frames(self):
        """Capture frames from FFmpeg subprocess."""
        frame_width, frame_height = 1280, 720
        frame_size = frame_width * frame_height * 3  # BGR24 format
        
        try:
            while self.is_running and self.ffmpeg_process.poll() is None:
                # Read one frame worth of data
                raw_frame = self.ffmpeg_process.stdout.read(frame_size)
                
                if len(raw_frame) != frame_size:
                    if len(raw_frame) == 0:
                        logger.warning(f"No data received from stream {self.camera_id}")
                    else:
                        logger.warning(f"Incomplete frame received: {len(raw_frame)}/{frame_size} bytes")
                    
                    # Try to restart if we've lost the stream
                    if self._should_retry():
                        self._restart_stream()
                    else:
                        break
                    continue
                
                # Convert raw bytes to numpy array
                frame = np.frombuffer(raw_frame, dtype=np.uint8)
                frame = frame.reshape((frame_height, frame_width, 3))
                
                # Update frame count
                self.frame_count += 1
                self.last_frame = frame.copy()
                
                # Add frame to queue (non-blocking)
                try:
                    self.frame_queue.put(frame, block=False)
                except queue.Full:
                    # Remove oldest frame and add new one
                    try:
                        self.frame_queue.get_nowait()
                        self.frame_queue.put(frame, block=False)
                    except queue.Empty:
                        pass
                        
        except Exception as e:
            logger.error(f"Error in frame capture for camera {self.camera_id}: {e}")
        finally:
            logger.info(f"Frame capture stopped for camera {self.camera_id}")
    
    def _should_retry(self) -> bool:
        """Determine if we should retry the connection."""
        self.connection_retries += 1
        if self.connection_retries <= self.max_retries:
            logger.info(f"Retry attempt {self.connection_retries}/{self.max_retries} for camera {self.camera_id}")
            return True
        return False
    
    def _restart_stream(self):
        """Restart the FFmpeg stream process."""
        try:
            if self.ffmpeg_process:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.ffmpeg_process.kill()
        except Exception:
            pass
        
        # Wait a moment before restarting
        time.sleep(2)
        
        try:
            self.ffmpeg_process = subprocess.Popen(
                self.ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=10**8
            )
            logger.info(f"Restarted FFmpeg process for camera {self.camera_id}")
        except Exception as e:
            logger.error(f"Failed to restart FFmpeg process: {e}")
            self.is_running = False
    
    def read_frame(self) -> tuple[bool, Optional[np.ndarray]]:
        """
        Read the next frame (OpenCV VideoCapture compatible interface).
        Returns (success, frame) tuple.
        """
        try:
            # Try to get frame from queue with timeout
            frame = self.frame_queue.get(timeout=1.0)
            return True, frame
        except queue.Empty:
            # If no new frame, return last frame if available
            if self.last_frame is not None:
                logger.debug(f"No new frame, returning last frame for camera {self.camera_id}")
                return True, self.last_frame.copy()
            else:
                logger.warning(f"No frames available for camera {self.camera_id}")
                return False, None
    
    def stop_capture(self):
        """Stop the capture process."""
        logger.info(f"Stopping HLS capture for camera {self.camera_id}")
        self.is_running = False
        
        # Stop FFmpeg process
        if self.ffmpeg_process:
            try:
                self.ffmpeg_process.terminate()
                self.ffmpeg_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.ffmpeg_process.kill()
            except Exception as e:
                logger.error(f"Error stopping FFmpeg process: {e}")
            finally:
                self.ffmpeg_process = None
        
        # Wait for capture thread to finish
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=3)
        
        # Clear frame queue
        while not self.frame_queue.empty():
            try:
                self.frame_queue.get_nowait()
            except queue.Empty:
                break
    
    def is_opened(self) -> bool:
        """Check if the stream is open and running."""
        return self.is_running and (self.ffmpeg_process is not None) and (self.ffmpeg_process.poll() is None)
    
    def get_frame_count(self) -> int:
        """Get the number of frames processed."""
        return self.frame_count
    
    def get_fps(self) -> float:
        """Get approximate FPS (simplified implementation)."""
        return 15.0  # We set FFmpeg to 15fps
    
    @staticmethod
    def is_hls_url(url: str) -> bool:
        """Check if URL appears to be an HLS stream."""
        return url.lower().endswith('.m3u8') or '/playlist.m3u8' in url.lower()


class StreamCapture:
    """
    Enhanced VideoCapture that can handle both regular streams and HLS streams.
    Drop-in replacement for cv2.VideoCapture with HLS support.
    """
    
    def __init__(self, source):
        self.source = source
        self.hls_adapter = None
        self.cv_capture = None
        self.is_hls = False
        
        # Determine if this is an HLS stream
        if isinstance(source, str) and HLSStreamAdapter.is_hls_url(source):
            self.is_hls = True
            camera_id = self._extract_camera_id(source)
            self.hls_adapter = HLSStreamAdapter(source, camera_id)
        else:
            # Use regular OpenCV VideoCapture
            self.cv_capture = cv2.VideoCapture(source)
    
    def _extract_camera_id(self, url: str) -> str:
        """Extract camera ID from URL for logging."""
        try:
            # Try to extract meaningful ID from URL
            parsed = urlparse(url)
            path_parts = parsed.path.split('/')
            for part in reversed(path_parts):
                if part and not part.endswith('.m3u8'):
                    return part
            return "unknown"
        except:
            return "unknown"
    
    def isOpened(self) -> bool:
        """Check if capture is opened."""
        if self.is_hls:
            return self.hls_adapter.is_opened()
        else:
            return self.cv_capture.isOpened() if self.cv_capture else False
    
    def read(self) -> tuple[bool, Optional[np.ndarray]]:
        """Read next frame."""
        if self.is_hls:
            return self.hls_adapter.read_frame()
        else:
            return self.cv_capture.read() if self.cv_capture else (False, None)
    
    def set(self, prop_id, value):
        """Set capture property."""
        if not self.is_hls and self.cv_capture:
            return self.cv_capture.set(prop_id, value)
        else:
            # HLS adapter doesn't support property setting
            logger.debug("Property setting not supported for HLS streams")
            return False
    
    def get(self, prop_id):
        """Get capture property."""
        if not self.is_hls and self.cv_capture:
            return self.cv_capture.get(prop_id)
        else:
            # Return reasonable defaults for HLS
            if prop_id == cv2.CAP_PROP_FRAME_WIDTH:
                return 1280
            elif prop_id == cv2.CAP_PROP_FRAME_HEIGHT:
                return 720
            elif prop_id == cv2.CAP_PROP_FPS:
                return 15
            else:
                return 0
    
    def release(self):
        """Release the capture."""
        if self.is_hls:
            if self.hls_adapter:
                self.hls_adapter.stop_capture()
        else:
            if self.cv_capture:
                self.cv_capture.release()
    
    def open_stream(self) -> bool:
        """Open/initialize the stream."""
        if self.is_hls:
            return self.hls_adapter.start_capture()
        else:
            return True  # cv2.VideoCapture opens automatically