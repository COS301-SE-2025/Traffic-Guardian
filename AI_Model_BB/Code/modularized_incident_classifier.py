"""
Enhanced Car Crash Classification System - Modularized Version
Specialized for accurate crash detection and classification even with poor video quality.
Uses multiple detection methods and robust preprocessing for maximum accuracy.

This is the main entry point for the modularized version of the crash classification system.
It uses the classes that have been moved to the Classification folder.
"""
import os
import cv2
import numpy as np
import torch
import logging
import warnings
import glob
from datetime import datetime, timezone
from typing import Dict, List

# Import modularized classes from Classification folder
from Classification.lru_cache import LRUCache
from Classification.crash_report import CrashReport
from Classification.video_preprocessor import EnhancedVideoPreprocessor
from Classification.cnn_model import CrashSpecificCNN
from Classification.enhanced_crash_classifier import EnhancedCrashClassifier

# Suppress warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file
    logger.info("Environment variables loaded from .env file")
except ImportError:
    logger.warning("python-dotenv not installed. Using system environment variables only.")


def main():
    """Main function to run the enhanced crash detection system."""
    print("🚗💥ENHANCED CAR CRASH DETECTION & CLASSIFICATION SYSTEM (Modularized)")
    print("=" * 70)
    print("CNN + Motion Analysis Fusion")
    print("Poor Video Quality Enhancement")  
    print("Accurate Crash Type Classification")
    print("Emergency Response Prioritization")
    print("Comprehensive Damage Assessment")
    print("Multi-Vehicle Incident Analysis")
    print("Database-Ready Crash Reports")
    print("Incident Filename Parsing (camera_id extraction)")
    print("API Integration for Camera Information")
    print("=" * 70)
    
    # Initialize the classifier
    classifier = EnhancedCrashClassifier()
    
    folder_path = "incident_for_classification"
    
    # Process incident clips with new workflow
    print("\nProcessing incident clips from folder:", folder_path)
    
    if os.path.exists(folder_path):
        video_files = [f for f in os.listdir(folder_path) if f.endswith(('.mp4', '.avi', '.mov'))]
        
        if not video_files:
            print("No video files found in incident folder.")
            return
            
        print(f"Found {len(video_files)} video files to process.")
        
        all_reports = []
        for video_file in video_files:
            print(f"\nProcessing: {video_file}")
            
            # Parse filename to extract camera_id and timestamp
            parsed_info = classifier.parse_incident_filename(video_file)
            if not parsed_info or not parsed_info.get('camera_id'):
                print(f"  Warning: Could not parse filename format for {video_file}")
                continue
                
            camera_id = parsed_info['camera_id']
            timestamp = parsed_info['timestamp']
            original_incident_type = parsed_info['original_incident_type']
            is_valid_type = parsed_info['is_valid_incident_type']
            camera_longitude = parsed_info['camera_longitude']
            camera_latitude = parsed_info['camera_latitude']
            print(f"  Extracted - Camera ID: {camera_id}, Timestamp: {timestamp}")
            print(f"  Full timestamp: {parsed_info['full_timestamp']}")
            print(f"  Original incident type: {original_incident_type} ({'Valid' if is_valid_type else 'Unknown type'})")
            
            # Create camera information from filename (no API call needed)
            camera_info = {
                'camera_id': camera_id,
                'name': f'Camera {camera_id}',
                'location': f'Longitude {camera_longitude}, Latitude {camera_latitude}'
            }
            print(f"  Camera Info: {camera_info['name']} at {camera_info['location']}")
            
            # Process the individual video file
            video_path = os.path.join(folder_path, video_file)
            crash_report = classifier.classify_crash_video(video_path, camera_id=camera_id, low_latency_mode=True)
            
            if crash_report and crash_report.incident_type != 'no_crash':
                # Set filename-derived attributes
                crash_report.camera_id = parsed_info['camera_id']
                crash_report.timestamp = parsed_info['timestamp']
                crash_report.milliseconds = parsed_info['milliseconds']
                crash_report.full_timestamp = parsed_info['full_timestamp']
                crash_report.original_incident_type = parsed_info['original_incident_type']
                
                # Set camera information
                if camera_info:
                    crash_report.camera_location = f"{camera_info['name']} at {camera_info['location']}"
                
                # Set display attributes - use incident_severity (the calculated final severity)
                crash_report.severity = crash_report.incident_severity  # Use the enhanced calculated severity
                crash_report.description = f"{crash_report.incident_type.replace('_', ' ').title()} detected with {crash_report.confidence:.1%} confidence"
                
                # Compare filename incident type with our classification
                if is_valid_type:
                    comparison = classifier.compare_filename_vs_classification(
                        original_incident_type, 
                        crash_report.incident_type
                    )
                    print(f"  Classification validation: {comparison['validation_status']}")
                    
                    # Adjust confidence based on validation
                    original_confidence = crash_report.confidence
                    crash_report.confidence = min(1.0, max(0.0, 
                        original_confidence + comparison['confidence_boost']
                    ))
                    
                    if comparison['confidence_boost'] != 0:
                        print(f"  Confidence adjusted: {original_confidence:.3f} → {crash_report.confidence:.3f}")
                        # Update description with new confidence
                        crash_report.description = f"{crash_report.incident_type.replace('_', ' ').title()} detected with {crash_report.confidence:.1%} confidence"
                
                all_reports.append(crash_report)
                print(f"  Classification: {crash_report.incident_type} (confidence: {crash_report.confidence:.3f})")
                
                #  SUBMIT TO TRAFFICGUARDIAN API DATABASE
                print(f"Submitting incident to TrafficGuardian API...")
                api_result = classifier.submit_incident_to_api(crash_report)
                
                if api_result['success']:
                    print(f"API Submission SUCCESS!")
                    print(f"     Incident ID: {api_result.get('incident_id', 'N/A')}")
                    print(f"     Database Response: {api_result.get('message', 'Created successfully')}")
                    # DELETION!!!!1
                    #  DELETE VIDEO FILE AFTER SUCCESSFUL DATABASE SUBMISSION
                    try:
                        os.remove(video_path)
                        print(f"  Video file deleted: {video_file}")
                    except OSError as e:
                        print(f"  Warning: Could not delete video file {video_file}: {e}")
                        
                else:
                    print(f"     API Submission FAILED!")
                    print(f"     Error: {api_result.get('error', 'Unknown error')}")
                    print(f"     Recommendation: {api_result.get('recommendation', 'Check API server')}")
                    print(f"     Video file retained due to submission failure: {video_file}")
            else:
                print(f"No incidents detected in {video_file}")
        
        print(f"\nPROCESSING COMPLETE")
        print(f"Total reports generated: {len(all_reports)}")
        
        # Display final summary with API submission results
        if all_reports:
            print("\n" + "=" * 70)
            print("FINAL PROCESSING & API SUBMISSION SUMMARY")
            print("=" * 70)
            
            for i, report in enumerate(all_reports, 1):
                print(f"\n Report {i}:")
                print(f"   Video: {report.video_path}")
                print(f"   Camera ID: {report.camera_id}")
                print(f"   Location: {report.camera_location}")
                print(f"   Timestamp: {report.timestamp}")
                print(f"   Severity: {report.severity or report.incident_severity}")
                print(f"   Vehicles: {report.vehicles_involved}")
                print(f"   Type: {report.incident_type.replace('_', ' ').title()}")
                print(f"   Confidence: {report.confidence:.1%}")
                
                # Show description (truncated)
                description = (report.description or report.alerts_message)[:100]
                print(f"   Description: {description}...")
    else:
        print(f"Directory not found: {folder_path}")
        print("Create an 'incident_for_classification' folder with incident videos.")


