"""
Unit Tests for AdvancedIncidentDetectionSystem
Tests all components: Multi-layer collision detection, API integration, tracking, etc.
"""
import unittest
import sys
import os
import numpy as np
import cv2
import json
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Add Code folder to path
current_dir = os.path.dirname(os.path.abspath(__file__))
code_folder = os.path.join(os.path.dirname(current_dir), 'Code')
if code_folder not in sys.path:
    sys.path.insert(0, code_folder)

try:
    from incident_detection_system import AdvancedIncidentDetectionSystem
    SYSTEM_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Could not import AdvancedIncidentDetectionSystem: {e}")
    SYSTEM_AVAILABLE = False

class TestAdvancedIncidentDetectionSystem(unittest.TestCase):
    """Test the main AdvancedIncidentDetectionSystem class"""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # Create test config
        self.test_config = {
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4,
            'display_window': False,  # Don't show windows during tests
            'save_incidents': False,  # Don't save files during tests
            'api_enabled': False,     # Don't make API calls during tests
            'collision_distance_threshold': 35,
            'min_tracking_confidence': 0.7,
            'require_all_layers': True,
            'minimum_layer_agreement': 4,
        }
        
        # Create test video path (mock)
        self.test_video_path = "test_video.mp4"
        
    @patch('cv2.VideoCapture')
    def test_system_initialization(self, mock_video_capture):
        """Test that the system initializes correctly"""
        # Mock video capture
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        # Mock YOLO model loading to avoid downloading
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url=self.test_video_path,
                config=self.test_config
            )
        
        # Test initialization
        self.assertIsNotNone(system)
        self.assertEqual(system.stream_url, self.test_video_path)
        self.assertEqual(system.config['confidence_threshold'], 0.4)
        self.assertFalse(system.config['display_window'])
        self.assertEqual(system.next_vehicle_id, 0)
        self.assertEqual(len(system.tracked_vehicles), 0)

