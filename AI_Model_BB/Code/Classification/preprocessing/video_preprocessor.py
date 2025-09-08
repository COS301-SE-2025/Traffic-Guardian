"""
Video preprocessing and enhancement for crash detection.
"""
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import logging

logger = logging.getLogger(__name__)


class EnhancedVideoPreprocessor:
    """Advanced video preprocessing for poor quality crash footage."""
    
    def __init__(self):
        self.denoise_kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]], dtype=np.float32)
        
    def enhance_frame_quality(self, frame: np.ndarray, enhancement_level: str = 'medium') -> np.ndarray:
        """
        Enhanced frame preprocessing for poor quality videos.
        
        Args:
            frame: Input frame
            enhancement_level: 'light', 'medium', 'heavy'
            
        Returns:
            Enhanced frame
        """
        if frame is None or frame.size == 0:
            return frame
            
        try:
            # Convert to PIL for better enhancement tools
            frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            
            if enhancement_level == 'heavy':
                # Heavy enhancement for very poor quality
                # Increase contrast
                enhancer = ImageEnhance.Contrast(frame_pil)
                frame_pil = enhancer.enhance(1.8)
                
                # Increase brightness slightly
                enhancer = ImageEnhance.Brightness(frame_pil)
                frame_pil = enhancer.enhance(1.2)
                
                # Increase sharpness
                enhancer = ImageEnhance.Sharpness(frame_pil)
                frame_pil = enhancer.enhance(2.0)
                
            elif enhancement_level == 'medium':
                # Medium enhancement for moderate quality issues
                enhancer = ImageEnhance.Contrast(frame_pil)
                frame_pil = enhancer.enhance(1.4)
                
                enhancer = ImageEnhance.Sharpness(frame_pil)
                frame_pil = enhancer.enhance(1.5)
                
            else:  # light enhancement
                enhancer = ImageEnhance.Contrast(frame_pil)
                frame_pil = enhancer.enhance(1.2)
                
            # Convert back to OpenCV format
            enhanced_frame = cv2.cvtColor(np.array(frame_pil), cv2.COLOR_RGB2BGR)
            
            # Additional OpenCV-based enhancements
            if enhancement_level in ['medium', 'heavy']:
                # Adaptive histogram equalization for better visibility
                lab = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2LAB)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                lab[:,:,0] = clahe.apply(lab[:,:,0])
                enhanced_frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
                
            if enhancement_level == 'heavy':
                # Noise reduction for very poor quality
                enhanced_frame = cv2.bilateralFilter(enhanced_frame, 9, 75, 75)
                
            return enhanced_frame
            
        except Exception as e:
            logger.warning(f"Frame enhancement failed: {e}, returning original frame")
            return frame

    def detect_video_quality(self, video_path: str) -> str:
        """
        Automatically detect video quality to determine enhancement level.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Quality level: 'good', 'medium', 'poor'
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return 'medium'  # Default if can't open
            
        quality_scores = []
        frame_count = 0
        max_frames_to_check = 10
        
        while frame_count < max_frames_to_check:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Calculate frame quality metrics
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Measure sharpness (Laplacian variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Measure brightness
            brightness = np.mean(gray)
            
            # Measure contrast (standard deviation)
            contrast = np.std(gray)
            
            # Combined quality score
            quality_score = laplacian_var * 0.4 + (contrast / 64) * 0.4 + (min(brightness, 255-brightness) / 128) * 0.2
            quality_scores.append(quality_score)
            frame_count += 1
            
        cap.release()
        
        if not quality_scores:
            return 'medium'
            
        avg_quality = np.mean(quality_scores)
        
        if avg_quality > 15:
            return 'good'
        elif avg_quality > 8:
            return 'medium'
        else:
            return 'poor'