def demo_api_integration():
    """
    Demonstrate API integration functionality.
    Shows how to process videos and submit to the TrafficGuardian API.
    """
    print("🚗💥 TRAFFICGUARDIAN API INTEGRATION DEMO")
    print("=" * 60)
    
    classifier = EnhancedCrashClassifier()
    
    # Display API configuration status
    print("API Configuration Status:")
    if classifier.api_config['enabled']:
        print(f"✅ API Integration ENABLED")
        print(f"   Endpoint: {classifier.api_config['endpoint']}")
        print(f"   Authentication: API Key configured")
    else:
        print(f"❌ API Integration DISABLED")
        print(f"   Reason: Missing API_KEY environment variable")
        print(f"   Solution: Add API_KEY to .env file or environment variables")
    
    print("\nAPI Payload Mapping Example:")
    print("Database Fields Mapped:")
    print("├── Incidents_ID: [Auto-generated by database]")
    print("├── Incidents_DateTime: From filename timestamp")
    print("├── Incidents_Longitude: Mock coordinates (camera-based)")
    print("├── Incidents_Latitude: Mock coordinates (camera-based)")
    print("├── Incident_Severity: From AI classification")
    print("├── Incident_Status: 'ongoing' (is default)")
    print("├── Incident_Reporter: 'TrafficGuardianAI'")
    print("├── Incident_CameraID: From filename")
    print("└── Incident_Description: crash_report.alerts_message")
    print("    # Backup: crash_report.description")
    
    # Example API payload
    print("\nExample API Payload Structure:")
    example_payload = {
        'Incidents_DateTime': '2025-08-12T14:30:45.123Z',
        'Incidents_Longitude': 28.0567,
        'Incidents_Latitude': -26.1076,
        'Incident_Severity': 'high',
        'Incident_Status': 'ongoing',
        'Incident_Reporter': 'TrafficGuardianAI',
        'Incident_CameraID': '002',
        'Incident_Description': 'T-bone/side-impact collision, 2 vehicle(s) in proximity. HIGH SEVERITY...'
    }
    
    for key, value in example_payload.items():
        print(f"   {key}: {value}")
    
    # Usage examples
    print("\nUsage Examples:")
    print("1. Process single video with API submission:")
    print("   result = classifier.process_and_submit_crash_video('crash.mp4')")
    print("   if result['api_submission']['success']:")
    print("       print(f\"Incident ID: {result['api_submission']['incident_id']}\")")
    
    print("\n2. Batch process folder with API submission:")
    print("   results = classifier.batch_process_and_submit('./videos/', submit_to_api=True)")
    print("   print(f\"Success: {results['api_statistics']['successful']}/{results['api_statistics']['submitted']}\")")
    
    print("\n3. Manual API submission:")
    print("   crash_report = classifier.classify_crash_video('video.mp4')")
    print("   api_result = classifier.submit_incident_to_api(crash_report)")
    
    print("\nSetup Instructions:")
    print("1. Create .env file in AI_Model_BB/Code/ directory")
    print("2. Add: API_KEY=your_api_key_here")
    print("3. Optionally configure API_ENDPOINT for custom server")
    print("4. Run video processing with submit_to_api=True")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    # Production Mode: Process incident videos and submit to TrafficGuardian API
    print("TRAFFICGUARDIAN AI - PRODUCTION MODE (Modularized)")
    print("=" * 70)
    
    # Check API configuration
    classifier = EnhancedCrashClassifier()
    if classifier.api_config['enabled']:
        print("API Integration: ENABLED")
        print(f"   Endpoint: {classifier.api_config['endpoint']}")
        print(f"   Authentication: X-API-Key (GitHub Secret: AIAPIKEY)")
    else:
        print("API Integration: DISABLED")
        print("   Missing AIAPIKEY environment variable")
        print("   Processing will continue but no API submissions will be made")
    
    print("=" * 70)
    
    # Run main processing
    try:
        main()
    finally:
        # Cleanup resources
        if classifier:
            classifier.cleanup()