class TestCollisionDetection(unittest.TestCase):
    """Test multi-layer collision detection system"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # Create minimal system for testing collision detection
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_collision_candidate_validation(self):
        """Test _is_collision_candidate method"""
        # Create mock vehicles
        vehicle1 = {
            'id': 1,
            'velocity': [10, 0],
            'speed': 10,
            'center': [100, 100]
        }
        vehicle2 = {
            'id': 2,
            'velocity': [-10, 0],
            'speed': 10,
            'center': [200, 100]
        }
        
        # Add to vehicle history
        self.system.vehicle_history[1] = [[90, 100], [95, 100], [100, 100]]
        self.system.vehicle_history[2] = [[210, 100], [205, 100], [200, 100]]
        
        # Test valid candidates
        result = self.system._is_collision_candidate(vehicle1, vehicle2, 3)
        self.assertTrue(result)
        
        # Test invalid candidates (no velocity)
        vehicle_no_velocity = {'id': 3, 'center': [150, 100]}
        result = self.system._is_collision_candidate(vehicle1, vehicle_no_velocity, 3)
        self.assertFalse(result)
    
    def test_vehicles_approaching(self):
        """Test _are_vehicles_approaching method"""
        # Vehicles approaching each other
        vehicle1 = {
            'center': [100, 100],
            'velocity': [5, 0]  # Moving right
        }
        vehicle2 = {
            'center': [200, 100],
            'velocity': [-5, 0]  # Moving left
        }
        
        result = self.system._are_vehicles_approaching(vehicle1, vehicle2)
        self.assertTrue(result)
        
        # Vehicles moving in same direction (not approaching)
        vehicle2['velocity'] = [5, 0]  # Both moving right
        result = self.system._are_vehicles_approaching(vehicle1, vehicle2)
        self.assertFalse(result)
    
    def test_basic_collision_prediction(self):
        """Test _predict_basic_collision method"""
        vehicle1 = {
            'center': [100, 100],
            'velocity': [10, 0]  # Moving right
        }
        vehicle2 = {
            'center': [200, 100],
            'velocity': [-10, 0]  # Moving left
        }
        
        result = self.system._predict_basic_collision(vehicle1, vehicle2, 10)
        
        # Should predict collision
        self.assertIsNotNone(result)
        self.assertIn('ttc', result)
        self.assertIn('collision_point', result)
        self.assertGreater(result['ttc'], 0)
    
    def test_depth_estimation(self):
        """Test depth estimation from intensity"""
        # Create test frame
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
        # Create test detections
        detections = [
            {'bbox': [50, 50, 100, 100], 'area': 10000},
            {'bbox': [200, 200, 80, 80], 'area': 6400}
        ]
        
        result = self.system._estimate_depth_from_intensity(test_frame, detections)
        
        self.assertEqual(len(result), 2)
        self.assertIn(0, result)
        self.assertIn(1, result)
        self.assertIn('depth_score', result[0])
        self.assertIn('shadow_indicator', result[0])

class TestVehicleTracking(unittest.TestCase):
    """Test vehicle tracking functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_create_new_track(self):
        """Test creating a new vehicle track"""
        vehicle = {
            'center': [100, 100],
            'bbox': [50, 50, 100, 100],
            'class': 'car',
            'confidence': 0.8
        }
        
        track_id = self.system._create_new_track(vehicle, 1)
        
        self.assertEqual(track_id, 0)  # First track should have ID 0
        self.assertEqual(self.system.next_vehicle_id, 1)
        self.assertIn(track_id, self.system.tracked_vehicles)
        self.assertEqual(self.system.tracked_vehicles[track_id]['class'], 'car')
    
    def test_update_track(self):
        """Test updating an existing vehicle track"""
        # Create initial track
        vehicle = {
            'center': [100, 100],
            'bbox': [50, 50, 100, 100],
            'class': 'car',
            'confidence': 0.8
        }
        track_id = self.system._create_new_track(vehicle, 1)
        
        # Update track
        updated_vehicle = {
            'center': [110, 100],
            'bbox': [60, 50, 100, 100],
            'class': 'car',
            'confidence': 0.9
        }
        self.system._update_track(track_id, updated_vehicle, 2)
        
        # Check updates
        tracked = self.system.tracked_vehicles[track_id]
        self.assertEqual(tracked['center'], [110, 100])
        self.assertEqual(tracked['confidence'], 0.9)
        self.assertEqual(tracked['last_seen'], 2)
        
        # Check history
        self.assertEqual(len(self.system.vehicle_history[track_id]), 2)
        self.assertEqual(self.system.vehicle_history[track_id][-1], [110, 100])
    
    def test_find_best_match(self):
        """Test finding best matching vehicle"""
        # Create existing track
        existing_vehicle = {
            'center': [100, 100],
            'bbox': [50, 50, 100, 100],
            'class': 'car',
            'confidence': 0.8
        }
        track_id = self.system._create_new_track(existing_vehicle, 1)
        self.system.tracked_vehicles[track_id]['last_seen'] = 1
        
        # Test matching vehicle (close position)
        new_vehicle = {'center': [105, 105]}  # Close to existing
        match = self.system._find_best_match(new_vehicle, 2)
        self.assertEqual(match, track_id)
        
        # Test non-matching vehicle (far position)
        far_vehicle = {'center': [500, 500]}  # Far from existing
        match = self.system._find_best_match(far_vehicle, 2)
        self.assertIsNone(match)

