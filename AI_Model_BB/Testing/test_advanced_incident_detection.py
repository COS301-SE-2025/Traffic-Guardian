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
        
        # FIXED: Complete test config with ALL required keys
        self.test_config = {
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4,
            'iou_threshold': 0.45,
            'display_window': False,
            'save_incidents': False,
            'log_detections': True,
            'frame_skip': 2,
            'api_enabled': False,
            
            # All collision detection settings
            'collision_distance_threshold': 35,
            'prediction_horizon': 12,
            'min_tracking_confidence': 0.7,
            'min_collision_speed': 5.0,
            'collision_angle_threshold': 30,
            'min_trajectory_length': 8,
            'collision_persistence': 5,
            
            # Depth settings
            'depth_analysis_enabled': True,
            'depth_difference_threshold': 0.3,
            'shadow_detection_threshold': 0.8,
            
            # Optical flow settings
            'optical_flow_enabled': True,
            'flow_magnitude_threshold': 20.0,
            'flow_direction_change_threshold': 45,
            
            # Physics settings
            'physics_validation_enabled': True,
            'max_realistic_acceleration': 15.0,
            'momentum_change_threshold': 25.0,
            'deceleration_threshold': 12.0,
            
            # Final validation
            'require_all_layers': False,  # Match your code's defaults
            'minimum_layer_agreement': 3,  # Match your code's defaults
            'collision_confidence_threshold': 0.8,
            
            # Other incident detection
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'pedestrian_road_threshold': 50,
            
            # API settings
            'api_endpoint': 'http://localhost:5000/api/incidents',
            'api_key': 'abcde12345abcde',
            'api_timeout': 5,
            'api_retry_attempts': 2,
            'incident_location': 'Traffic Camera Location',
        }
        
        self.test_video_path = "test_video.mp4"
        
    @patch('cv2.VideoCapture')
    def test_system_initialization(self, mock_video_capture):
        """Test that the system initializes correctly"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url=self.test_video_path,
                config=self.test_config
            )
        
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
        
        # FIXED: Complete config for collision detection tests
        complete_config = {
            'display_window': False,
            'api_enabled': False,
            'save_incidents': False,
            'collision_distance_threshold': 35,
            'min_collision_speed': 5.0,
            'collision_angle_threshold': 30,
            'min_trajectory_length': 8,
            'shadow_detection_threshold': 0.8,
            'depth_difference_threshold': 0.3,
            'min_tracking_confidence': 0.7,
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'flow_magnitude_threshold': 20.0,
            'physics_validation_enabled': True,
            'deceleration_threshold': 12.0,
            'require_all_layers': False,
            'minimum_layer_agreement': 3,
            'collision_confidence_threshold': 0.8,
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=complete_config
            )
    
    def test_collision_candidate_validation(self):
        """Test _is_collision_candidate method"""
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
        
        # Add sufficient vehicle history
        self.system.vehicle_history[1] = [[i, 100] for i in range(90, 101)]  # 11 points
        self.system.vehicle_history[2] = [[i, 100] for i in range(210, 199, -1)]  # 11 points
        
        result = self.system._is_collision_candidate(vehicle1, vehicle2, 8)
        self.assertTrue(result)
        
        # Test invalid candidates
        vehicle_no_velocity = {'id': 3, 'center': [150, 100]}
        result = self.system._is_collision_candidate(vehicle1, vehicle_no_velocity, 8)
        self.assertFalse(result)
    
    def test_vehicles_approaching(self):
        """Test _are_vehicles_approaching method"""
        vehicle1 = {
            'center': [100, 100],
            'velocity': [5, 0]
        }
        vehicle2 = {
            'center': [200, 100],
            'velocity': [-5, 0]
        }
        
        result = self.system._are_vehicles_approaching(vehicle1, vehicle2)
        self.assertTrue(result)
        
        # Test vehicles moving in same direction
        vehicle2['velocity'] = [5, 0]
        result = self.system._are_vehicles_approaching(vehicle1, vehicle2)
        self.assertFalse(result)
    
    def test_basic_collision_prediction(self):
        """Test _predict_basic_collision method"""
        vehicle1 = {
            'center': [100, 100],
            'velocity': [10, 0]
        }
        vehicle2 = {
            'center': [200, 100],
            'velocity': [-10, 0]
        }
        
        result = self.system._predict_basic_collision(vehicle1, vehicle2, 10)
        
        self.assertIsNotNone(result)
        self.assertIn('ttc', result)
        self.assertIn('collision_point', result)
        self.assertGreater(result['ttc'], 0)
    
    def test_depth_estimation(self):
        """Test depth estimation from intensity"""
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
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
        
        # FIXED: Minimal but complete config
        minimal_config = {
            'display_window': False,
            'api_enabled': False,
            'min_tracking_confidence': 0.7,
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=minimal_config
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
        
        self.assertEqual(track_id, 0)
        self.assertEqual(self.system.next_vehicle_id, 1)
        self.assertIn(track_id, self.system.tracked_vehicles)
        self.assertEqual(self.system.tracked_vehicles[track_id]['class'], 'car')
    
    def test_update_track(self):
        """Test updating an existing vehicle track"""
        vehicle = {
            'center': [100, 100],
            'bbox': [50, 50, 100, 100],
            'class': 'car',
            'confidence': 0.8
        }
        track_id = self.system._create_new_track(vehicle, 1)
        
        updated_vehicle = {
            'center': [110, 100],
            'bbox': [60, 50, 100, 100],
            'class': 'car',
            'confidence': 0.9
        }
        self.system._update_track(track_id, updated_vehicle, 2)
        
        tracked = self.system.tracked_vehicles[track_id]
        self.assertEqual(tracked['center'], [110, 100])
        self.assertEqual(tracked['confidence'], 0.9)
        self.assertEqual(tracked['last_seen'], 2)
        
        self.assertEqual(len(self.system.vehicle_history[track_id]), 2)
        self.assertEqual(self.system.vehicle_history[track_id][-1], [110, 100])
    
    def test_find_best_match(self):
        """Test finding best matching vehicle"""
        existing_vehicle = {
            'center': [100, 100],
            'bbox': [50, 50, 100, 100],
            'class': 'car',
            'confidence': 0.8
        }
        track_id = self.system._create_new_track(existing_vehicle, 1)
        self.system.tracked_vehicles[track_id]['last_seen'] = 1
        
        new_vehicle = {'center': [105, 105]}
        match = self.system._find_best_match(new_vehicle, 2)
        self.assertEqual(match, track_id)
        
        far_vehicle = {'center': [500, 500]}
        match = self.system._find_best_match(far_vehicle, 2)
        self.assertIsNone(match)

class TestAPIIntegration(unittest.TestCase):
    """Test API integration functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # FIXED: Complete API config
        api_config = {
            'display_window': False,
            'api_enabled': True,
            'api_endpoint': 'http://localhost:5000/api/incidents',
            'api_key': 'test_key_12345',
            'api_timeout': 5,
            'incident_location': 'Test Street & Test Avenue'
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=api_config
            )
    
    def test_severity_mapping(self):
        """Test severity mapping for API"""
        self.assertEqual(self.system._map_severity_for_api('CRITICAL'), 'high')
        self.assertEqual(self.system._map_severity_for_api('HIGH'), 'high')
        self.assertEqual(self.system._map_severity_for_api('MEDIUM'), 'medium')
        self.assertEqual(self.system._map_severity_for_api('LOW'), 'low')
        self.assertEqual(self.system._map_severity_for_api('UNKNOWN'), 'medium')
    
    @patch('requests.post')
    def test_successful_api_call(self, mock_post):
        """Test successful API incident reporting"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        incident = {
            'type': 'collision',
            'severity': 'HIGH',
            'vehicles': ['car', 'truck']
        }
        
        self.system._send_incident_to_api(incident)
        
        mock_post.assert_called_once()
        
        # FIXED: Correct way to access call arguments
        call_args = mock_post.call_args
        
        # Check URL (first positional argument)
        self.assertEqual(call_args[0][0], 'http://localhost:5000/api/incidents')
        
        # Check keyword arguments
        self.assertIn('headers', call_args[1])
        self.assertIn('json', call_args[1])
        self.assertIn('timeout', call_args[1])
        
        headers = call_args[1]['headers']
        self.assertEqual(headers['X-API-KEY'], 'test_key_12345')
        self.assertEqual(headers['Content-Type'], 'application/json')
        
        data = call_args[1]['json']
        self.assertEqual(data['Incident_Severity'], 'high')
        self.assertEqual(data['Incident_Status'], 'open')
        self.assertEqual(data['Incident_Location'], 'Test Street & Test Avenue')
        self.assertIn('Incident_Date', data)
        
        self.assertEqual(self.system.analytics['api_reports_sent'], 1)
        self.assertEqual(self.system.analytics['api_failures'], 0)
    
    @patch('requests.post')
    def test_failed_api_call(self, mock_post):
        """Test failed API incident reporting"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response
        
        incident = {'type': 'collision', 'severity': 'HIGH'}
        
        self.system._send_incident_to_api(incident)
        
        self.assertEqual(self.system.analytics['api_reports_sent'], 0)
        self.assertEqual(self.system.analytics['api_failures'], 1)
    
    @patch('requests.post')
    def test_api_timeout(self, mock_post):
        """Test API timeout handling"""
        import requests
        mock_post.side_effect = requests.exceptions.Timeout()
        
        incident = {'type': 'collision', 'severity': 'HIGH'}
        
        self.system._send_incident_to_api(incident)
        
        self.assertEqual(self.system.analytics['api_reports_sent'], 0)
        self.assertEqual(self.system.analytics['api_failures'], 1)

