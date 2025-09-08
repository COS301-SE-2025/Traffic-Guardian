"""
TrafficGuardian AI - Video Incident Classifier (Complete Modular Version)
Main entry point for the enhanced crash detection and classification system.

This version uses the complete modular Classification package with all functionality.
"""
import os
import sys
import logging
import warnings

# Add the Code directory to Python path so we can import Classification
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Classification.analysis import EnhancedCrashClassifier
from Classification.config.settings import Config

# Configure logging using our config
logger = Config.setup_logging()
warnings.filterwarnings('ignore')

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("Environment variables loaded from .env file")
except ImportError:
    logger.warning("python-dotenv not installed. Using system environment variables only.")


def main():
    """Main function to run the enhanced crash detection system."""
    print("🚗💥 TRAFFICGUARDIAN AI - CLASSIFICATION SYSTEM v2.0")
    print("=" * 70)
    print("✓ Modular Architecture (Classification Package)")
    print("✓ CNN + Motion Analysis Fusion")
    print("✓ Poor Video Quality Enhancement")  
    print("✓ Accurate Crash Type Classification")
    print("✓ Emergency Response Prioritization")
    print("✓ Comprehensive Damage Assessment")
    print("✓ Multi-Vehicle Incident Analysis")
    print("✓ Database-Ready Crash Reports")
    print("✓ Incident Filename Parsing")
    print("✓ API Integration")
    print("=" * 70)
    
    # Initialize the classifier
    try:
        classifier = EnhancedCrashClassifier()
        logger.info("✅ Classification system initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize classifier: {e}")
        return
    
    # Process incident clips folder
    folder_path = "incident_for_classification"
    
    print(f"\n🎯 Processing incident clips from folder: {folder_path}")
    
    if os.path.exists(folder_path):
        # Get video files
        video_files = [f for f in os.listdir(folder_path) if f.lower().endswith(tuple(Config.SUPPORTED_VIDEO_FORMATS))]
        
        if video_files:
            print(f"📁 Found {len(video_files)} video files to process")
            
            successful_processes = 0
            failed_processes = 0
            
            for video_file in video_files:
                video_path = os.path.join(folder_path, video_file)
                print(f"\n🎥 Processing: {video_file}")
                
                try:
                    # Process and submit to API
                    result = classifier.process_and_submit_crash_video(
                        video_path, 
                        submit_to_api=True,
                        low_latency_mode=False
                    )
                    
                    if result['processing_success']:
                        crash_report = result['crash_report']
                        print(f"✅ Classification: {crash_report.incident_type}")
                        print(f"   Severity: {crash_report.incident_severity}")
                        print(f"   Confidence: {crash_report.confidence:.3f}")
                        print(f"   Vehicles Involved: {crash_report.vehicles_involved}")
                        
                        # Check API submission
                        if 'api_submission' in result:
                            api_result = result['api_submission']
                            if api_result['success']:
                                print(f"✅ API Submission: Success (ID: {api_result.get('incident_id')})")
                            else:
                                print(f"❌ API Submission: Failed - {api_result.get('error')}")
                        
                        successful_processes += 1
                    else:
                        print(f"❌ Processing Failed: {result.get('error')}")
                        failed_processes += 1
                        
                except Exception as e:
                    print(f"❌ Error processing {video_file}: {e}")
                    logger.error(f"Error processing {video_file}: {e}")
                    failed_processes += 1
            
            # Summary
            print(f"\n📊 PROCESSING SUMMARY")
            print(f"✅ Successful: {successful_processes}")
            print(f"❌ Failed: {failed_processes}")
            print(f"📈 Success Rate: {(successful_processes/(successful_processes+failed_processes)*100):.1f}%")
            
        else:
            supported_formats = ', '.join(Config.SUPPORTED_VIDEO_FORMATS)
            print(f"❌ No video files found in the folder")
            print(f"💡 Supported formats: {supported_formats}")
    else:
        print(f"❌ Folder '{folder_path}' not found")
        print("💡 Please create the folder and add video files to process")


def demo_api_integration():
    """
    Demonstrate API integration functionality.
    Shows how to process videos and submit to the TrafficGuardian API.
    """
    print("🚗💥 TRAFFICGUARDIAN API INTEGRATION DEMO")
    print("=" * 60)
    
    try:
        classifier = EnhancedCrashClassifier()
    except Exception as e:
        print(f"❌ Failed to initialize classifier: {e}")
        return
    
    # Display API configuration status
    print("📡 API Configuration Status:")
    if classifier.api_client.api_config['enabled']:
        print("✅ API Key: Configured")
        print(f"📍 Endpoint: {classifier.api_client.api_config['endpoint']}")
    else:
        print("❌ API Key: Not found in environment variables")
        print("💡 Set AIAPIKEY in .env file to enable API integration")
    
    print("\nAPI Payload Mapping Example:")
    print("Database Fields Mapped:")
    print("├── Incidents_ID: [Auto-generated by database]")
    print("├── Incidents_DateTime: From filename timestamp")
    print("├── Incidents_Longitude: From filename coordinates")
    print("├── Incidents_Latitude: From filename coordinates")
    print("├── Incident_Severity: From AI classification")
    print("├── Incident_Status: 'ongoing' (default)")
    print("├── Incident_Reporter: 'TrafficGuardianAI'")
    print("├── Incident_CameraID: From filename")
    print("└── Incident_Description: crash_report.alerts_message")
    
    # Example usage
    print("\nUsage Examples:")
    print("1. Process single video with API submission:")
    print("   from Classification.analysis import EnhancedCrashClassifier")
    print("   classifier = EnhancedCrashClassifier()")
    print("   result = classifier.process_and_submit_crash_video('crash.mp4')")
    
    print("\n2. Manual API submission:")
    print("   crash_report = classifier.classify_crash_video('video.mp4')")
    print("   api_result = classifier.api_client.submit_incident(crash_report)")
    
    print("\nSetup Instructions:")
    print("1. Create .env file in AI_Model_BB/Code/ directory")
    print("2. Add: AIAPIKEY=your_api_key_here")
    print("3. Optionally configure API_ENDPOINT for custom server")
    print("4. Run video processing with submit_to_api=True")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    # Production Mode: Process incident videos and submit to TrafficGuardian API
    print("🚀 TRAFFICGUARDIAN AI - MODULAR CLASSIFICATION SYSTEM")
    print("=" * 70)
    
    # Check API configuration
    try:
        classifier = EnhancedCrashClassifier()
        if classifier.api_client.api_config['enabled']:
            print("✅ API Integration: ENABLED")
            print(f"📡 Endpoint: {classifier.api_client.api_config['endpoint']}")
        else:
            print("⚠️  API Integration: DISABLED (no API key found)")
            print("💡 Add AIAPIKEY to .env file to enable API submission")
        
        print("✅ Modular Classification System: READY")
    except Exception as e:
        print(f"❌ System Initialization Failed: {e}")
        sys.exit(1)
    
    print("=" * 70)
    
    # Run main processing
    main()