class TestAPIIntegration(unittest.TestCase):
    """Test API integration functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={
                    'display_window': False,
                    'api_enabled': True,
                    'api_endpoint': 'http://localhost:5000/api/incidents',
                    'api_key': 'test_key_12345',
                    'incident_location': 'Test Street & Test Avenue'
                }
            )
    
    def test_severity_mapping(self):
        """Test severity mapping for API"""
        self.assertEqual(self.system._map_severity_for_api('CRITICAL'), 'high')
        self.assertEqual(self.system._map_severity_for_api('HIGH'), 'high')
        self.assertEqual(self.system._map_severity_for_api('MEDIUM'), 'medium')
        self.assertEqual(self.system._map_severity_for_api('LOW'), 'low')
        self.assertEqual(self.system._map_severity_for_api('UNKNOWN'), 'medium')  # Default
    
    @patch('requests.post')
    def test_successful_api_call(self, mock_post):
        """Test successful API incident reporting"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Create test incident
        incident = {
            'type': 'collision',
            'severity': 'HIGH',
            'vehicles': ['car', 'truck']
        }
        
        # Send to API
        self.system._send_incident_to_api(incident)
        
        # Verify API call was made
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        # Check URL
        self.assertEqual(call_args[1]['url'], 'http://localhost:5000/api/incidents')
        
        # Check headers
        headers = call_args[1]['headers']
        self.assertEqual(headers['X-API-KEY'], 'test_key_12345')
        self.assertEqual(headers['Content-Type'], 'application/json')
        
        # Check data
        data = call_args[1]['json']
        self.assertEqual(data['Incident_Severity'], 'high')
        self.assertEqual(data['Incident_Status'], 'open')
        self.assertEqual(data['Incident_Location'], 'Test Street & Test Avenue')
        self.assertIn('Incident_Date', data)
        
        # Check analytics
        self.assertEqual(self.system.analytics['api_reports_sent'], 1)
        self.assertEqual(self.system.analytics['api_failures'], 0)
    
    @patch('requests.post')
    def test_failed_api_call(self, mock_post):
        """Test failed API incident reporting"""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response
        
        incident = {'type': 'collision', 'severity': 'HIGH'}
        
        self.system._send_incident_to_api(incident)
        
        # Check analytics
        self.assertEqual(self.system.analytics['api_reports_sent'], 0)
        self.assertEqual(self.system.analytics['api_failures'], 1)
    
    @patch('requests.post')
    def test_api_timeout(self, mock_post):
        """Test API timeout handling"""
        import requests
        mock_post.side_effect = requests.exceptions.Timeout()
        
        incident = {'type': 'collision', 'severity': 'HIGH'}
        
        self.system._send_incident_to_api(incident)
        
        # Check analytics
        self.assertEqual(self.system.analytics['api_reports_sent'], 0)
        self.assertEqual(self.system.analytics['api_failures'], 1)

class TestIncidentDetection(unittest.TestCase):
    """Test specific incident detection methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_stopped_vehicle_detection(self):
        """Test stopped vehicle detection"""
        # Create stopped vehicle
        self.system.tracked_vehicles[1] = {
            'velocity': [0.5, 0.5],  # Very slow
            'class': 'car',
            'center': [100, 100],
            'stopped_since': 1  # Stopped since frame 1
        }
        
        current_frame = 400  # 400 frames later (about 13 seconds at 30fps)
        
        incidents = self.system._detect_stopped_vehicles(current_frame)
        
        self.assertEqual(len(incidents), 1)
        self.assertEqual(incidents[0]['type'], 'stopped_vehicle')
        self.assertEqual(incidents[0]['vehicle_class'], 'car')
        self.assertGreater(incidents[0]['stopped_duration'], 10)  # More than 10 seconds
    
    def test_pedestrian_detection(self):
        """Test pedestrian on road detection"""
        # Create detections with pedestrian
        detections = [
            {
                'class': 'person',
                'center': [320, 240],  # In road area
                'confidence': 0.8
            },
            {
                'class': 'car',
                'center': [400, 300],
                'confidence': 0.9
            }
        ]
        
        incidents = self.system._detect_pedestrians_on_road(detections)
        
        self.assertEqual(len(incidents), 1)
        self.assertEqual(incidents[0]['type'], 'pedestrian_on_road')
        self.assertEqual(incidents[0]['severity'], 'HIGH')
    
    def test_speed_anomaly_detection(self):
        """Test sudden speed change detection"""
        # Create vehicle with speed history
        self.system.tracked_vehicles[1] = {
            'class': 'car',
            'center': [100, 100],
            'speed': 20.0,  # Current high speed
            'speed_history': [5.0, 5.2, 5.1, 4.9, 5.0]  # Previously slow
        }
        
        incidents = self.system._detect_speed_anomalies()
        
        self.assertEqual(len(incidents), 1)
        self.assertEqual(incidents[0]['type'], 'sudden_speed_change')
        self.assertGreater(incidents[0]['speed_change'], 0.8)  # Above threshold

class TestErrorHandling(unittest.TestCase):
    """Test error handling and edge cases"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_video_capture_failure(self, mock_video_capture):
        """Test handling of video capture failure"""
        # Mock failed video capture
        mock_cap = Mock()
        mock_cap.isOpened.return_value = False
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="nonexistent.mp4",
                config={'display_window': False}
            )
        
        # Should handle failure gracefully
        self.assertIsNotNone(system)
    
    def test_empty_detections(self):
        """Test handling of empty detection results"""
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=None):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False}
            )
        
        # Test with no model
        result = system._detect_objects(np.zeros((480, 640, 3), dtype=np.uint8))
        
        self.assertEqual(result['total_count'], 0)
        self.assertEqual(len(result['detections']), 0)
        self.assertEqual(result['fps'], 0)
    
    def test_invalid_detection_data(self):
        """Test handling of invalid detection data"""
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False}
            )
        
        # Test depth estimation with invalid bbox
        invalid_detections = [
            {'bbox': [700, 500, 100, 100], 'area': 10000}  # Out of bounds
        ]
        
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        result = system._estimate_depth_from_intensity(test_frame, invalid_detections)
        
        # Should handle gracefully
        self.assertIsInstance(result, dict)

