# TrafficGuardian AI Classification System - Modular Architecture
"""
TrafficGuardian AI Classification System

A modular crash detection and classification system organized into focused components:

- config: Configuration and settings
- utils: Utility functions and classes (cache, helpers)
- models: Data structures and ML models
- preprocessing: Video enhancement and preprocessing
- analysis: Core crash classification logic
- api: External API integration

Usage:
    from Classification.analysis import EnhancedCrashClassifier
    
    classifier = EnhancedCrashClassifier()
    result = classifier.classify_crash_video('video.mp4')
"""

# Main components
from .analysis import EnhancedCrashClassifier
from .models import CrashReport, CrashSpecificCNN
from .api import TrafficGuardianAPIClient
from .preprocessing import EnhancedVideoPreprocessor
from .utils import LRUCache
from .config.settings import Config

__version__ = "2.0.0"
__author__ = "TrafficGuardian AI Team"

__all__ = [
    'EnhancedCrashClassifier',
    'CrashReport', 
    'CrashSpecificCNN',
    'TrafficGuardianAPIClient',
    'EnhancedVideoPreprocessor',
    'LRUCache',
    'Config'
]
