"""
Configuration settings for the Traffic Guardian AI classification system.
Centralizes all constants, thresholds, and environment variables.
"""
import os
import logging
from typing import Dict, Any

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file
    logging.info("Environment variables loaded from .env file")
except ImportError:
    logging.warning("python-dotenv not installed. Using system environment variables only.")


class Config:
    """Centralized configuration for the Traffic Guardian AI system."""
    
    # Processing Timeouts
    MOTION_ANALYSIS_TIMEOUT = 4.0
    FRAME_PROCESSING_TIMEOUT = 2.0
    VIDEO_PROCESSING_TIMEOUT = 30.0
    
    # Detection Thresholds
    IMPACT_THRESHOLD = 2000
    MOTION_THRESHOLD = 15.0
    CONFIDENCE_THRESHOLD = 0.6
    EDGE_DENSITY_THRESHOLD = 0.15
    
    # Processing Limits
    MAX_VEHICLES_TO_DETECT = 8
    MAX_FRAMES_TO_PROCESS = 300
    CACHE_SIZE = 100
    
    # Video Processing
    TARGET_FPS = 10
    FRAME_SKIP_INTERVAL = 3
    STABILIZATION_STRENGTH = 0.1
    
    # Model Parameters
    CNN_INPUT_SIZE = (224, 224)
    BATCH_SIZE = 16
    
    # API Configuration
    DEFAULT_API_ENDPOINT = 'http://localhost:5000/api/incidents'
    API_TIMEOUT = 30
    MAX_RETRIES = 3
    
    # File Processing
    SUPPORTED_VIDEO_FORMATS = ['.mp4', '.avi', '.mov', '.mkv']
    TEMP_DIR = 'temp'
    
    # Logging
    LOG_LEVEL = logging.INFO
    LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'
    
    @classmethod
    def get_api_config(cls) -> Dict[str, Any]:
        """Get API configuration from environment variables."""
        api_key = os.getenv('AIAPIKEY')
        return {
            'endpoint': os.getenv('API_ENDPOINT', cls.DEFAULT_API_ENDPOINT),
            'api_key': api_key,
            'enabled': bool(api_key),
            'timeout': cls.API_TIMEOUT,
            'max_retries': cls.MAX_RETRIES
        }
    
    @classmethod
    def setup_logging(cls):
        """Setup logging configuration."""
        logging.basicConfig(level=cls.LOG_LEVEL, format=cls.LOG_FORMAT)
        return logging.getLogger(__name__)


# Initialize logging
logger = Config.setup_logging()