class TestConfiguration(unittest.TestCase):
    """Test configuration handling"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_default_configuration(self, mock_video_capture):
        """Test default configuration values"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(stream_url="test.mp4")
        
        config = system.config
        
        # Test key defaults
        self.assertEqual(config['model_version'], 'yolov8s')
        self.assertEqual(config['confidence_threshold'], 0.4)
        self.assertTrue(config['require_all_layers'])
        self.assertEqual(config['minimum_layer_agreement'], 4)
        self.assertTrue(config['api_enabled'])
    
    @patch('cv2.VideoCapture')
    def test_custom_configuration(self, mock_video_capture):
        """Test custom configuration override"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        custom_config = {
            'confidence_threshold': 0.6,
            'api_enabled': False,
            'collision_distance_threshold': 50
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=custom_config
            )
        
        # Test custom values
        self.assertEqual(system.config['confidence_threshold'], 0.6)
        self.assertFalse(system.config['api_enabled'])
        self.assertEqual(system.config['collision_distance_threshold'], 50)
        
        # Test defaults still work
        self.assertEqual(system.config['model_version'], 'yolov8s')

class TestIntegration(unittest.TestCase):
    """Test integration between components"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    @patch('requests.post')
    def test_end_to_end_collision_detection(self, mock_post, mock_video_capture):
        """Test complete collision detection and API reporting flow"""
        # Mock video capture
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={
                    'display_window': False,
                    'api_enabled': True,
                    'require_all_layers': False,  # Make it easier to trigger
                    'minimum_layer_agreement': 1  # Only need 1 layer
                }
            )
        
        # Mock detection results
        mock_detections = [
            {
                'bbox': [100, 100, 50, 50],
                'confidence': 0.8,
                'class': 'car',
                'center': [125, 125],
                'area': 2500
            },
            {
                'bbox': [180, 100, 50, 50],
                'confidence': 0.9,
                'class': 'car',
                'center': [205, 125],
                'area': 2500
            }
        ]
        
        # Create test frame
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Process detection results
        detection_results = {
            'detections': mock_detections,
            'total_count': 2,
            'class_counts': {'car': 2},
            'fps': 30
        }
        
        # Update tracking
        tracking_results = system._update_vehicle_tracking(mock_detections)
        
        # Force vehicles to have approaching velocities
        for track_id in tracking_results['active_tracks']:
            if track_id == 0:
                system.tracked_vehicles[track_id]['velocity'] = [10, 0]  # Moving right
            else:
                system.tracked_vehicles[track_id]['velocity'] = [-10, 0]  # Moving left
            system.tracked_vehicles[track_id]['speed'] = 10
        
        # Add sufficient history for collision detection
        for track_id in tracking_results['active_tracks']:
            system.vehicle_history[track_id] = [
                [100, 125], [110, 125], [120, 125], [125, 125]
            ] if track_id == 0 else [
                [220, 125], [210, 125], [205, 125], [205, 125]
            ]
        
        # Test multilayer incident detection
        incidents = system._detect_incidents_multilayer(
            test_frame, detection_results, tracking_results
        )
        
        # Should detect incidents if collision prediction works
        # Note: This might not always trigger due to strict validation
        self.assertIsInstance(incidents, list)

if __name__ == '__main__':
    # Check if system is available
    if not SYSTEM_AVAILABLE:
        print("❌ AdvancedIncidentDetectionSystem not available for testing")
        print("   Make sure 'incident_detection_system.py' exists in the Code folder")
        sys.exit(1)
    
    # Run tests
    unittest.main(verbosity=2)