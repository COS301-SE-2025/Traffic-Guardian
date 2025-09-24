"""
Test script for Telegram integration before adding to crash classification system.
This will help verify everything is working correctly.
"""
import os
from dotenv import load_dotenv
from telegram_notifier import TelegramNotifier
from datetime import datetime
import json

# Mock CrashReport class for testing
class MockCrashReport:
    """Mock crash report for testing purposes."""
    def __init__(self):
        self.incident_datetime = datetime.now().isoformat()
        self.incident_latitude = -26.1076
        self.incident_longitude = 28.0567
        self.incident_severity = "high"
        self.incident_status = "active"
        self.incident_reporter = "TrafficGuardianAI"
        self.alerts_message = "T-bone/side-impact collision, 2 vehicle(s) in proximity. HIGH SEVERITY - Serious injuries likely, emergency medical response needed. High-energy impact detected (1 severe impact event(s)) with moderate damage assessment Location: test_incident_2_20250811_181338_966_collision. DISPATCH: EMS, Police, consider Fire Department. Video analysis confidence: 0.85"
        self.incident_type = "tbone_side_impact"
        self.confidence = 0.85
        self.video_path = "test_incident_2_20250811_181338_966_collision.mp4"
        self.processing_timestamp = datetime.now().isoformat()
        self.vehicles_involved = 2
        self.impact_severity = "high"
        self.crash_phase = "impact"
        self.estimated_speed = "medium_speed"
        self.damage_assessment = "moderate"
        self.emergency_priority = "PRIORITY_2"
        self.camera_id = "2"

def test_environment_setup():
    """Test if environment variables are properly set."""
    print("=" * 60)
    print("TELEGRAM INTEGRATION TEST")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    print("1. Checking Environment Variables:")
    
    # Check API key
    api_key = os.getenv('AIAPIKEY')
    print(f"   AIAPIKEY: {'Found' if api_key else 'Missing'}")
    
    # Check Telegram variables
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    print(f"   TELEGRAM_BOT_TOKEN: {'Found' if bot_token else 'Missing'}")
    print(f"   TELEGRAM_CHAT_ID: {'Found' if chat_id else 'Missing'}")
    
    if bot_token:
        # Mask the token for security
        masked_token = bot_token[:10] + "..." + bot_token[-10:] if len(bot_token) > 20 else "Found"
        print(f"   Token preview: {masked_token}")
    
    if chat_id:
        print(f"   Chat ID: {chat_id}")
    
    print()
    
    if not bot_token or not chat_id:
        print("ERROR: Missing Telegram configuration!")
        print("Please ensure your .env file contains:")
        print("TELEGRAM_BOT_TOKEN=your_bot_token_here")
        print("TELEGRAM_CHAT_ID=your_chat_id_here")
        return False
    
    return True

def test_basic_connection():
    """Test basic Telegram bot connection."""
    print("2. Testing Basic Telegram Connection:")
    
    notifier = TelegramNotifier()
    
    if not notifier.enabled:
        print("   ERROR: Telegram notifier not enabled")
        return False
    
    print("   Telegram notifier initialized successfully")
    
    # Test with simple text message first
    print("   Sending simple test message...")
    result = notifier.send_text_message("Test message from TrafficGuardian AI system")
    
    if result['success']:
        print("   SUCCESS: Text message sent to Telegram")
        return True
    else:
        print(f"   ERROR: Failed to send text message - {result['error']}")
        return False

def test_voice_message():
    """Test voice message functionality."""
    print("\n3. Testing Voice Message Generation:")
    
    notifier = TelegramNotifier()
    
    # Test TTS engines
    print("   Checking TTS engines:")
    
    # Check pyttsx3
    try:
        import pyttsx3
        print("   - pyttsx3: Available")
    except ImportError:
        print("   - pyttsx3: Not available (install with: pip install pyttsx3)")
    
    # Check gTTS
    try:
        from gtts import gTTS
        print("   - gTTS: Available")
    except ImportError:
        print("   - gTTS: Not available (install with: pip install gtts)")
    
    # Test voice file creation
    test_text = "This is a test voice message from Traffic Guardian AI. Testing text to speech conversion."
    print(f"   Creating voice file for: '{test_text[:50]}...'")
    
    voice_file = notifier.create_voice_file(test_text, "test_voice.mp3")
    
    if voice_file:
        print(f"   SUCCESS: Voice file created at {voice_file}")
        
        # Test sending the voice message
        print("   Sending voice message to Telegram...")
        result = notifier.send_voice_message(voice_file, "Test voice message")
        
        # Clean up
        try:
            os.remove(voice_file)
        except:
            pass
        
        if result['success']:
            print("   SUCCESS: Voice message sent to Telegram")
            return True
        else:
            print(f"   ERROR: Failed to send voice message - {result['error']}")
            return False
    else:
        print("   ERROR: Could not create voice file")
        return False

