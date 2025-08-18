"""
Unit Tests for Enhanced Video Incident Classifier
Tests all major components of the crash detection and classification system.
"""

import unittest
import sys
import os
import tempfile
import shutil
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import numpy as np
import torch
import cv2

# Add the Code directory to the path to import the main module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'Code'))

try:
    from video_incident_classifier import (
        EnhancedCrashClassifier, 
        CrashReport, 
        LRUCache,
        EnhancedVideoPreprocessor,
        CrashSpecificCNN,
        test_api_payload_generator
    )
except ImportError as e:
    print(f"Warning: Could not import video_incident_classifier: {e}")
    print("Make sure the module is in the correct path")


class TestLRUCache(unittest.TestCase):
    """Test the LRU Cache implementation."""
    
    def setUp(self):
        self.cache = LRUCache(3)
    
    def test_cache_basic_operations(self):
        """Test basic cache put/get operations."""
        self.cache.put("key1", "value1")
        self.cache.put("key2", "value2")
        
        self.assertEqual(self.cache.get("key1"), "value1")
        self.assertEqual(self.cache.get("key2"), "value2")
    
    def test_cache_capacity_limit(self):
        """Test that cache respects capacity limits."""
        # Fill cache to capacity
        self.cache.put("key1", "value1")
        self.cache.put("key2", "value2")
        self.cache.put("key3", "value3")
        
        # Add one more item - should evict oldest
        self.cache.put("key4", "value4")
        
        # key1 should be evicted (oldest)
        self.assertIsNone(self.cache.get("key1"))
        self.assertEqual(self.cache.get("key4"), "value4")
    
    def test_cache_lru_behavior(self):
        """Test LRU eviction behavior."""
        self.cache.put("key1", "value1")
        self.cache.put("key2", "value2")
        self.cache.put("key3", "value3")
        
        # Access key1 to make it most recently used
        self.cache.get("key1")
        
        # Add new item - key2 should be evicted (least recently used)
        self.cache.put("key4", "value4")
        
        self.assertIsNone(self.cache.get("key2"))
        self.assertEqual(self.cache.get("key1"), "value1")


class TestCrashReport(unittest.TestCase):
    """Test the CrashReport dataclass."""
    
    def test_crash_report_creation(self):
        """Test creating a valid CrashReport."""
        report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2",
            camera_id="cam001"
        )
        
        self.assertEqual(report.incident_type, "tbone_side_impact")
        self.assertEqual(report.confidence, 0.85)
        self.assertEqual(report.vehicles_involved, 2)
        self.assertEqual(report.camera_id, "cam001")
    
    def test_crash_report_optional_fields(self):
        """Test that optional fields work correctly."""
        report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2"
        )
        
        # Optional fields should be None by default
        self.assertIsNone(report.camera_id)
        self.assertIsNone(report.camera_location)
        self.assertIsNone(report.timestamp)


class TestEnhancedVideoPreprocessor(unittest.TestCase):
    """Test the video preprocessing functionality."""
    
    def setUp(self):
        self.preprocessor = EnhancedVideoPreprocessor()
    
    def test_preprocessor_initialization(self):
        """Test that preprocessor initializes correctly."""
        self.assertIsNotNone(self.preprocessor.denoise_kernel)
        self.assertEqual(self.preprocessor.denoise_kernel.shape, (3, 3))
    
    @patch('cv2.VideoCapture')
    def test_detect_video_quality_no_video(self, mock_capture):
        """Test video quality detection with invalid video."""
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = False
        mock_capture.return_value = mock_cap
        
        quality = self.preprocessor.detect_video_quality("invalid_video.mp4")
        self.assertEqual(quality, "poor")
    
    def test_enhance_frame_quality_invalid_input(self):
        """Test frame enhancement with invalid input."""
        # Test with None frame
        result = self.preprocessor.enhance_frame_quality(None)
        self.assertIsNone(result)
        
        # Test with empty frame
        empty_frame = np.array([])
        result = self.preprocessor.enhance_frame_quality(empty_frame)
        self.assertIsNone(result)
    
    def test_enhance_frame_quality_valid_input(self):
        """Test frame enhancement with valid input."""
        # Create a test frame
        test_frame = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = self.preprocessor.enhance_frame_quality(test_frame, 'medium')
        self.assertIsNotNone(result)
        self.assertEqual(result.shape, test_frame.shape)