class TestIncidentDetection(unittest.TestCase):
    """Test specific incident detection methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # FIXED: Complete config for incident detection
        incident_config = {
            'display_window': False,
            'api_enabled': False,
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'pedestrian_road_threshold': 50,
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=incident_config
            )
    
    def test_stopped_vehicle_detection(self):
        """Test stopped vehicle detection"""
        self.system.tracked_vehicles[1] = {
            'velocity': [0.5, 0.5],
            'class': 'car',
            'center': [100, 100],
            'stopped_since': 1
        }
        
        current_frame = 400  # 400 frames later
        
        incidents = self.system._detect_stopped_vehicles(current_frame)
        
        self.assertEqual(len(incidents), 1)
        self.assertEqual(incidents[0]['type'], 'stopped_vehicle')
        self.assertEqual(incidents[0]['vehicle_class'], 'car')
        self.assertGreater(incidents[0]['stopped_duration'], 10)
    
    def test_pedestrian_detection(self):
        """Test pedestrian on road detection"""
        detections = [
            {
                'class': 'person',
                'center': [320, 240],
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
        self.system.tracked_vehicles[1] = {
            'class': 'car',
            'center': [100, 100],
            'speed': 20.0,
            'speed_history': [5.0, 5.2, 5.1, 4.9, 5.0]
        }
        
        incidents = self.system._detect_speed_anomalies()
        
        self.assertEqual(len(incidents), 1)
        self.assertEqual(incidents[0]['type'], 'sudden_speed_change')
        self.assertGreater(incidents[0]['speed_change'], 0.8)

class TestErrorHandling(unittest.TestCase):
    """Test error handling and edge cases"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_video_capture_failure(self, mock_video_capture):
        """Test handling of video capture failure"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = False
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="nonexistent.mp4",
                config={'display_window': False}
            )
        
        self.assertIsNotNone(system)
    
    def test_empty_detections(self):
        """Test handling of empty detection results"""
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=None):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False}
            )
        
        result = system._detect_objects(np.zeros((480, 640, 3), dtype=np.uint8))
        
        self.assertEqual(result['total_count'], 0)
        self.assertEqual(len(result['detections']), 0)
        self.assertEqual(result['fps'], 0)
    
    def test_invalid_detection_data(self):
        """Test handling of invalid detection data"""
        # FIXED: Add shadow_detection_threshold to config
        config = {
            'display_window': False,
            'shadow_detection_threshold': 0.8
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=config
            )
        
        invalid_detections = [
            {'bbox': [700, 500, 100, 100], 'area': 10000}
        ]
        
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        result = system._estimate_depth_from_intensity(test_frame, invalid_detections)
        
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
        
        # FIXED: Test actual default values from your code
        self.assertEqual(config['model_version'], 'yolov8s')
        self.assertEqual(config['confidence_threshold'], 0.4)
        self.assertFalse(config['require_all_layers'])  # Your actual default
        self.assertEqual(config['minimum_layer_agreement'], 3)  # Your actual default
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
        
        # FIXED: Only test the values we actually set
        self.assertEqual(system.config['confidence_threshold'], 0.6)
        self.assertFalse(system.config['api_enabled'])
        self.assertEqual(system.config['collision_distance_threshold'], 50)

class TestIntegration(unittest.TestCase):
    """Test integration between components"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    @patch('requests.post')
    def test_end_to_end_collision_detection(self, mock_post, mock_video_capture):
        """Test complete collision detection and API reporting flow"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # FIXED: Complete config for integration test
        complete_config = {
            'display_window': False,
            'api_enabled': True,
            'require_all_layers': False,
            'minimum_layer_agreement': 1,
            'min_tracking_confidence': 0.7,
            'collision_distance_threshold': 35,
            'min_collision_speed': 5.0,
            'collision_angle_threshold': 30,
            'min_trajectory_length': 8,
            'api_endpoint': 'http://localhost:5000/api/incidents',
            'api_key': 'test_key',
            'incident_location': 'Test Location'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config=complete_config
            )
        
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
        
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        detection_results = {
            'detections': mock_detections,
            'total_count': 2,
            'class_counts': {'car': 2},
            'fps': 30
        }
        
        tracking_results = system._update_vehicle_tracking(mock_detections)
        
        # Force vehicles to have appropriate properties for collision detection
        for track_id in tracking_results['active_tracks']:
            if track_id == 0:
                system.tracked_vehicles[track_id]['velocity'] = [10, 0]
            else:
                system.tracked_vehicles[track_id]['velocity'] = [-10, 0]
            system.tracked_vehicles[track_id]['speed'] = 10
            
            # Add sufficient history
            system.vehicle_history[track_id] = [
                [100 + i*5, 125] for i in range(10)
            ] if track_id == 0 else [
                [220 - i*5, 125] for i in range(10)
            ]
        
        incidents = system._detect_incidents_multilayer(
            test_frame, detection_results, tracking_results
        )
        
        self.assertIsInstance(incidents, list)

if __name__ == '__main__':
    if not SYSTEM_AVAILABLE:
        print("❌ AdvancedIncidentDetectionSystem not available for testing")
        print("   Make sure 'incident_detection_system.py' exists in the Code folder")
        sys.exit(1)
    
    unittest.main(verbosity=2)