def test_full_incident_notification():
    """Test full incident notification with mock crash report."""
    print("\n4. Testing Full Incident Notification:")
    
    notifier = TelegramNotifier()
    
    # Create mock crash report
    crash_report = MockCrashReport()
    api_result = {
        'success': True,
        'incident_id': 'TEST_123',
        'response': {'message': 'Test incident created successfully'}
    }
    
    print("   Mock crash report created:")
    print(f"   - Type: {crash_report.incident_type}")
    print(f"   - Severity: {crash_report.incident_severity}")
    print(f"   - Vehicles: {crash_report.vehicles_involved}")
    print(f"   - Confidence: {crash_report.confidence}")
    print(f"   - Camera ID: {crash_report.camera_id}")
    
    # Generate and display the voice message text
    message_text = notifier.generate_incident_voice_message(crash_report, api_result)
    print(f"\n   Generated voice message text:")
    print(f"   '{message_text}'")
    
    # Send the notification
    print("\n   Sending full incident notification...")
    result = notifier.notify_incident(crash_report, api_result)
    
    if result['success']:
        print("   SUCCESS: Full incident notification sent")
        print(f"   Method used: {result.get('method', 'voice')}")
        return True
    else:
        print(f"   ERROR: Failed to send incident notification - {result['error']}")
        return False

def test_failed_api_scenario():
    """Test notification for failed API submission scenario."""
    print("\n5. Testing Failed API Submission Scenario:")
    
    notifier = TelegramNotifier()
    
    # Create mock crash report
    crash_report = MockCrashReport()
    api_result = {
        'success': False,
        'error': 'HTTP 500: Internal Server Error',
        'incident_id': None
    }
    
    print("   Testing notification for failed API submission...")
    result = notifier.notify_incident(crash_report, api_result)
    
    if result['success']:
        print("   SUCCESS: Failure notification sent")
        return True
    else:
        print(f"   ERROR: Failed to send failure notification - {result['error']}")
        return False

def run_full_test_suite():
    """Run complete test suite."""
    print("STARTING TELEGRAM INTEGRATION TEST SUITE")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 5
    
    # Test 1: Environment setup
    if test_environment_setup():
        tests_passed += 1
    else:
        print("Environment setup failed - stopping tests")
        return
    
    # Test 2: Basic connection
    if test_basic_connection():
        tests_passed += 1
    else:
        print("Basic connection failed - you may have token/chat ID issues")
        return
    
    # Test 3: Voice message
    if test_voice_message():
        tests_passed += 1
    else:
        print("Voice message test failed - check TTS dependencies")
    
    # Test 4: Full incident notification
    if test_full_incident_notification():
        tests_passed += 1
    else:
        print("Full incident notification test failed")
    
    # Test 5: Failed API scenario
    if test_failed_api_scenario():
        tests_passed += 1
    else:
        print("Failed API scenario test failed")
    
    # Results
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("SUCCESS: All tests passed!")
        print("Your Telegram integration is ready for use with the crash detection system.")
    elif tests_passed >= 3:
        print("PARTIAL SUCCESS: Core functionality working")
        print("Some advanced features may not work perfectly, but basic notifications will work.")
    else:
        print("FAILURE: Core functionality not working")
        print("Please check your configuration and try again.")
    
    print("\nNext steps:")
    if tests_passed >= 3:
        print("1. Integration is ready - you can add it to your crash classification system")
        print("2. The system will send notifications when incidents are detected")
        print("3. Check your Telegram chat for the test messages sent during this test")
    else:
        print("1. Fix the configuration issues identified above")
        print("2. Re-run this test script")
        print("3. Only proceed with integration once all tests pass")

def quick_test():
    """Quick test - just send a simple message."""
    print("QUICK TELEGRAM TEST")
    print("=" * 30)
    
    load_dotenv()
    notifier = TelegramNotifier()
    
    if notifier.enabled:
        result = notifier.send_text_message("Quick test from TrafficGuardian AI - Telegram integration working!")
        if result['success']:
            print("SUCCESS: Test message sent to Telegram!")
            print("Check your Telegram chat for the message.")
        else:
            print(f"FAILED: {result['error']}")
    else:
        print("FAILED: Telegram not configured properly")

if __name__ == "__main__":
    print("Choose test type:")
    print("1. Quick test (just send a message)")
    print("2. Full test suite (comprehensive testing)")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        quick_test()
    elif choice == "2":
        run_full_test_suite()
    else:
        print("Invalid choice. Running quick test...")
        quick_test()