class TestCrashSpecificCNN(unittest.TestCase):
    """Test the CNN model architecture."""
    
    def setUp(self):
        self.num_classes = 10
        self.model = CrashSpecificCNN(num_classes=self.num_classes)
    
    def test_model_initialization(self):
        """Test that the model initializes correctly."""
        self.assertIsNotNone(self.model)
        self.assertEqual(len(self.model.CRASH_TYPES) if hasattr(self.model, 'CRASH_TYPES') else self.num_classes, self.num_classes)
    
    def test_model_forward_pass(self):
        """Test forward pass through the model."""
        # Create dummy input tensor
        batch_size = 2
        channels = 3
        height = 224
        width = 224
        
        dummy_input = torch.randn(batch_size, channels, height, width)
        
        with torch.no_grad():
            output = self.model(dummy_input)
        
        # Check output shape
        self.assertEqual(output.shape[0], batch_size)
        self.assertEqual(output.shape[1], self.num_classes)
    
    def test_model_eval_mode(self):
        """Test that model can be set to evaluation mode."""
        self.model.eval()
        self.assertFalse(self.model.training)


class TestEnhancedCrashClassifier(unittest.TestCase):
    """Test the main crash classifier."""
    
    def setUp(self):
        # Mock torch.cuda.is_available to avoid GPU requirements
        with patch('torch.cuda.is_available', return_value=False):
            self.classifier = EnhancedCrashClassifier()
    
    def test_classifier_initialization(self):
        """Test that classifier initializes correctly."""
        self.assertIsNotNone(self.classifier)
        self.assertIsNotNone(self.classifier.config)
        self.assertIsNotNone(self.classifier.device)
        self.assertIsNotNone(self.classifier.model)
        self.assertIsNotNone(self.classifier.preprocessor)
    
    def test_crash_types_mapping(self):
        """Test that crash types are properly defined."""
        crash_types = self.classifier.CRASH_TYPES
        self.assertIsInstance(crash_types, dict)
        self.assertGreater(len(crash_types), 0)
        
        # Check some expected crash types
        crash_type_values = list(crash_types.values())
        self.assertIn("tbone_side_impact", crash_type_values)
        self.assertIn("rear_end_collision", crash_type_values)
    
    def test_severity_mapping(self):
        """Test that severity mapping is correct."""
        severity_map = self.classifier.CRASH_SEVERITY_MAP
        self.assertIsInstance(severity_map, dict)
        
        # Check that critical types are mapped correctly
        self.assertEqual(severity_map.get("head_on_collision"), "critical")
        self.assertEqual(severity_map.get("vehicle_pedestrian"), "critical")
    
    def test_parse_incident_filename_valid(self):
        """Test parsing valid incident filename."""
        filename = "incident_2_20250811_181338_966_collision.mp4"
        result = self.classifier.parse_incident_filename(filename)
        
        self.assertEqual(result['camera_id'], '2')
        self.assertEqual(result['date'], '20250811')
        self.assertEqual(result['time'], '181338')
        self.assertEqual(result['milliseconds'], '966')
        self.assertEqual(result['original_incident_type'], 'collision')
    
    def test_parse_incident_filename_invalid(self):
        """Test parsing invalid incident filename."""
        filename = "invalid_filename.mp4"
        result = self.classifier.parse_incident_filename(filename)
        
        self.assertIsNone(result['camera_id'])
        self.assertIsNone(result['date'])
        self.assertIsNone(result['time'])
        self.assertIsNone(result['milliseconds'])
        self.assertIsNone(result['original_incident_type'])
    
    def test_is_valid_incident_type(self):
        """Test incident type validation."""
        self.assertTrue(self.classifier.is_valid_incident_type('collision'))
        self.assertTrue(self.classifier.is_valid_incident_type('stopped_vehicle'))
        self.assertFalse(self.classifier.is_valid_incident_type('invalid_type'))
    
    def test_compare_filename_vs_classification(self):
        """Test comparison between filename and classification."""
        result = self.classifier.compare_filename_vs_classification(
            'collision', 'tbone_side_impact'
        )
        
        self.assertEqual(result['filename_incident_type'], 'collision')
        self.assertEqual(result['classified_incident_type'], 'tbone_side_impact')
        self.assertEqual(result['mapped_classification'], 'collision')
        self.assertTrue(result['types_match'])
    
    def test_get_camera_info(self):
        """Test camera information retrieval."""
        # Test with default camera
        info = self.classifier.get_camera_info('default')
        self.assertIsNotNone(info)
        self.assertIn('latitude', info)
        self.assertIn('longitude', info)
        
        # Test with unknown camera
        info = self.classifier.get_camera_info('unknown_camera')
        self.assertIsNotNone(info)
    
    def test_api_config_loading(self):
        """Test API configuration loading."""
        config = self.classifier.api_config
        self.assertIsInstance(config, dict)
        self.assertIn('endpoint', config)
        self.assertIn('enabled', config)
        self.assertIn('timeout', config)
    
    @patch('os.path.exists')
    def test_classify_crash_video_file_not_exists(self, mock_exists):
        """Test crash video classification with non-existent file."""
        mock_exists.return_value = False
        
        with self.assertRaises(FileNotFoundError):
            self.classifier.classify_crash_video("nonexistent.mp4")
    
    def test_map_crash_report_to_api_payload(self):
        """Test mapping crash report to API payload."""
        # Create a test crash report
        crash_report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2",
            camera_id="cam001"
        )
        
        payload = self.classifier._map_crash_report_to_api_payload(crash_report)
        
        # Check required database fields
        self.assertIn('Incidents_DateTime', payload)
        self.assertIn('Incidents_Longitude', payload)
        self.assertIn('Incidents_Latitude', payload)
        self.assertIn('Incident_Severity', payload)
        self.assertIn('Incident_Status', payload)
        self.assertIn('Incident_Reporter', payload)
        self.assertIn('Incident_CameraID', payload)
        self.assertIn('Incident_Description', payload)
        
        # Check values
        self.assertEqual(payload['Incident_Severity'], 'high')
        self.assertEqual(payload['Incident_Status'], 'ongoing')
        self.assertEqual(payload['Incident_Reporter'], 'TrafficGuardianAI')
        self.assertEqual(payload['Incident_CameraID'], 'cam001')


