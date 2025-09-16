"""
Stream Handler for HLS and regular video streams
Handles both MP4 files and HLS (.m3u8) streams using streamlink
"""

import cv2
import time
import streamlink


class StreamCapture:
    """Wrapper class to handle both regular videos and HLS streams"""
    
    def __init__(self, url, max_retries=5):
        self.url = url
        self.max_retries = max_retries
        self.cap = None
        self.is_hls = self._is_hls_stream(url)
        self.stream_url = url
        
    def _is_hls_stream(self, url):
        """Check if URL is an HLS stream"""
        return url.lower().endswith('.m3u8') or 'm3u8' in url.lower()
    
    def _get_stream_url(self, url):
        """Get direct stream URL using streamlink for HLS streams"""
        try:
            print(f"🔍 Resolving HLS stream...")
            streams = streamlink.streams(url)
            if streams:
                # Try to get the best quality stream, fallback to worst
                if 'best' in streams:
                    direct_url = streams['best'].url
                    print(f"✅ Got best quality stream")
                    return direct_url
                elif 'worst' in streams:
                    direct_url = streams['worst'].url
                    print(f"✅ Got worst quality stream (fallback)")
                    return direct_url
                else:
                    # Get any available stream
                    available_qualities = list(streams.keys())
                    stream_key = available_qualities[0]
                    direct_url = streams[stream_key].url
                    print(f"✅ Got {stream_key} quality stream")
                    return direct_url
            else:
                print(f"❌ No streams found")
                return None
        except Exception as e:
            print(f"❌ Error resolving stream: {e}")
            return None
    
    def open(self):
        """Open the video capture"""
        for attempt in range(self.max_retries):
            try:
                if self.is_hls:
                    # For HLS streams, get direct URL using streamlink
                    print(f"📡 HLS stream detected: {self.url}")
                    direct_url = self._get_stream_url(self.url)
                    if direct_url:
                        self.stream_url = direct_url
                    else:
                        print(f"⚠️  Failed to resolve HLS stream, trying direct URL")
                        self.stream_url = self.url
                else:
                    print(f"🎥 Regular video/stream detected: {self.url}")
                
                # Open with OpenCV
                self.cap = cv2.VideoCapture(self.stream_url)
                
                # Configure for streaming
                if self.is_hls:
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer for live streams
                    self.cap.set(cv2.CAP_PROP_FPS, 30)  # Set expected FPS
                else:
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                
                if self.cap.isOpened():
                    print(f"✅ Stream opened successfully on attempt {attempt + 1}")
                    return True
                else:
                    print(f"❌ Failed to open stream on attempt {attempt + 1}")
                    
            except Exception as e:
                print(f"❌ Error on attempt {attempt + 1}: {e}")
                if self.cap:
                    self.cap.release()
                    self.cap = None
            
            if attempt < self.max_retries - 1:
                print(f"🔄 Retrying in 2 seconds...")
                time.sleep(2)
        
        return False
    
    def read(self):
        """Read frame from capture"""
        if self.cap and self.cap.isOpened():
            return self.cap.read()
        return False, None
    
    def isOpened(self):
        """Check if capture is opened"""
        return self.cap and self.cap.isOpened()
    
    def set(self, prop, value):
        """Set capture property"""
        if self.cap:
            return self.cap.set(prop, value)
        return False
    
    def get(self, prop):
        """Get capture property"""
        if self.cap:
            return self.cap.get(prop)
        return None
    
    def release(self):
        """Release the capture"""
        if self.cap:
            self.cap.release()
            self.cap = None
    
    def reconnect(self):
        """Reconnect to the stream"""
        print(f"🔄 Reconnecting to stream...")
        self.release()
        return self.open()


def create_stream_capture(url, max_retries=5):
    """Factory function to create a StreamCapture instance"""
    return StreamCapture(url, max_retries)


def test_stream_connection(url):
    """Test if a stream URL is accessible"""
    test_capture = StreamCapture(url, max_retries=1)
    success = test_capture.open()
    test_capture.release()
    return success


if __name__ == "__main__":
    # Test the stream handler
    test_urls = [
        "Videos/Demo1.mp4",  # Local file
        "https://wzmedia.dot.ca.gov/D12/WB91BEACH.stream/playlist.m3u8"  # HLS stream
    ]
    
    for url in test_urls:
        print(f"\n🧪 Testing: {url}")
        if test_stream_connection(url):
            print(f"✅ Connection successful")
        else:
            print(f"❌ Connection failed")