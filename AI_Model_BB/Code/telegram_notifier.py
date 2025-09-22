"""
Telegram Notification System for TrafficGuardian AI
Sends voice messages to Telegram when incidents are detected and submitted to API.
"""

import os
import requests
import json
import logging
from typing import Dict, Optional
from datetime import datetime
import tempfile
from pathlib import Path
import asyncio
import aiohttp
import aiofiles

# Text-to-speech imports
try:
    import pyttsx3
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    print("Warning: pyttsx3 not available. Install with: pip install pyttsx3")

# Alternative TTS using gTTS (Google Text-to-Speech)
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("Warning: gTTS not available. Install with: pip install gtts")

logger = logging.getLogger(__name__)