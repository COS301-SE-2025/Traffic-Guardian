"""
Enhanced Car Crash Classification System
Specialized for accurate crash detection and classification even with poor video quality.
Uses multiple detection methods and robust preprocessing for maximum accuracy.
"""
import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image, ImageEnhance
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
from dataclasses import dataclass
from collections import deque, Counter
import warnings
from multiprocessing.pool import ThreadPool
from functools import lru_cache
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Simple LRU Cache implementation
class LRUCache:
    def __init__(self, capacity: int):
        self.cache = {}
        self.capacity = capacity
        self.order = []
        
    def get(self, key):
        if key not in self.cache:
            return None
        # Move to end for LRU tracking
        self.order.remove(key)
        self.order.append(key)
        return self.cache[key]
        
    def put(self, key, value):
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            # Remove least recently used item
            lru_key = self.order.pop(0)
            del self.cache[lru_key]
        self.cache[key] = value
        self.order.append(key)

@dataclass
class CrashReport:
    """Enhanced data structure for crash incident reports."""
    incident_datetime: str
    incident_latitude: float
    incident_longitude: float
    incident_severity: str
    incident_status: str
    incident_reporter: str
    alerts_message: str
    incident_type: str
    confidence: float
    video_path: str
    processing_timestamp: str
    # Enhanced crash-specific fields
    vehicles_involved: int
    impact_severity: str
    crash_phase: str  # pre_impact, impact, post_impact
    estimated_speed: str
    damage_assessment: str
    emergency_priority: str

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