class TestAPIIntegration(unittest.TestCase):
    """Test API integration functionality."""
    
    def setUp(self):
        with patch('torch.cuda.is_available', return_value=False):
            self.classifier = EnhancedCrashClassifier()
    
    @patch('requests.post')
    def test_submit_incident_to_api_success(self, mock_post):
        """Test successful API submission."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            'incident': {'Incidents_ID': 123}
        }
        mock_post.return_value = mock_response
        
        # Enable API for testing
        self.classifier.api_config['enabled'] = True
        self.classifier.api_config['api_key'] = 'test_key'
        
        # Create test crash report
        crash_report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2",
            camera_id="cam001"
        )
        
        result = self.classifier.submit_incident_to_api(crash_report)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['incident_id'], 123)
    
    def test_submit_incident_to_api_disabled(self):
        """Test API submission when disabled."""
        # Ensure API is disabled
        self.classifier.api_config['enabled'] = False
        
        crash_report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2"
        )
        
        result = self.classifier.submit_incident_to_api(crash_report)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'API integration disabled')
    
    @patch('requests.post')
    def test_submit_incident_to_api_auth_error(self, mock_post):
        """Test API submission with authentication error."""
        # Mock 401 response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        # Enable API for testing
        self.classifier.api_config['enabled'] = True
        self.classifier.api_config['api_key'] = 'invalid_key'
        
        crash_report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2"
        )
        
        result = self.classifier.submit_incident_to_api(crash_report)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'Authentication failed')
        self.assertEqual(result['status_code'], 401)


class TestUtilityFunctions(unittest.TestCase):
    """Test utility functions."""
    
    @patch('video_incident_classifier.EnhancedCrashClassifier')
    def test_api_payload_generator(self, mock_classifier_class):
        """Test the API payload generator function."""
        # Mock the classifier
        mock_classifier = MagicMock()
        mock_classifier.api_config = {
            'endpoint': 'http://localhost:5000/api/incidents',
            'api_key': 'test_key',
            'enabled': True
        }
        mock_classifier._map_crash_report_to_api_payload.return_value = {
            'Incidents_DateTime': '2025-08-12T14:30:45.123Z',
            'Incident_Severity': 'high'
        }
        mock_classifier_class.return_value = mock_classifier
        
        # Capture print output
        with patch('builtins.print') as mock_print:
            test_api_payload_generator()
            
            # Check that function executed without errors
            self.assertTrue(mock_print.called)
            
            # Check that classifier was created
            mock_classifier_class.assert_called_once()


class TestBatchProcessing(unittest.TestCase):
    """Test batch processing functionality."""
    
    def setUp(self):
        with patch('torch.cuda.is_available', return_value=False):
            self.classifier = EnhancedCrashClassifier()
        
        # Create temporary directory for test videos
        self.test_dir = tempfile.mkdtemp()
        
        # Create mock video files
        self.test_videos = [
            "incident_1_20250811_181338_966_collision.mp4",
            "incident_2_20250811_181400_123_collision.mp4",
            "not_incident_video.mp4"
        ]
        
        for video in self.test_videos:
            with open(os.path.join(self.test_dir, video), 'w') as f:
                f.write("mock video content")
    
    def tearDown(self):
        # Clean up temporary directory
        shutil.rmtree(self.test_dir)
    
    @patch.object(EnhancedCrashClassifier, 'classify_crash_video')
    def test_process_crash_folder_with_valid_files(self, mock_classify):
        """Test processing folder with valid incident files."""
        # Mock crash report
        mock_report = CrashReport(
            incident_datetime="2025-08-12T14:30:45.123Z",
            incident_latitude=-26.1076,
            incident_longitude=28.0567,
            incident_severity="high",
            incident_status="active",
            incident_reporter="AI Crash Detection System",
            alerts_message="Test collision detected",
            incident_type="tbone_side_impact",
            confidence=0.85,
            video_path="test_video.mp4",
            processing_timestamp="2025-08-12T14:30:50.000Z",
            vehicles_involved=2,
            impact_severity="moderate",
            crash_phase="impact",
            estimated_speed="medium_speed",
            damage_assessment="moderate",
            emergency_priority="PRIORITY_2"
        )
        mock_classify.return_value = mock_report
        
        results = self.classifier.process_crash_folder(self.test_dir)
        
        self.assertEqual(results['folder_path'], self.test_dir)
        self.assertGreaterEqual(results['processed_videos'], 2)  # Should process the incident files
        self.assertIsInstance(results['crash_reports'], list)
    
    def test_process_crash_folder_empty_directory(self):
        """Test processing empty directory."""
        empty_dir = tempfile.mkdtemp()
        try:
            results = self.classifier.process_crash_folder(empty_dir)
            
            self.assertEqual(results['processed_videos'], 0)
            self.assertEqual(len(results['crash_reports']), 0)
        finally:
            shutil.rmtree(empty_dir)
    
    def test_process_crash_folder_nonexistent_directory(self):
        """Test processing non-existent directory."""
        nonexistent_dir = "/path/that/does/not/exist"
        
        results = self.classifier.process_crash_folder(nonexistent_dir)
        
        self.assertEqual(results['processed_videos'], 0)
        self.assertEqual(len(results['crash_reports']), 0)


if __name__ == '__main__':
    # Set up test environment
    print("🧪 Running Enhanced Video Incident Classifier Tests")
    print("=" * 60)
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_classes = [
        TestLRUCache,
        TestCrashReport,
        TestEnhancedVideoPreprocessor,
        TestCrashSpecificCNN,
        TestEnhancedCrashClassifier,
        TestAPIIntegration,
        TestUtilityFunctions,
        TestBatchProcessing
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print("🎯 TEST SUMMARY")
    print("=" * 60)
    print(f"Tests Run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print("\n❌ FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.splitlines()[-1]}")
    
    if result.errors:
        print("\n🚨 ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback.splitlines()[-1]}")
    
    if not result.failures and not result.errors:
        print("\n✅ All tests passed successfully!")
    
    print("=" * 60)
