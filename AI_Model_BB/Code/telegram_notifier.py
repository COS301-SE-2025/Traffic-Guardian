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

class TelegramNotifier:
    """
    Telegram notification system for crash incident alerts.
    Sends voice messages with incident details to configured Telegram chat.
    """
    
    def __init__(self):
        """Initialize Telegram notifier with bot configuration."""
        self.bot_token = self._get_bot_token()
        self.chat_id = self._get_chat_id()
        self.enabled = bool(self.bot_token and self.chat_id)
        
        if self.enabled:
            self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
            logger.info("Telegram notifier initialized successfully")
        else:
            logger.warning("Telegram notifier disabled - missing configuration")
            
        # TTS engine setup
        self.tts_engine = None
        self._setup_tts()
    
    def _get_bot_token(self) -> Optional[str]:
        """Get Telegram bot token from environment variables."""
        return os.getenv('TELEGRAM_BOT_TOKEN')
    
    def _get_chat_id(self) -> Optional[str]:
        """Get Telegram chat ID from environment variables."""
        return os.getenv('TELEGRAM_CHAT_ID')
    
    def _setup_tts(self):
        """Setup text-to-speech engine."""
        if TTS_AVAILABLE:
            try:
                self.tts_engine = pyttsx3.init()
                # Configure voice settings
                voices = self.tts_engine.getProperty('voices')
                if voices:
                    # Try to find a female voice for emergency announcements
                    for voice in voices:
                        if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                            self.tts_engine.setProperty('voice', voice.id)
                            break
                
                # Set speech rate and volume
                self.tts_engine.setProperty('rate', 150)  # Slightly slower for clarity
                self.tts_engine.setProperty('volume', 1.0)
                logger.info("TTS engine configured successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize TTS engine: {e}")
                self.tts_engine = None
    
    def generate_incident_voice_message(self, crash_report, api_result: Dict) -> str:
        """
        Generate voice message text for incident notification.
        
        Args:
            crash_report: CrashReport object with incident details
            api_result: Result from API submission
            
        Returns:
            Text message for TTS conversion
        """
        # Extract key information
        incident_type = crash_report.incident_type.replace('_', ' ').title()
        severity = crash_report.incident_severity.title()
        vehicles = crash_report.vehicles_involved
        confidence = crash_report.confidence
        camera_id = getattr(crash_report, 'camera_id', 'Unknown')
        
        # Create emergency alert message
        message_parts = [
            "Traffic Guardian Alert.",
            f"{severity} severity incident detected.",
            f"{incident_type} involving {vehicles} vehicle{'s' if vehicles != 1 else ''}.",
            f"Camera {camera_id}.",
            f"Confidence level: {confidence:.0%}."
        ]
        
        # Add API submission status
        if api_result.get('success'):
            message_parts.append("Incident successfully reported to database.")
            if 'incident_id' in api_result:
                message_parts.append(f"Database ID: {api_result['incident_id']}.")
        else:
            message_parts.append("Warning: Database submission failed.")
        
        # Add emergency priority
        if hasattr(crash_report, 'emergency_priority'):
            priority = crash_report.emergency_priority.replace('PRIORITY_', 'Priority ')
            message_parts.append(f"Emergency response: {priority}.")
        
        # Add timestamp
        try:
            incident_time = datetime.fromisoformat(crash_report.incident_datetime.replace('Z', '+00:00'))
            time_str = incident_time.strftime('%H:%M on %B %d')
            message_parts.append(f"Incident time: {time_str}.")
        except:
            message_parts.append("Incident reported at current time.")
        
        return " ".join(message_parts)
    
    def create_voice_file(self, text: str, filename: Optional[str] = None) -> Optional[str]:
        """
        Create voice file from text using available TTS engine.
        
        Args:
            text: Text to convert to speech
            filename: Optional output filename
            
        Returns:
            Path to created voice file or None if failed
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"incident_alert_{timestamp}.mp3"
        
        temp_dir = tempfile.gettempdir()
        voice_file_path = os.path.join(temp_dir, filename)
        
        # Try pyttsx3 first
        if self.tts_engine and TTS_AVAILABLE:
            try:
                # Use WAV format for pyttsx3
                wav_path = voice_file_path.replace('.mp3', '.wav')
                self.tts_engine.save_to_file(text, wav_path)
                self.tts_engine.runAndWait()
                
                if os.path.exists(wav_path):
                    # Convert WAV to MP3 if ffmpeg available, otherwise use WAV
                    try:
                        import subprocess
                        subprocess.run([
                            'ffmpeg', '-i', wav_path, '-acodec', 'mp3', 
                            '-ab', '128k', voice_file_path, '-y'
                        ], check=True, capture_output=True)
                        os.remove(wav_path)  # Clean up WAV file
                        logger.info(f"Voice file created with pyttsx3: {voice_file_path}")
                        return voice_file_path
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        # FFmpeg not available, use WAV file
                        logger.info(f"Voice file created as WAV: {wav_path}")
                        return wav_path
            except Exception as e:
                logger.warning(f"pyttsx3 TTS failed: {e}")
        
        # Try gTTS as fallback
        if GTTS_AVAILABLE:
            try:
                tts = gTTS(text=text, lang='en', slow=False)
                tts.save(voice_file_path)
                logger.info(f"Voice file created with gTTS: {voice_file_path}")
                return voice_file_path
            except Exception as e:
                logger.warning(f"gTTS failed: {e}")
        
        logger.error("No TTS engine available - cannot create voice file")
        return None
    
    def send_voice_message(self, voice_file_path: str, caption: str = "") -> Dict:
        """
        Send voice message to Telegram chat.
        
        Args:
            voice_file_path: Path to voice file
            caption: Optional text caption
            
        Returns:
            Dictionary with send status
        """
        if not self.enabled:
            return {'success': False, 'error': 'Telegram notifier not configured'}
        
        if not os.path.exists(voice_file_path):
            return {'success': False, 'error': 'Voice file not found'}
        
        try:
            url = f"{self.base_url}/sendVoice"
            
            with open(voice_file_path, 'rb') as voice_file:
                files = {'voice': voice_file}
                data = {
                    'chat_id': self.chat_id,
                    'caption': caption[:1024] if caption else ""  # Telegram caption limit
                }
                
                response = requests.post(url, files=files, data=data, timeout=30)
                
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info("Voice message sent successfully to Telegram")
                    return {
                        'success': True, 
                        'message_id': result.get('result', {}).get('message_id'),
                        'response': result
                    }
                else:
                    error_msg = result.get('description', 'Unknown error')
                    logger.error(f"Telegram API error: {error_msg}")
                    return {'success': False, 'error': error_msg}
            else:
                logger.error(f"HTTP error: {response.status_code}")
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_text_message(self, text: str) -> Dict:
        """
        Send text message to Telegram chat as fallback.
        
        Args:
            text: Message text
            
        Returns:
            Dictionary with send status
        """
        if not self.enabled:
            return {'success': False, 'error': 'Telegram notifier not configured'}
        
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': self.chat_id,
                'text': text[:4096],  # Telegram message limit
                'parse_mode': 'Markdown'
            }
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info("Text message sent successfully to Telegram")
                    return {'success': True, 'response': result}
                else:
                    error_msg = result.get('description', 'Unknown error')
                    return {'success': False, 'error': error_msg}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            logger.error(f"Failed to send text message: {e}")
            return {'success': False, 'error': str(e)}
    
    def notify_incident(self, crash_report, api_result: Dict) -> Dict:
        """
        Main notification method - sends voice message about incident.
        
        Args:
            crash_report: CrashReport object
            api_result: API submission result
            
        Returns:
            Dictionary with notification status
        """
        if not self.enabled:
            logger.warning("Telegram notifications disabled")
            return {'success': False, 'error': 'Not configured'}
        
        try:
            # Generate voice message text
            message_text = self.generate_incident_voice_message(crash_report, api_result)
            
            # Create voice file
            voice_file = self.create_voice_file(message_text)
            
            if voice_file:
                # Send voice message
                result = self.send_voice_message(voice_file)
                
                # Clean up voice file
                try:
                    os.remove(voice_file)
                except:
                    pass
                
                if result['success']:
                    logger.info("Incident notification sent via voice message")
                    return result
                else:
                    # Fallback to text message
                    logger.warning("Voice message failed, sending text message")
                    return self.send_text_message(f"🚨 **TRAFFIC INCIDENT ALERT**\n\n{message_text}")
            else:
                # Send as text message if voice creation failed
                logger.warning("Voice file creation failed, sending text message")
                return self.send_text_message(f"🚨 **TRAFFIC INCIDENT ALERT**\n\n{message_text}")
                
        except Exception as e:
            logger.error(f"Notification failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def test_notification(self) -> Dict:
        """
        Test notification system with a sample message.
        
        Returns:
            Dictionary with test result
        """
        if not self.enabled:
            return {'success': False, 'error': 'Telegram notifier not configured'}
        
        test_message = (
            "Traffic Guardian Alert. This is a test notification. "
            "High severity incident detected. T-bone collision involving 2 vehicles. "
            "Camera 1. Confidence level: 95%. "
            "Incident successfully reported to database. "
            "Emergency response: Priority 2."
        )
        
        logger.info("Sending test notification...")
        
        # Try voice message first
        voice_file = self.create_voice_file(test_message)
        if voice_file:
            result = self.send_voice_message(voice_file, "🧪 Test Notification")
            try:
                os.remove(voice_file)
            except:
                pass
            
            if result['success']:
                return {'success': True, 'method': 'voice', 'result': result}
        
        # Fallback to text
        result = self.send_text_message(f"🧪 **TEST NOTIFICATION**\n\n{test_message}")
        return {'success': result['success'], 'method': 'text', 'result': result}
    
    def setup_telegram_env_example():
        """
        Display example environment variables setup for Telegram integration.
        """
        print("🤖 TELEGRAM INTEGRATION SETUP")
        print("=" * 50)
        print("Required Environment Variables:")
        print()
        print("1. Create a Telegram bot:")
        print("   - Message @BotFather on Telegram")
        print("   - Use /newbot command")
        print("   - Get your bot token")
        print()
        print("2. Get your chat ID:")
        print("   - Start chat with your bot")
        print("   - Visit: https://api.telegram.org/bot<TOKEN>/getUpdates")
        print("   - Find 'chat' -> 'id' in the response")
        print()
        print("3. Add to your .env file:")
        print("   TELEGRAM_BOT_TOKEN=your_bot_token_here")
        print("   TELEGRAM_CHAT_ID=your_chat_id_here")
        print()
        print("4. Install required packages:")
        print("   pip install pyttsx3 gtts requests")
        print()
        print("Example .env file:")
        print("   AIAPIKEY=your_api_key")
        print("   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz")
        print("   TELEGRAM_CHAT_ID=123456789")
        print("=" * 50)