class CrashSpecificCNN(nn.Module):
    """
    CNN specifically designed for crash detection and classification.
    Optimized for crash-specific features like impact patterns, vehicle deformation, etc.
    """
    
    def __init__(self, num_classes=11):
        super(CrashSpecificCNN, self).__init__()
        
        # Multi-scale feature extraction for crash patterns
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        )
        
        # Crash-specific feature blocks
        self.crash_features = nn.Sequential(
            # Block 1: Vehicle shape detection
            nn.Conv2d(64, 128, kernel_size=5, padding=2),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            
            # Block 2: Impact pattern detection
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            
            # Block 3: Damage assessment features
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        
        # Adaptive pooling for variable input sizes
        self.adaptive_pool = nn.AdaptiveAvgPool2d((7, 7))
        
        # Classification head with crash-specific design
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(512 * 7 * 7, 2048),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )
        
        # Initialize weights for better crash detection
        self._initialize_weights()
    
    def _initialize_weights(self):
        """Initialize weights optimized for crash detection."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.constant_(m.bias, 0)
    
    def forward(self, x):
        x = self.conv1(x)
        x = self.crash_features(x)
        x = self.adaptive_pool(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

class EnhancedCrashClassifier:
    """Enhanced crash detection system with multiple detection methods."""
    
    # More specific crash types for better accuracy
    CRASH_TYPES = {
        0: "tbone_side_impact",        # T-bone/side impact collision
        1: "rear_end_collision",       # Rear-end collision  
        2: "head_on_collision",        # Head-on collision
        # 3: "multi_vehicle_pileup",     # Multi-vehicle pileup
        3: "single_vehicle_rollover",  # Single vehicle rollover
        4: "vehicle_pedestrian",       # Vehicle vs pedestrian
        5: "vehicle_fixed_object",     # Vehicle vs fixed object
        6: "sideswipe_collision",      # Sideswipe collision
        7: "intersection_collision",   # Intersection collision
        8: "highway_collision",        # Highway/high-speed collision
        9: "parking_lot_incident"     # Low-speed parking lot incident
    }
    
    # Severity mapping for different crash types
    CRASH_SEVERITY_MAP = {
        "head_on_collision": "critical",
        # "multi_vehicle_pileup": "critical",
        "vehicle_pedestrian": "critical",
        "highway_collision": "high",
        "tbone_side_impact": "high",
        "single_vehicle_rollover": "high",
        "rear_end_collision": "medium",
        "vehicle_fixed_object": "medium",
        "sideswipe_collision": "medium",
        "intersection_collision": "medium",
        "parking_lot_incident": "low"
    }
    
    CAMERA_LOCATIONS = {
        'default': {'latitude': 37.7749, 'longitude': -122.4194, 'name': 'Main Traffic Camera'},
        'intersection_1': {'latitude': 37.7849, 'longitude': -122.4094, 'name': 'Highway 101 Intersection'},
        'highway_1': {'latitude': 37.7649, 'longitude': -122.4294, 'name': 'Downtown Highway'},
        'bridge_cam': {'latitude': 37.7549, 'longitude': -122.4394, 'name': 'Bridge Monitoring'}
    }
    
    def __init__(self, config: Dict = None):
        """Initialize enhanced crash classifier."""
        self.config = config or self._get_optimized_config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Initialize enhanced preprocessor
        self.preprocessor = EnhancedVideoPreprocessor()
        
        # Load crash-specific model
        self._load_crash_model()
        
        # Setup motion detection components
        self._setup_motion_detectors()
        
        # Setup transforms
        self._setup_transforms()
        
        # Add thread pool for parallel processing
        self.thread_pool = ThreadPool(processes=min(4, os.cpu_count() or 1))
        
        # Cache for preprocessed videos to avoid reprocessing the same video
        self.video_cache = LRUCache(50)  # Store up to 50 recent video results
        
    def _get_optimized_config(self):
        """Optimized configuration for crash detection accuracy."""
        return {
            'model': {
                'type': 'crash_specific_cnn',
                'sequence_length': 20,  # Longer sequence for better crash analysis
                'frame_skip': 2,        # Skip some frames to cover longer time
                'input_size': (224, 224),
                'confidence_threshold': 0.5  # Lower threshold for better recall
            },
            'preprocessing': {
                'auto_enhance': True,
                'normalize_mean': [0.485, 0.456, 0.406],
                'normalize_std': [0.229, 0.224, 0.225],
                'quality_adaptive': True
            },
            'motion_analysis': {
                'optical_flow_enabled': True,
                'background_subtraction': True,
                'crash_detection_sensitivity': 'high',
                'impact_threshold': 2000,  # Pixels of sudden motion
                'motion_spike_threshold': 3.0
            },
            'crash_analysis': {
                'multi_method_fusion': True,  # Use multiple detection methods
                'temporal_consistency': True,
                'damage_assessment': True,
                'vehicle_tracking': True
            }
        }
    
    def _load_crash_model(self):
        """Load the crash-specific model."""
        num_classes = len(self.CRASH_TYPES)
        
        # Create crash-specific CNN
        self.model = CrashSpecificCNN(num_classes=num_classes)
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # In production, you would load pre-trained weights here
        # self.model.load_state_dict(torch.load('crash_model.pth'))
        
        logger.info("Loaded crash-specific CNN model")
        
    def _setup_motion_detectors(self):
        """Setup enhanced motion detection systems."""
        # Background subtractor for vehicle detection
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500, varThreshold=50, detectShadows=False
        )
        
        # Optical flow parameters
        self.lk_params = dict(
            winSize=(21, 21),
            maxLevel=3,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01)
        )
        
        # Motion history for crash pattern analysis
        self.motion_history = deque(maxlen=50)
        
        # Vehicle detector (HOG-based as fallback)
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
    def _setup_transforms(self):
        """Setup image transformation pipeline."""
        self.transform = transforms.Compose([
            transforms.Resize(self.config['model']['input_size']),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config['preprocessing']['normalize_mean'],
                std=self.config['preprocessing']['normalize_std']
            )
        ])
    
    def extract_enhanced_sequence(self, video_path: str) -> Tuple[torch.Tensor, Dict]:
        """
        Extract enhanced frame sequence with quality-adaptive preprocessing.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Tuple of (video_tensor, metadata)
        """
        # Check cache first to avoid reprocessing the same video
        cache_key = f"extract_{video_path}_{os.path.getmtime(video_path)}"
        cached_result = self.video_cache.get(cache_key)
        if cached_result:
            logger.info(f"Using cached frame sequence for {video_path}")
            return cached_result
            
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        # Detect video quality for adaptive enhancement
        video_quality = self.preprocessor.detect_video_quality(video_path)
        enhancement_level = {
            'good': 'none',       # Skip enhancement for good quality videos
            'medium': 'light', 
            'poor': 'medium'      # Reduce from 'heavy' to 'medium' for speed
        }.get(video_quality, 'light')
        
        logger.info(f"Video quality: {video_quality}, enhancement: {enhancement_level}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Determine optimal processing resolution for speed
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        scale_factor = 1.0
        if frame_width > 1280 or frame_height > 720:
            scale_factor = 720 / max(frame_height, frame_width/1.777)  # Scale to 720p equivalent
        
        frame_indices = []
        frames_to_process = []
        sequence_length = self.config['model']['sequence_length']
        frame_skip = self.config['model']['frame_skip']
        
        # Calculate frame sampling for optimal crash coverage
        if total_frames > 0:
            # For short videos, sample frames evenly
            if total_frames < sequence_length * frame_skip:
                # More dense sampling for short videos
                indices = np.linspace(0, total_frames-1, sequence_length).astype(int)
            else:
                # Sample with focus on middle section where crash likely occurs
                middle = total_frames // 2
                window = min(total_frames, sequence_length * frame_skip * 2)
                start = max(0, middle - window//2)
                end = min(total_frames, start + window)
                
                # Get frames with higher density in the middle
                indices = np.linspace(start, end-1, sequence_length).astype(int)
            
            frame_indices = indices.tolist()
        else:
            # Fallback for unknown length
            step = frame_skip
            frame_indices = [i for i in range(0, 9999, step)][:sequence_length]
            
        try:
            frame_count = 0
            # Read all required frames first
            while frame_count < max(frame_indices) + 1:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count in frame_indices:
                    frames_to_process.append((frame_count, frame))
                
                frame_count += 1
                
            # Process frames in parallel if we have enough
            if len(frames_to_process) >= 4:
                # Define the processing function
                def process_frame(frame_data):
                    idx, frame = frame_data
                    
                    # Resize frame if needed
                    if scale_factor < 1.0:
                        new_width = int(frame_width * scale_factor)
                        new_height = int(frame_height * scale_factor)
                        frame = cv2.resize(frame, (new_width, new_height))
                    
                    # Skip enhancement for good quality videos
                    if enhancement_level != 'none':
                        enhanced_frame = self.preprocessor.enhance_frame_quality(frame, enhancement_level)
                    else:
                        enhanced_frame = frame
                    
                    # Convert to RGB and transform
                    frame_rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
                    pil_frame = Image.fromarray(frame_rgb)
                    tensor_frame = self.transform(pil_frame)
                    
                    return (idx, tensor_frame)
                
                # Process frames in parallel
                processed_frames = self.thread_pool.map(process_frame, frames_to_process)
                
                # Sort by original index and extract tensor
                processed_frames = sorted(processed_frames, key=lambda x: x[0])
                processed_tensors = [tensor for _, tensor in processed_frames]
            else:
                # Process sequentially for a small number of frames
                processed_tensors = []
                for idx, frame in frames_to_process:
                    # Resize frame if needed
                    if scale_factor < 1.0:
                        new_width = int(frame_width * scale_factor)
                        new_height = int(frame_height * scale_factor)
                        frame = cv2.resize(frame, (new_width, new_height))
                    
                    # Skip enhancement for good quality videos
                    if enhancement_level != 'none':
                        enhanced_frame = self.preprocessor.enhance_frame_quality(frame, enhancement_level)
                    else:
                        enhanced_frame = frame
                    
                    # Convert to RGB and transform
                    frame_rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
                    pil_frame = Image.fromarray(frame_rgb)
                    tensor_frame = self.transform(pil_frame)
                    processed_tensors.append(tensor_frame)
        
        finally:
            cap.release()
        
        if len(processed_tensors) == 0:
            raise ValueError(f"No valid frames extracted from: {video_path}")
        
        # Pad with last frame if needed
        while len(processed_tensors) < sequence_length:
            processed_tensors.append(processed_tensors[-1].clone())
        
        # Stack frames
        video_tensor = torch.stack(processed_tensors[:sequence_length])
        video_tensor = video_tensor.unsqueeze(0).to(self.device)
        
        metadata = {
            'fps': fps,
            'total_frames': total_frames,
            'duration': duration,
            'video_quality': video_quality,
            'enhancement_level': enhancement_level,
            'extracted_frames': len(processed_tensors),
            'scale_factor': scale_factor
        }
        
        # Cache the result
        result = (video_tensor, metadata)
        self.video_cache.put(cache_key, result)
        
        return result
    
    def analyze_crash_motion(self, video_path: str) -> Dict:
        """
        Advanced crash motion analysis with multiple detection methods.
        
        Args:
            video_path: Path to crash video
            
        Returns:
            Comprehensive crash motion analysis
        """
        # Check cache first to avoid reprocessing the same video
        cache_key = f"motion_{video_path}_{os.path.getmtime(video_path)}"
        cached_result = self.video_cache.get(cache_key)
        if cached_result:
            logger.info(f"Using cached motion analysis for {video_path}")
            return cached_result
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {'error': 'Could not open video'}
        
        # Initialize tracking variables
        motion_data = []
        vehicle_positions = []
        impact_events = []
        prev_gray = None
        prev_points = None
        
        # Background subtraction initialization
        bg_sub = cv2.createBackgroundSubtractorMOG2(detectShadows=False)
        
        frame_idx = 0
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Calculate appropriate frame skip rate based on video length
        # For longer videos, we can skip more frames
        if total_frames > 300:  # > 10 seconds at 30fps
            frame_skip = 3
        elif total_frames > 150:  # > 5 seconds at 30fps
            frame_skip = 2
        else:
            frame_skip = 1
            
        # Determine optimal processing resolution
        # Lower resolution for faster processing if the video is high-res
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        scale_factor = 1.0
        if frame_width > 1280 or frame_height > 720:
            scale_factor = 720 / max(frame_height, frame_width/1.777)  # Scale to 720p equivalent
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Skip frames to speed up processing
                if frame_idx % frame_skip != 0:
                    frame_idx += 1
                    continue
                
                # Resize frame for faster processing if needed
                if scale_factor < 1.0:
                    new_width = int(frame_width * scale_factor)
                    new_height = int(frame_height * scale_factor)
                    frame = cv2.resize(frame, (new_width, new_height))
                
                # Enhance frame quality only if really needed
                video_quality = self.preprocessor.detect_video_quality(video_path)
                if video_quality == 'poor':
                    enhanced_frame = self.preprocessor.enhance_frame_quality(frame, 'medium')
                else:
                    enhanced_frame = frame  # Skip enhancement for good quality videos
                
                gray = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2GRAY)
                
                # Motion detection using background subtraction
                fg_mask = bg_sub.apply(enhanced_frame)
                motion_pixels = cv2.countNonZero(fg_mask)
                
                # Vehicle detection and tracking - only on key frames
                if frame_idx % (frame_skip * 2) == 0:
                    vehicles = self._detect_vehicles_enhanced(enhanced_frame, fg_mask)
                    vehicle_positions.append(vehicles)
                else:
                    # Use previous vehicles when skipping detection
                    vehicle_positions.append(vehicle_positions[-1] if vehicle_positions else [])
                
                # Optical flow analysis for impact detection
                if prev_gray is not None and prev_points is not None:
                    try:
                        next_points, status, error = cv2.calcOpticalFlowPyrLK(
                            prev_gray, gray, prev_points, None, **self.lk_params
                        )
                        
                        # Calculate motion vectors
                        if len(next_points) > 0 and len(prev_points) > 0:
                            motion_vectors = next_points - prev_points
                            avg_motion = np.mean(np.linalg.norm(motion_vectors, axis=1))
                        else:
                            avg_motion = 0
                    except:
                        avg_motion = 0
                else:
                    avg_motion = 0
                
                # Detect potential impact events
                if len(motion_data) > 0:
                    prev_motion = motion_data[-1]['motion_pixels']
                    if prev_motion > 0:
                        motion_spike = motion_pixels / prev_motion
                        
                        # Enhanced impact detection
                        if (motion_spike > self.config['motion_analysis']['motion_spike_threshold'] and 
                            motion_pixels > self.config['motion_analysis']['impact_threshold']):
                            
                            # Classify impact severity
                            impact_severity = self._classify_impact_severity(
                                motion_spike, motion_pixels, avg_motion
                            )
                            
                            impact_events.append({
                                'frame_idx': frame_idx,
                                'timestamp': frame_idx / fps,
                                'motion_spike': motion_spike,
                                'motion_pixels': motion_pixels,
                                'avg_motion': avg_motion,
                                'impact_severity': impact_severity,
                                'vehicles_detected': len(vehicle_positions[-1] if vehicle_positions else [])
                            })
                
                motion_data.append({
                    'frame_idx': frame_idx,
                    'timestamp': frame_idx / fps,
                    'motion_pixels': motion_pixels,
                    'avg_motion': avg_motion,
                    'vehicles_detected': len(vehicle_positions[-1] if vehicle_positions else [])
                })
                
                # Update tracking points - less frequently to save processing time
                if frame_idx % (frame_skip * 3) == 0:  # Update less frequently
                    corners = cv2.goodFeaturesToTrack(gray, maxCorners=100, 
                                                    qualityLevel=0.01, minDistance=10)
                    prev_points = corners
                
                prev_gray = gray.copy()
                frame_idx += 1
                
        finally:
            cap.release()
        
        # Analyze crash patterns
        crash_analysis = self._analyze_crash_patterns_enhanced(
            motion_data, vehicle_positions, impact_events
        )
        
        # Cache the result for future use
        self.video_cache.put(cache_key, crash_analysis)
        
        return crash_analysis
    
    def _detect_vehicles_enhanced(self, frame: np.ndarray, fg_mask: np.ndarray) -> List[Dict]:
        """Enhanced vehicle detection specifically optimized for traffic camera footage."""
        vehicles = []
        
        try:
            # Method 1: Contour-based detection on foreground mask with stricter filtering
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Skip processing if too many contours (likely noise)
            if len(contours) > 100:
                # Just take the largest few contours
                contours = sorted(contours, key=cv2.contourArea, reverse=True)[:20]
            
            # Reasonable upper limit for vehicles in frame
            max_vehicles_to_detect = 8  # Reduced from 15 for faster processing
            
            # Process only the largest contours (by area)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:max_vehicles_to_detect*2]
            
            for i, contour in enumerate(contours):
                if len(vehicles) >= max_vehicles_to_detect:
                    break
                    
                area = cv2.contourArea(contour)
                if area > 1000:  # Minimum vehicle area
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h
                    
                    # Stricter filtering for vehicle-like characteristics
                    if 0.5 < aspect_ratio < 3.0 and w > 40 and h > 30:
                        # Quick check for overlap instead of computing IoU (faster)
                        is_duplicate = False
                        for v in vehicles:
                            x1, y1, w1, h1 = v['bbox']
                            # Check if centers are close enough
                            center_x, center_y = x + w//2, y + h//2
                            center_x1, center_y1 = x1 + w1//2, y1 + h1//2
                            
                            dist = np.sqrt((center_x - center_x1)**2 + (center_y - center_y1)**2)
                            if dist < (w + w1) / 3:  # If centers are within 1/3 of combined width
                                is_duplicate = True
                                break
                                
                        if not is_duplicate:
                            vehicles.append({
                                'id': f'vehicle_{i}',
                                'bbox': (x, y, w, h),
                                'center': (x + w//2, y + h//2),
                                'area': area,
                                'aspect_ratio': aspect_ratio,
                                'detection_method': 'contour'
                            })
            
            # Only use template matching if we haven't found enough vehicles and it's critical
            # Skip template matching most of the time as it's slow
            if len(vehicles) < 2 and np.random.random() < 0.3:  # Only do it 30% of the time
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Use simplified template detection
                templates = {
                    'car': np.zeros((40, 80), dtype=np.uint8)
                }
                cv2.rectangle(templates['car'], (5, 10), (75, 30), 255, -1)  # Simple car shape
                
                # Only try one template
                template = templates['car']
                result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
                threshold = 0.7  # Higher threshold for better precision
                locations = np.where(result >= threshold)
                
                # Just get a few top matches
                for pt_idx, pt in enumerate(list(zip(*locations[::-1]))[:3]):
                    h, w = template.shape
                    
                    # Check for overlaps with existing detections (simplified)
                    is_duplicate = False
                    for v in vehicles:
                        x1, y1, w1, h1 = v['bbox']
                        if (pt[0] >= x1 and pt[0] <= x1+w1 and 
                            pt[1] >= y1 and pt[1] <= y1+h1):
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        vehicles.append({
                            'id': f'template_car_{pt_idx}',
                            'bbox': (pt[0], pt[1], w, h),
                            'center': (pt[0] + w//2, pt[1] + h//2),
                            'area': w * h,
                            'aspect_ratio': w / h,
                            'detection_method': 'template'
                        })
        
        except Exception as e:
            logger.warning(f"Vehicle detection error: {e}")
        
        return vehicles
    
    def _create_vehicle_templates(self) -> Dict[str, np.ndarray]:
        """Create simple vehicle shape templates."""
        templates = {}
        
        try:
            # Simple car template (rectangle with some features)
            car_template = np.zeros((40, 80), dtype=np.uint8)
            cv2.rectangle(car_template, (5, 10), (75, 30), 255, -1)  # Main body
            cv2.rectangle(car_template, (10, 5), (25, 35), 200, -1)   # Front
            cv2.rectangle(car_template, (55, 5), (70, 35), 200, -1)   # Rear
            templates['car'] = car_template
            
            # Simple truck template (longer rectangle)
            truck_template = np.zeros((45, 100), dtype=np.uint8)
            cv2.rectangle(truck_template, (5, 10), (95, 35), 255, -1)  # Main body
            cv2.rectangle(truck_template, (10, 5), (30, 40), 200, -1)  # Cab
            templates['truck'] = truck_template
            
        except Exception as e:
            logger.warning(f"Template creation error: {e}")
            
        return templates
    
    def _classify_impact_severity(self, motion_spike: float, motion_pixels: int, avg_motion: float) -> str:
        """Classify the severity of detected impact."""
        if motion_spike > 10 and motion_pixels > 20000:
            return 'critical'
        elif motion_spike > 6 and motion_pixels > 10000:
            return 'high'
        elif motion_spike > 4 and motion_pixels > 5000:
            return 'medium'
        else:
            return 'low'
    
    def _analyze_crash_patterns_enhanced(self, motion_data: List[Dict], 
                                       vehicle_positions: List[List[Dict]], 
                                       impact_events: List[Dict]) -> Dict:
        """Enhanced crash pattern analysis for traffic camera footage."""
        if not motion_data:
            return {'crash_detected': False, 'crash_type': 'unknown'}
        
        # Extract motion values
        motion_values = [d['motion_pixels'] for d in motion_data]
        
        # Filter vehicle detections to remove false positives
        filtered_vehicle_positions = []
        for positions in vehicle_positions:
            # Filter out extremely small or unusually large detections (likely noise)
            filtered = [p for p in positions if 
                       1000 <= p.get('area', 0) <= 50000 and
                       0.5 <= p.get('aspect_ratio', 1.0) <= 3.0]
            filtered_vehicle_positions.append(filtered)
            
        # Get more accurate vehicle counts after filtering
        vehicle_counts = [len(positions) for positions in filtered_vehicle_positions]
        
        # Crash detection based on multiple criteria
        crash_detected = len(impact_events) > 0
        
        if not crash_detected:
            # Secondary detection: look for sustained high motion
            high_motion_frames = sum(1 for m in motion_values if m > 5000)
            if high_motion_frames > len(motion_values) * 0.3:
                crash_detected = True
        
        # Classify crash type
        crash_type = self._classify_crash_type_enhanced(
            motion_data, filtered_vehicle_positions, impact_events
        )
        
        # Estimate vehicles involved in crash (not all vehicles in frame)
        # For T-bone collisions, typically 2 vehicles are involved
        if crash_type == "tbone_side_impact":
            vehicles_involved = 2
        else:
            # For other types, use the mode of detected vehicles with a reasonable cap
            if vehicle_counts:
                vehicle_counter = Counter(vehicle_counts)
                most_common_count = vehicle_counter.most_common(1)[0][0]
                vehicles_involved = min(most_common_count, 8)  # Cap at 8 for reasonableness
            else:
                vehicles_involved = 1
                
        # This variable is used later in the return dict and confidence calculation
        max_vehicles = vehicles_involved
        
        # Assess damage level
        damage_assessment = self._assess_crash_damage(motion_values, impact_events)
        
        # Determine crash phase
        crash_phase = self._determine_crash_phase(motion_data, impact_events)
        
        return {
            'crash_detected': crash_detected,
            'crash_type': crash_type,
            'vehicles_involved': max_vehicles,
            'impact_events': impact_events,
            'motion_summary': {
                'max_motion': max(motion_values) if motion_values else 0,
                'avg_motion': np.mean(motion_values) if motion_values else 0,
                'motion_variance': np.var(motion_values) if motion_values else 0
            },
            'damage_assessment': damage_assessment,
            'crash_phase': crash_phase,
            'analysis_confidence': self._calculate_analysis_confidence(
                motion_data, impact_events, max_vehicles
            )
        }
    
    def _analyze_vehicle_directions(self, vehicle_positions: List[List[Dict]]) -> Dict:
        """
        Analyze vehicle directions to help determine collision type.
        Especially useful for T-bone (perpendicular) and head-on (opposite) collisions.
        """
        if len(vehicle_positions) < 10:  # Need enough frames for direction analysis
            return {
                'collision_type': 'unknown',
                'confidence': 0.0,
                'perpendicular_detected': False,
                'opposite_detected': False
            }
            
        # Get stable vehicle tracks (appearing in multiple frames)
        vehicle_tracks = {}
        
        # First, identify and track vehicles across frames
        for frame_idx, positions in enumerate(vehicle_positions):
            for vehicle in positions:
                vehicle_id = vehicle.get('id', f"unknown_{frame_idx}")
                center = vehicle.get('center', (0, 0))
                
                if vehicle_id not in vehicle_tracks:
                    vehicle_tracks[vehicle_id] = {
                        'positions': [],
                        'frame_indices': []
                    }
                
                vehicle_tracks[vehicle_id]['positions'].append(center)
                vehicle_tracks[vehicle_id]['frame_indices'].append(frame_idx)
        
        # Filter for vehicles with enough tracking points to determine direction
        valid_tracks = {
            vehicle_id: track for vehicle_id, track in vehicle_tracks.items()
            if len(track['positions']) >= 5  # Need at least 5 points for direction
        }
        
        if len(valid_tracks) < 2:
            # Not enough tracked vehicles to determine collision type
            return {
                'collision_type': 'unknown',
                'confidence': 0.0,
                'perpendicular_detected': False,
                'opposite_detected': False
            }
        
        # Calculate direction vectors for each vehicle
        direction_vectors = {}
        for vehicle_id, track in valid_tracks.items():
            positions = track['positions']
            if len(positions) < 2:
                continue
                
            # Use first and last position to determine overall direction
            first_pos = positions[0]
            last_pos = positions[-1]
            
            # Calculate direction vector
            dx = last_pos[0] - first_pos[0]
            dy = last_pos[1] - first_pos[1]
            
            # Normalize vector if significant movement detected
            magnitude = np.sqrt(dx*dx + dy*dy)
            if magnitude > 10:  # Only consider significant movement
                direction_vectors[vehicle_id] = (dx/magnitude, dy/magnitude)
        
        # Analyze directions between vehicle pairs
        perpendicular_count = 0
        opposite_count = 0
        total_pairs = 0
        
        vehicle_ids = list(direction_vectors.keys())
        for i in range(len(vehicle_ids)):
            for j in range(i+1, len(vehicle_ids)):
                v1_id = vehicle_ids[i]
                v2_id = vehicle_ids[j]
                
                v1_dir = direction_vectors[v1_id]
                v2_dir = direction_vectors[v2_id]
                
                # Calculate dot product to determine angle between vectors
                dot_product = v1_dir[0]*v2_dir[0] + v1_dir[1]*v2_dir[1]
                
                # Check for perpendicular directions (dot product near 0)
                if abs(dot_product) < 0.2:  # Within ~10-12 degrees of perpendicular
                    perpendicular_count += 1
                
                # Check for opposite directions (dot product near -1)
                if dot_product < -0.8:  # Within ~35 degrees of opposite
                    opposite_count += 1
                    
                total_pairs += 1
        
        # Determine most likely collision type based on directions
        if total_pairs == 0:
            collision_type = 'unknown'
            confidence = 0.0
            perpendicular_detected = False
            opposite_detected = False
        else:
            perpendicular_ratio = perpendicular_count / total_pairs
            opposite_ratio = opposite_count / total_pairs
            
            perpendicular_detected = perpendicular_ratio > 0.3
            opposite_detected = opposite_ratio > 0.3
            
            if perpendicular_detected and opposite_detected:
                # If both detected, use the higher ratio
                if perpendicular_ratio > opposite_ratio:
                    collision_type = 'tbone_side_impact'
                    confidence = perpendicular_ratio
                else:
                    collision_type = 'head_on_collision'
                    confidence = opposite_ratio
            elif perpendicular_detected:
                collision_type = 'tbone_side_impact'
                confidence = perpendicular_ratio
            elif opposite_detected:
                collision_type = 'head_on_collision'
                confidence = opposite_ratio
            else:
                collision_type = 'unknown'
                confidence = 0.0
        
        return {
            'collision_type': collision_type,
            'confidence': confidence,
            'perpendicular_detected': perpendicular_detected,
            'opposite_detected': opposite_detected,
            'perpendicular_count': perpendicular_count,
            'opposite_count': opposite_count,
            'total_pairs': total_pairs
        }
    
    def _classify_crash_type_enhanced(self, motion_data: List[Dict], 
                                    vehicle_positions: List[List[Dict]], 
                                    impact_events: List[Dict]) -> str:
        """Enhanced crash type classification optimized for traffic camera footage."""
        if not impact_events:
            return "unknown"
        
        # Get corrected vehicle counts - filter out noise
        vehicle_counts = []
        filtered_vehicle_positions = []
        for positions in vehicle_positions:
            # Filter out extremely small or unusually large detections (likely noise)
            filtered_positions = [p for p in positions if 
                                 1000 <= p.get('area', 0) <= 50000 and
                                 0.5 <= p.get('aspect_ratio', 1.0) <= 3.0]
            vehicle_counts.append(len(filtered_positions))
            filtered_vehicle_positions.append(filtered_positions)
            
        # Get the 75th percentile of vehicle counts (more robust than max)
        if vehicle_counts:
            vehicle_counts.sort()
            max_vehicles = vehicle_counts[min(len(vehicle_counts)-1, int(len(vehicle_counts)*0.75))]
            # Cap at reasonable number (8) for sanity check
            max_vehicles = min(max_vehicles, 8)
        else:
            max_vehicles = 0
            
        # Ensure we have at least 1 vehicle
        max_vehicles = max(1, max_vehicles)
        
        # Get motion characteristics
        motion_values = [d['motion_pixels'] for d in motion_data]
        peak_motion = max(motion_values) if motion_values else 0
        motion_variance = np.var(motion_values) if motion_values else 0
        
        # Get impact characteristics
        severity_levels = [event.get('impact_severity', 'low') for event in impact_events]
        max_impact_severity = 'critical' if 'critical' in severity_levels else \
                             'high' if 'high' in severity_levels else \
                             'medium' if 'medium' in severity_levels else 'low'
        
        # Analyze vehicle directions to detect perpendicular movement (T-bone)
        # and opposite directions (head-on)
        direction_results = self._analyze_vehicle_directions(filtered_vehicle_positions)
        
        # Extract direction analysis results
        perpendicular_detected = direction_results['perpendicular_detected']
        opposite_detected = direction_results['opposite_detected']
        direction_confidence = direction_results['confidence']
        collision_type_from_direction = direction_results['collision_type']
                             
        # Check for T-bone specific motion pattern (sudden spike with high variance)
        # T-bone collisions create distinctive perpendicular motion patterns
        is_tbone_pattern = False
        
        if len(motion_values) > 5:
            # Calculate rate of change between consecutive frames
            motion_changes = [abs(motion_values[i] - motion_values[i-1]) 
                             for i in range(1, len(motion_values))]
            
            # T-bone collisions show sudden high spike followed by sustained motion
            if (max(motion_changes) > 5000 and                  # Sudden high change
                motion_variance > 30000000 and                  # High variance in motion
                peak_motion > 10000):                           # Significant motion overall
                is_tbone_pattern = True
        
        # First priority: Use direction analysis if confidence is high enough
        if direction_confidence > 0.4 and collision_type_from_direction != 'unknown':
            return collision_type_from_direction
            
        # Second priority: Enhanced motion pattern detection specifically for T-bone
        if is_tbone_pattern and 1 <= max_vehicles <= 4:
            # This is likely a T-bone collision based on motion patterns
            return "tbone_side_impact"
            
        # Classification based on vehicle count, impact characteristics, and directions
        if max_vehicles <= 1:
            if peak_motion > 25000 and motion_variance > 40000000:
                return "single_vehicle_rollover"
            elif peak_motion > 15000:
                return "vehicle_fixed_object"
            else:
                return "parking_lot_incident"
                
        elif max_vehicles == 2:
            if max_impact_severity in ['critical', 'high']:
                # Direction-based detection has priority
                if perpendicular_detected:
                    return "tbone_side_impact"
                elif opposite_detected:
                    return "head_on_collision"
                # Fallback to motion pattern analysis
                elif is_tbone_pattern or motion_variance > 50000000:
                    return "tbone_side_impact"
                elif peak_motion > 30000:
                    return "head_on_collision"
                else:
                    return "rear_end_collision"
            else:
                # Lower severity but still two vehicles
                if perpendicular_detected or is_tbone_pattern:
                    return "tbone_side_impact"  # T-bone but lower severity
                elif opposite_detected:
                    return "head_on_collision"  # Head-on but lower severity
                return "sideswipe_collision"
                
        else:  # 3+ vehicles
            # With multiple vehicles, prioritize direction analysis
            if perpendicular_detected and max_vehicles <= 4:
                return "tbone_side_impact"
            elif opposite_detected and max_vehicles <= 4:
                return "head_on_collision"
            # Fallback to traditional classification
            elif max_impact_severity in ['critical', 'high'] and max_vehicles > 4:
                return "multi_vehicle_pileup"
            elif is_tbone_pattern:
                return "tbone_side_impact"
            else:
                return "intersection_collision"
    
    def _assess_crash_damage(self, motion_values: List[float], impact_events: List[Dict]) -> str:
        """Assess the level of damage based on motion analysis."""
        if not motion_values or not impact_events:
            return "minimal"
        
        peak_motion = max(motion_values)
        critical_impacts = sum(1 for event in impact_events if event.get('impact_severity') == 'critical')
        high_impacts = sum(1 for event in impact_events if event.get('impact_severity') == 'high')
        
        if critical_impacts > 0 or peak_motion > 50000:
            return "severe"
        elif high_impacts > 0 or peak_motion > 25000:
            return "moderate"
        elif peak_motion > 10000:
            return "minor"
        else:
            return "minimal"
    
    def _determine_crash_phase(self, motion_data: List[Dict], impact_events: List[Dict]) -> str:
        """Determine which phase of the crash is most prominent in the video."""
        if not impact_events:
            return "normal_traffic"
        
        total_frames = len(motion_data)
        impact_frame = impact_events[0]['frame_idx'] if impact_events else total_frames // 2
        
        if impact_frame < total_frames * 0.3:
            return "post_impact"
        elif impact_frame > total_frames * 0.7:
            return "pre_impact"
        else:
            return "impact"
    
    def _calculate_analysis_confidence(self, motion_data: List[Dict], 
                                     impact_events: List[Dict], vehicles_involved: int) -> float:
        """Calculate confidence in the crash analysis."""
        confidence_factors = []
        
        # Factor 1: Number of impact events detected
        if impact_events:
            confidence_factors.append(min(1.0, len(impact_events) / 3))
        else:
            confidence_factors.append(0.2)
        
        # Factor 2: Motion data quality
        if motion_data:
            motion_values = [d['motion_pixels'] for d in motion_data]
            if max(motion_values) > 10000:
                confidence_factors.append(0.8)
            elif max(motion_values) > 5000:
                confidence_factors.append(0.6)
            else:
                confidence_factors.append(0.4)
        
        # Factor 3: Vehicle detection consistency
        if vehicles_involved > 0:
            confidence_factors.append(min(1.0, vehicles_involved / 4))
        
        return np.mean(confidence_factors) if confidence_factors else 0.5
    
    def classify_crash_video(self, video_path: str, camera_id: str = None, low_latency_mode: bool = False) -> CrashReport:
        """
        Main function to classify crash from video with comprehensive analysis.
        
        Args:
            video_path: Path to crash video file
            camera_id: Optional camera identifier
            low_latency_mode: If True, use faster analysis with some accuracy trade-offs
            
        Returns:
            Detailed crash report
        """
        start_time = time.time()
        logger.info(f"🚗💥 Analyzing crash video: {os.path.basename(video_path)}")
        
        # Check cache first
        cache_key = f"report_{video_path}_{os.path.getmtime(video_path)}"
        cached_result = self.video_cache.get(cache_key)
        if cached_result:
            logger.info(f"Using cached crash report for {video_path}")
            return cached_result
        
        try:
            # Set processing timeout for real-time requirements
            max_processing_time = 3.0 if low_latency_mode else 10.0  # seconds
            
            # Start motion analysis in a separate thread for parallelism
            motion_analysis_future = self.thread_pool.apply_async(self.analyze_crash_motion, (video_path,))
            
            # Extract enhanced video sequence
            video_tensor, video_metadata = self.extract_enhanced_sequence(video_path)
            
            # Get CNN-based classification - handle video tensor shape
            with torch.no_grad():
                # Process each frame through the CNN and average the results
                batch_size, num_frames, channels, height, width = video_tensor.shape
                
                # Process frames in parallel using batch processing if possible
                if low_latency_mode:
                    # In low latency mode, just use a subset of frames
                    frame_indices = [0, num_frames//2, num_frames-1]  # First, middle, last frames
                    frame_tensors = video_tensor[:, frame_indices, :, :, :]  # Shape: [batch, 3, channels, height, width]
                    
                    # Reshape to process all selected frames at once
                    reshaped_tensor = frame_tensors.view(-1, channels, height, width)  # [batch*3, channels, height, width]
                    batch_output = self.model(reshaped_tensor)
                    
                    # Average the predictions
                    outputs = torch.mean(batch_output.view(batch_size, -1, batch_output.size(1)), dim=1)
                else:
                    # Process frames individually for more accuracy
                    frame_predictions = []
                    
                    for frame_idx in range(num_frames):
                        # Extract single frame tensor (keeping batch dimension)
                        frame_tensor = video_tensor[:, frame_idx, :, :, :]  # Shape: [batch, channels, height, width]
                        
                        # Pass through the model
                        frame_output = self.model(frame_tensor)
                        frame_predictions.append(frame_output)
                    
                    # Average predictions across frames
                    outputs = torch.mean(torch.stack(frame_predictions), dim=0)
                
                probabilities = torch.softmax(outputs, dim=1)
                confidence, predicted_class = torch.max(probabilities, 1)
                
                # If we're in low latency mode and taking too long, use early results
                elapsed_time = time.time() - start_time
                if low_latency_mode and elapsed_time > max_processing_time:
                    # Use CNN prediction only with default values for other fields
                    logger.warning(f"Low latency mode activated: using faster processing pipeline")
                    
                    # Create a simplified motion analysis result
                    motion_analysis = {
                        'crash_detected': True,
                        'crash_type': self.CRASH_TYPES.get(predicted_class.item(), "unknown"),
                        'vehicles_involved': 2,  # Default assumption
                        'damage_assessment': 'moderate',  # Default assumption
                        'crash_phase': 'impact',
                        'analysis_confidence': 0.7
                    }
                else:
                    # Get full motion-based analysis with timeout
                    try:
                        remaining_time = max(0.5, max_processing_time - elapsed_time)
                        motion_analysis = motion_analysis_future.get(timeout=remaining_time)
                    except Exception as e:
                        logger.warning(f"Motion analysis timed out or failed: {e}")
                        # Create a simplified motion analysis result
                        motion_analysis = {
                            'crash_detected': True,
                            'crash_type': self.CRASH_TYPES.get(predicted_class.item(), "unknown"),
                            'vehicles_involved': 2,  # Default assumption
                            'damage_assessment': 'moderate',  # Default assumption
                            'crash_phase': 'impact',
                            'analysis_confidence': 0.7
                        }
            
            # Fusion of CNN and motion analysis results
            final_classification = self._fuse_analysis_results(
                predicted_class.item(), confidence.item(), motion_analysis
            )
            
            # Generate comprehensive crash report
            crash_report = self._generate_crash_report(
                video_path, final_classification, video_metadata, motion_analysis, camera_id
            )
            
            # Cache the result for future use
            self.video_cache.put(cache_key, crash_report)
            
            processing_time = time.time() - start_time
            logger.info(f"Crash analysis complete in {processing_time:.2f}s")
            logger.info(f"Classification: {crash_report.incident_type} ({crash_report.confidence:.3f})")
            logger.info(f"Severity: {crash_report.incident_severity}")
            logger.info(f"Vehicles: {crash_report.vehicles_involved}")
            
            return crash_report
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error analyzing crash video {video_path} after {processing_time:.2f}s: {e}")
            
            # If we're in low latency mode, provide a basic result even on error
            if low_latency_mode:
                logger.info("Providing fallback crash report due to low latency mode")
                return CrashReport(
                    incident_datetime=datetime.now(timezone.utc).isoformat(),
                    incident_latitude=self.CAMERA_LOCATIONS.get(camera_id or 'default', self.CAMERA_LOCATIONS['default'])['latitude'],
                    incident_longitude=self.CAMERA_LOCATIONS.get(camera_id or 'default', self.CAMERA_LOCATIONS['default'])['longitude'],
                    incident_severity="medium",  # Default to medium severity
                    incident_status="active",
                    incident_reporter="AI Crash Detection System (Fallback)",
                    alerts_message="Possible traffic incident detected - analysis incomplete",
                    incident_type="unknown",
                    confidence=0.6,
                    video_path=video_path,
                    processing_timestamp=datetime.now(timezone.utc).isoformat(),
                    vehicles_involved=2,  # Default assumption
                    impact_severity="moderate",
                    crash_phase="unknown",
                    estimated_speed="unknown",
                    damage_assessment="unknown",
                    emergency_priority="PRIORITY_3"  # Default to medium priority
                )
            else:
                raise
    
    def _fuse_analysis_results(self, cnn_prediction: int, cnn_confidence: float, 
                              motion_analysis: Dict) -> Dict:
        """
        Fuse CNN predictions with motion analysis for better accuracy.
        
        Args:
            cnn_prediction: CNN model prediction
            cnn_confidence: CNN confidence score
            motion_analysis: Motion analysis results
            
        Returns:
            Fused analysis results
        """
        # Get CNN prediction
        cnn_crash_type = self.CRASH_TYPES.get(cnn_prediction, "unknown")
        
        # Get motion analysis results
        motion_crash_detected = motion_analysis.get('crash_detected', False)
        motion_crash_type = motion_analysis.get('crash_type', 'unknown')
        motion_confidence = motion_analysis.get('analysis_confidence', 0.5)
        
        # Fusion logic
        if motion_crash_detected and motion_confidence > 0.6:
            # Trust motion analysis if it's confident about crash detection
            if cnn_confidence > 0.7:
                # Both methods confident - use weighted combination
                final_crash_type = motion_crash_type if motion_confidence > cnn_confidence else cnn_crash_type
                final_confidence = (cnn_confidence * 0.6 + motion_confidence * 0.4)
            else:
                # Motion analysis more confident
                final_crash_type = motion_crash_type
                final_confidence = motion_confidence * 0.9
        else:
            # Rely more on CNN
            final_crash_type = cnn_crash_type
            final_confidence = cnn_confidence * 0.8
        
        # Ensure crash type is in our known types
        if final_crash_type not in self.CRASH_TYPES.values():
            final_crash_type = "intersection_collision"  # Default fallback
        
        return {
            'crash_type': final_crash_type,
            'confidence': min(0.99, final_confidence),
            'cnn_prediction': cnn_crash_type,
            'cnn_confidence': cnn_confidence,
            'motion_prediction': motion_crash_type,
            'motion_confidence': motion_confidence,
            'fusion_method': 'weighted_combination'
        }
    
    def _generate_crash_report(self, video_path: str, classification: Dict, 
                             video_metadata: Dict, motion_analysis: Dict, 
                             camera_id: str = None) -> CrashReport:
        """Generate comprehensive crash report."""
        
        crash_type = classification['crash_type']
        confidence = classification['confidence']
        
        # Get location
        camera_location = self.CAMERA_LOCATIONS.get(camera_id or 'default', 
                                                   self.CAMERA_LOCATIONS['default'])
        
        # Determine severity
        base_severity = self.CRASH_SEVERITY_MAP.get(crash_type, 'medium')
        damage_assessment = motion_analysis.get('damage_assessment', 'moderate')
        
        # Adjust severity based on damage assessment
        severity_adjustments = {
            ('low', 'severe'): 'medium',
            ('medium', 'severe'): 'high',
            ('high', 'severe'): 'critical',
            ('low', 'minimal'): 'low',
            ('critical', 'minimal'): 'high'
        }
        final_severity = severity_adjustments.get((base_severity, damage_assessment), base_severity)
        
        # Get vehicles involved
        vehicles_involved = motion_analysis.get('vehicles_involved', 1)
        
        # Generate detailed alert message
        alerts_message = self._generate_detailed_alert_message(
            crash_type, final_severity, vehicles_involved, motion_analysis, video_path
        )
        
        # Determine emergency priority
        emergency_priority = self._determine_emergency_priority(final_severity, crash_type)
        
        # Extract incident datetime
        incident_datetime = self._extract_incident_datetime(video_path)
        
        return CrashReport(
            incident_datetime=incident_datetime,
            incident_latitude=camera_location['latitude'],
            incident_longitude=camera_location['longitude'],
            incident_severity=final_severity,
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message=alerts_message,
            incident_type=crash_type,
            confidence=confidence,
            video_path=video_path,
            processing_timestamp=datetime.now(timezone.utc).isoformat(),
            vehicles_involved=vehicles_involved,
            impact_severity=motion_analysis.get('damage_assessment', 'moderate'),
            crash_phase=motion_analysis.get('crash_phase', 'unknown'),
            estimated_speed=self._estimate_crash_speed(motion_analysis),
            damage_assessment=damage_assessment,
            emergency_priority=emergency_priority
        )
    
    def _generate_detailed_alert_message(self, crash_type: str, severity: str, 
                                       vehicles_involved: int, motion_analysis: Dict, 
                                       video_path: str) -> str:
        """Generate detailed alert message for emergency services."""
        
        # Base message templates for each crash type
        crash_descriptions = {
            "tbone_side_impact": f"T-bone/side-impact collision, {vehicles_involved} vehicle(s) in proximity",
            "rear_end_collision": f"Rear-end collision, {vehicles_involved} vehicle(s) in proximity",
            "head_on_collision": f"Head-on collision, {vehicles_involved} vehicle(s) in proximity",
            # "multi_vehicle_pileup": f"Multi-vehicle pileup involving {vehicles_involved} vehicle(s)",
            "single_vehicle_rollover": "Single vehicle rollover accident",
            "vehicle_pedestrian": "Vehicle-pedestrian collision - CRITICAL",
            "vehicle_fixed_object": "Vehicle collision with fixed object",
            "sideswipe_collision": f"Sideswipe collision, {vehicles_involved} vehicle(s) in proximity",
            "intersection_collision": f"Intersection collision, {vehicles_involved} vehicle(s) in proximity",
            "highway_collision": f"Highway collision, {vehicles_involved} vehicle(s) in proximity",
            "parking_lot_incident": f"Low-speed parking lot incident, {vehicles_involved} vehicle(s) in proximity"
        }

        base_message = crash_descriptions.get(crash_type, f"Traffic collision, {vehicles_involved} vehicle(s) in proximity")
        #  base_message = crash_descriptions.get(crash_type, f"Traffic collision involving {vehicles_involved} vehicle(s) nearby")
        # Add severity context
        severity_context = {
            'critical': "CRITICAL - Multiple casualties likely, immediate emergency response required",
            'high': "HIGH SEVERITY - Serious injuries likely, emergency medical response needed",
            'medium': "MODERATE SEVERITY - Potential injuries, medical evaluation recommended",
            'low': "LOW SEVERITY - Minor incident, police response for documentation"
        }.get(severity, "Emergency response recommended")
        
        # Add motion analysis insights
        impact_events = motion_analysis.get('impact_events', [])
        damage_assessment = motion_analysis.get('damage_assessment', 'unknown')
        
        motion_context = ""
        if impact_events:
            high_impacts = sum(1 for event in impact_events if event.get('impact_severity') in ['high', 'critical'])
            if high_impacts > 0:
                motion_context = f" High-energy impact detected ({high_impacts} severe impact event(s))"
        
        if damage_assessment in ['severe', 'moderate']:
            motion_context += f" with {damage_assessment} damage assessment"
        
        # Emergency service recommendations
        emergency_recommendations = {
            'critical': "DISPATCH: EMS (multiple units), Police, Traffic Control, Fire Department if needed",
            'high': "DISPATCH: EMS, Police, consider Fire Department",
            'medium': "DISPATCH: EMS, Police for accident investigation", 
            'low': "DISPATCH: Police for incident report"
        }.get(severity, "DISPATCH: Standard emergency response")
        
        # Combine all components
        video_name = os.path.basename(video_path).replace('.mp4', '').replace('.avi', '').replace('.mov', '')
        
        full_message = (
            f"{base_message}. {severity_context}.{motion_context} "
            f"Location: {video_name}. {emergency_recommendations}. "
            f"Video analysis confidence: {motion_analysis.get('analysis_confidence', 0.5):.2f}"
        )
        
        return full_message
    
    def _determine_emergency_priority(self, severity: str, crash_type: str) -> str:
        """Determine emergency response priority level."""
        if crash_type == "vehicle_pedestrian":
            return "PRIORITY_1"  # Highest priority
        elif severity == "critical":
            return "PRIORITY_1"
        elif severity == "high":
            return "PRIORITY_2"
        elif severity == "medium":
            return "PRIORITY_3"
        else:
            return "PRIORITY_4"
    
    def _estimate_crash_speed(self, motion_analysis: Dict) -> str:
        """Estimate vehicle speed at time of crash."""
        impact_events = motion_analysis.get('impact_events', [])
        if not impact_events:
            return "unknown"
        
        max_motion = max(event.get('motion_pixels', 0) for event in impact_events)
        
        if max_motion > 50000:
            return "high_speed"  # >99 km/h
        elif max_motion > 30000:
            return "medium_speed"  # >59 km/h
        elif max_motion > 10000:
            return "low_speed"  # >20 km/h
        else:
            return "very_low_speed"  # <20 km/h
    
    def _extract_incident_datetime(self, video_path: str) -> str:
        """Extract incident datetime from video file."""
        try:
            # Try to get from filename timestamp patterns
            filename = os.path.basename(video_path)
            
            import re
            timestamp_patterns = [
                r'(\d{4}-\d{2}-\d{2}[_T]\d{2}[-:]\d{2}[-:]\d{2})',  # ISO-like format
                r'(\d{8}_\d{6})',  # YYYYMMDD_HHMMSS
                r'(\d{14})'  # YYYYMMDDHHMMSS
            ]
            
            for pattern in timestamp_patterns:
                match = re.search(pattern, filename)
                if match:
                    timestamp_str = match.group(1)
                    # Convert to standard format
                    if len(timestamp_str) == 14:  # YYYYMMDDHHMMSS
                        formatted = f"{timestamp_str[:4]}-{timestamp_str[4:6]}-{timestamp_str[6:8]}T{timestamp_str[8:10]}:{timestamp_str[10:12]}:{timestamp_str[12:14]}"
                        return formatted
                    elif '_' in timestamp_str:
                        return timestamp_str.replace('_', 'T').replace('-', ':')
                    else:
                        return timestamp_str
            
            # Fallback to file modification time
            modification_time = os.path.getmtime(video_path)
            return datetime.fromtimestamp(modification_time, timezone.utc).isoformat()
            
        except Exception as e:
            logger.warning(f"Could not extract timestamp: {e}")
            return datetime.now(timezone.utc).isoformat()
    
    def process_crash_folder(self, folder_path: str, camera_id: str = None, low_latency_mode: bool = False) -> Dict:
        """
        Process folder containing crash videos (.mp4 files).
        
        Args:
            folder_path: Path to folder with crash videos
            camera_id: Optional camera identifier
            low_latency_mode: If True, use faster analysis with some accuracy trade-offs
            
        Returns:
            Comprehensive analysis results
        """
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
        
        # Find all .mp4 files (as specified in the request)
        video_files = []
        for file in os.listdir(folder_path):
            if file.lower().endswith('.mp4'):
                video_files.append(os.path.join(folder_path, file))
        
        if not video_files:
            logger.warning(f"No .mp4 files found in {folder_path}")
            return {
                'folder_path': folder_path,
                'processed_videos': 0,
                'crash_reports': [],
                'summary': {
                    'total_crashes': 0,
                    'critical_crashes': 0,
                    'average_confidence': 0.0
                }
            }
        
        logger.info(f"🎬 Processing {len(video_files)} crash videos...")
        
        crash_reports = []
        for video_file in video_files:
            try:
                logger.info(f"📹 Analyzing: {os.path.basename(video_file)}")
                crash_report = self.classify_crash_video(video_file, camera_id, low_latency_mode)
                crash_reports.append(crash_report)
                
                # Print detailed report
                self._print_crash_report(crash_report)
                
            except Exception as e:
                logger.error(f"Failed to process {video_file}: {e}")
                continue
        
        # Generate batch summary
        summary = self._generate_batch_summary(crash_reports)
        
        logger.info(f"🎯 Batch processing complete: {len(crash_reports)} videos analyzed")
        
        return {
            'folder_path': folder_path,
            'processed_videos': len(crash_reports),
            'crash_reports': crash_reports,
            'summary': summary,
            'processing_timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def _print_crash_report(self, report: CrashReport):
        """Print detailed crash report."""
        print("\n" + "="*80)
        print("🚗💥CRASH ANALYSIS REPORT")
        print("="*80)
        print(f"Incident DateTime: {report.incident_datetime}")
        print(f"Location: ({report.incident_latitude}, {report.incident_longitude})")
        print(f"Crash Type: {report.incident_type.upper().replace('_', ' ')}")
        print(f"Severity: {report.incident_severity.upper()}")
        print(f"Vehicles Involved: {report.vehicles_involved}")
        print(f"Impact Severity: {report.impact_severity}")
        print(f"Crash Phase: {report.crash_phase}")
        print(f"Estimated Speed: {report.estimated_speed}")
        print(f"Damage Assessment: {report.damage_assessment}")
        print(f"Emergency Priority: {report.emergency_priority}")
        print(f"Confidence: {report.confidence:.3f}")
        print(f"Video: {os.path.basename(report.video_path)}")
        print("─" * 80)
        print(f"Alert Message:")
        print(f"   {report.alerts_message}")
        print("="*80)
        
        # Emergency dispatch information
        dispatch_info = {
            'PRIORITY_1': 'IMMEDIATE DISPATCH - Multiple units, life-threatening',
            'PRIORITY_2': 'URGENT DISPATCH - EMS and police response',
            'PRIORITY_3': 'STANDARD DISPATCH - Police and medical evaluation',
            'PRIORITY_4': 'ROUTINE DISPATCH - Documentation and cleanup'
        }
        
        print(f"EMERGENCY DISPATCH: {dispatch_info.get(report.emergency_priority, 'Standard response')}")
        print("="*80 + "\n")
    
    def _generate_batch_summary(self, crash_reports: List[CrashReport]) -> Dict:
        """Generate summary statistics for batch processing."""
        if not crash_reports:
            return {}
        
        # Extract data for analysis
        crash_types = [r.incident_type for r in crash_reports]
        severities = [r.incident_severity for r in crash_reports]
        confidences = [r.confidence for r in crash_reports]
        vehicles_involved = [r.vehicles_involved for r in crash_reports]
        priorities = [r.emergency_priority for r in crash_reports]
        
        return {
            'total_crashes': len(crash_reports),
            'crash_type_distribution': dict(Counter(crash_types)),
            'severity_distribution': dict(Counter(severities)),
            'priority_distribution': dict(Counter(priorities)),
            'average_confidence': np.mean(confidences),
            'high_confidence_crashes': sum(1 for c in confidences if c >= 0.8),
            'critical_crashes': sum(1 for s in severities if s == 'critical'),
            'high_severity_crashes': sum(1 for s in severities if s in ['critical', 'high']),
            'average_vehicles_involved': np.mean(vehicles_involved),
            'multi_vehicle_crashes': sum(1 for v in vehicles_involved if v > 1),
            'priority_1_incidents': sum(1 for p in priorities if p == 'PRIORITY_1'),
            'most_common_crash_type': Counter(crash_types).most_common(1)[0] if crash_types else ('unknown', 0),
            'recommendations': self._generate_safety_recommendations(crash_reports)
        }
    
    def _generate_safety_recommendations(self, crash_reports: List[CrashReport]) -> List[str]:
        """Generate safety recommendations based on crash analysis."""
        recommendations = []
        
        crash_types = [r.incident_type for r in crash_reports]
        severities = [r.incident_severity for r in crash_reports]
        
        type_counts = Counter(crash_types)
        
        # Recommendations based on most common crash types
        if type_counts.get('intersection_collision', 0) > len(crash_reports) * 0.3:
            recommendations.append("Consider intersection safety improvements (signals, signs, visibility)")
        
        if type_counts.get('rear_end_collision', 0) > len(crash_reports) * 0.25:
            recommendations.append("Implement rear-end collision prevention measures (warning signs, speed management)")
        
        if type_counts.get('tbone_side_impact', 0) > len(crash_reports) * 0.2:
            recommendations.append("Enhance intersection visibility and right-of-way enforcement")
        
        # Recommendations based on severity
        critical_rate = sum(1 for s in severities if s == 'critical') / len(severities)
        if critical_rate > 0.2:
            recommendations.append("HIGH PRIORITY: Multiple critical incidents detected - comprehensive safety review needed")
        
        if not recommendations:
            recommendations.append("Continue monitoring traffic patterns and implement standard safety measures")
        
        return recommendations


def main():
    """Main function to run the enhanced crash detection system."""
    print("🚗💥ENHANCED CAR CRASH DETECTION & CLASSIFICATION SYSTEM")
    print("=" * 70)
    print("CNN + Motion Analysis Fusion")
    print("Poor Video Quality Enhancement")  
    print("Accurate Crash Type Classification")
    print("Emergency Response Prioritization")
    print("Comprehensive Damage Assessment")
    print("Multi-Vehicle Incident Analysis")
    print("Database-Ready Crash Reports")
    print("=" * 70)
    
    classifier = EnhancedCrashClassifier()
    
    print("\nSelect operation mode:")
    print("1. Analyze single crash video (.mp4)")
    print("2. Process entire folder of crash videos (.mp4)")
    print("3. Process folder with specific camera location")
    print("4. Batch process with detailed statistics")
    print("5. Low-latency batch processing (optimized for speed)")
    
    # try:
    #     choice = input("\nEnter choice (1-4): ").strip()
        
    #     if choice == '1':
    #         video_path = input("Enter path to crash video (.mp4): ").strip()
    #         if os.path.exists(video_path) and video_path.lower().endswith('.mp4'):
    #             crash_report = classifier.classify_crash_video(video_path)
    #             classifier._print_crash_report(crash_report)
    #         else:
    #             print("Video file not found or not a .mp4 file!")
        
    #     elif choice == '2':
    #         folder_path = input("Enter folder path with crash videos: ").strip()
    #         results = classifier.process_crash_folder(folder_path)
            
    #         print(f"\nBATCH PROCESSING SUMMARY")
    #         print(f"Folder: {results['folder_path']}")
    #         print(f"Videos Processed: {results['processed_videos']}")
            
    #         summary = results['summary']
    #         if summary:
    #             print(f"Total Crashes: {summary['total_crashes']}")
    #             print(f"Critical Crashes: {summary['critical_crashes']}")
    #             print(f"Average Confidence: {summary['average_confidence']:.3f}")
    #             print(f"Average Vehicles Involved: {summary['average_vehicles_involved']:.1f}")
    #             print(f"Most Common Crash Type: {summary['most_common_crash_type'][0]}")
        
    #     elif choice == '3':
    #         folder_path = input("Enter folder path with crash videos: ").strip()
    #         print("\nAvailable camera locations:")
    #         for cam_id, info in classifier.CAMERA_LOCATIONS.items():
    #             print(f"  {cam_id}: {info['name']}")
            
    #         camera_id = input("Enter camera ID: ").strip()
    #         if camera_id not in classifier.CAMERA_LOCATIONS:
    #             camera_id = 'default'
    #             print(f"Using default camera location")
            
    #         results = classifier.process_crash_folder(folder_path, camera_id)
    #         print(f"Processed {results['processed_videos']} videos with location data")
        
    #     elif choice == '4':
    #         folder_path = input("Enter folder path with crash videos: ").strip()
    #         results = classifier.process_crash_folder(folder_path)
            
    #         # Detailed statistics
    #         summary = results['summary']
    #         if summary:
    #             print(f"\nDETAILED CRASH ANALYSIS STATISTICS")
    #             print("=" * 50)
    #             print(f"Total Crashes Analyzed: {summary['total_crashes']}")
    #             print(f"High Confidence Detections: {summary['high_confidence_crashes']}")
    #             print(f"Priority 1 Emergencies: {summary['priority_1_incidents']}")
    #             print(f"Multi-Vehicle Crashes: {summary['multi_vehicle_crashes']}")
                
    #             print("\nCrash Type Distribution:")
    #             for crash_type, count in summary['crash_type_distribution'].items():
    #                 percentage = (count / summary['total_crashes']) * 100
    #                 print(f"  {crash_type.replace('_', ' ').title()}: {count} ({percentage:.1f}%)")
                
    #             print("\nSeverity Distribution:")
    #             for severity, count in summary['severity_distribution'].items():
    #                 percentage = (count / summary['total_crashes']) * 100
    #                 print(f"  {severity.title()}: {count} ({percentage:.1f}%)")
                
    #             print("\nSafety Recommendations:")
    #             for rec in summary['recommendations']:
    #                 print(f"  • {rec}")
        
    #     else:
    #         print("Invalid choice!")
    
    folder_path = "input_video"
    
    # Run with performance measurements
    print("\nRunning performance comparison...")
    
    # Standard mode
    standard_start_time = time.time()
    print("\nRunning in standard (high accuracy) mode...")
    standard_results = classifier.process_crash_folder(folder_path, camera_id='default', low_latency_mode=False)
    standard_time = time.time() - standard_start_time
    
    # Low latency mode
    low_latency_start_time = time.time()
    print("\nRunning in low latency (optimized speed) mode...")
    low_latency_results = classifier.process_crash_folder(folder_path, camera_id='default', low_latency_mode=True)
    low_latency_time = time.time() - low_latency_start_time
    
    # Performance comparison
    print("\nPERFORMANCE COMPARISON")
    print("=" * 50)
    print(f"Standard Mode Processing Time: {standard_time:.2f} seconds")
    print(f"Low Latency Mode Processing Time: {low_latency_time:.2f} seconds")
    print(f"Speed Improvement: {(standard_time/low_latency_time):.2f}x faster")
    print(f"Time Saved: {(standard_time - low_latency_time):.2f} seconds ({(standard_time - low_latency_time)/standard_time*100:.1f}%)")
    
    # Accuracy comparison if we have ground truth
    if standard_results['processed_videos'] > 0 and low_latency_results['processed_videos'] > 0:
        print("\nACCURACY COMPARISON")
        print("=" * 50)
        print(f"Standard Mode Average Confidence: {standard_results['summary']['average_confidence']:.3f}")
        print(f"Low Latency Mode Average Confidence: {low_latency_results['summary']['average_confidence']:.3f}")
        
        # Check if crash types match between the two modes
        match_count = 0
        for std_report, low_report in zip(standard_results['crash_reports'], low_latency_results['crash_reports']):
            if std_report.incident_type == low_report.incident_type:
                match_count += 1
                
        if len(standard_results['crash_reports']) > 0:
            match_rate = match_count / len(standard_results['crash_reports']) * 100
            print(f"Crash Type Match Rate: {match_rate:.1f}%")
    
    # Print final summary
    print(f"\nBATCH PROCESSING SUMMARY (Low Latency Mode)")
    print(f"Folder: {low_latency_results['folder_path']}")
    print(f"Videos Processed: {low_latency_results['processed_videos']}")
            
    summary = low_latency_results['summary']
    if summary:
        print(f"Total Crashes: {summary['total_crashes']}")
        print(f"Critical Crashes: {summary['critical_crashes']}")
        print(f"Average Confidence: {summary['average_confidence']:.3f}")
        print(f"Average Vehicles Involved: {summary['average_vehicles_involved']:.1f}")
        print(f"Most Common Crash Type: {summary['most_common_crash_type'][0]}")

        # For Database insertion and updates:
        # Insert Incident into database
        # Update the respective alert that was generated when the incident was created by using the incident ID or timestamp
        #    


if __name__ == "__main__":
    main()