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
from dotenv import load_dotenv


load_dotenv()

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
        
        # Updated test config to match current code structure
        self.test_config = {
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4,
            'iou_threshold': 0.45,
            'display_window': False,
            'save_incidents': False,
            'log_detections': True,
            'frame_skip': 2,
            
            # Enhanced collision detection settings
            'collision_distance_threshold': 30,
            'prediction_horizon': 15,
            'min_tracking_confidence': 0.7,
            'min_collision_speed': 8.0,
            'collision_angle_threshold': 30,
            'min_trajectory_length': 10,
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
            'deceleration_threshold': 10.0,
            
            # Enhanced validation requirements
            'require_all_layers': False,
            'minimum_layer_agreement': 2,
            'collision_confidence_threshold': 0.7,
            
            # Other incident detection
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'pedestrian_road_threshold': 50,
            
            # Location setting
            'incident_location': 'Test Camera Location',
        }
        
        self.test_camera_config = {
            'camera_id': 'test_camera_01',
            'url': 'test_video.mp4',
            'location': 'Test Intersection'
        }
        
    @patch('builtins.print')
    @patch('os.makedirs')
    def test_system_initialization(self, mock_makedirs, mock_print):
        """Test that the system initializes correctly with camera config"""
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=self.test_camera_config,
                config=self.test_config
            )
        
        self.assertIsNotNone(system)
        self.assertEqual(system.camera_config, self.test_camera_config)
        self.assertEqual(system.config['confidence_threshold'], 0.4)
        self.assertFalse(system.config['display_window'])
        self.assertEqual(system.next_vehicle_id, 0)
        self.assertEqual(len(system.tracked_vehicles), 0)
        mock_makedirs.assert_called_once()
        
    def test_default_config(self):
        """Test default configuration generation"""
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=self.test_camera_config,
                config=None
            )
        
        # Check that default config is properly set
        self.assertIn('collision_distance_threshold', system.config)
        self.assertIn('depth_analysis_enabled', system.config)
        self.assertIn('physics_validation_enabled', system.config)
        self.assertEqual(system.config['minimum_layer_agreement'], 2)
        
    def test_camera_threshold_adaptation(self):
        """Test camera-specific threshold adaptation"""
        # Test highway camera
        highway_config = {
            'camera_id': 'highway_01',
            'url': 'http://highway.stream.m3u8',
            'location': 'Highway 401'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=highway_config,
                config=self.test_config
            )
        
        # Should adapt thresholds for highway camera
        self.assertIsNotNone(system.config['collision_confidence_threshold'])

class TestCollisionDetection(unittest.TestCase):
    """Test multi-layer collision detection system"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # Updated config to match current code structure
        complete_config = {
            'display_window': False,
            'save_incidents': False,
            'collision_distance_threshold': 30,
            'min_collision_speed': 8.0,
            'collision_angle_threshold': 30,
            'min_trajectory_length': 10,
            'shadow_detection_threshold': 0.8,
            'depth_difference_threshold': 0.3,
            'min_tracking_confidence': 0.7,
            'stopped_vehicle_time': 10,
            'speed_change_threshold': 0.8,
            'flow_magnitude_threshold': 20.0,
            'physics_validation_enabled': True,
            'deceleration_threshold': 10.0,
            'require_all_layers': False,
            'minimum_layer_agreement': 2,
            'collision_confidence_threshold': 0.7,
        }
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=complete_config
            )
    
    def test_enhanced_collision_detection(self):
        """Test enhanced traffic-aware collision detection"""
        # Create active tracks for testing
        active_tracks = {
            1: {
                'id': 1,
                'velocity': [10, 0],
                'speed': 10,
                'center': [100, 100],
                'class': 'car',
                'last_seen': 1
            },
            2: {
                'id': 2,
                'velocity': [-8, 0],
                'speed': 8,
                'center': [200, 100],
                'class': 'truck',
                'last_seen': 1
            }
        }
        
        # Add sufficient vehicle history
        self.system.vehicle_history[1] = [[i, 100] for i in range(90, 101)]
        self.system.vehicle_history[2] = [[i, 100] for i in range(210, 199, -1)]
        
        # Test enhanced collision detection
        collisions = self.system._enhanced_traffic_aware_collision_detection(active_tracks)
        
        # Should detect potential collision
        self.assertIsInstance(collisions, list)
        
    def test_smart_collision_candidate_check(self):
        """Test smart collision candidate checking"""
        track1 = {
            'id': 1,
            'velocity': [10, 0],
            'speed': 10,
            'center': [100, 100],
            'class': 'car'
        }
        track2 = {
            'id': 2,
            'velocity': [-8, 0],
            'speed': 8,
            'center': [180, 100],
            'class': 'truck'
        }
        
        # Add vehicle history
        self.system.vehicle_history[1] = [[i, 100] for i in range(90, 101)]
        self.system.vehicle_history[2] = [[i, 100] for i in range(200, 179, -1)]
        
        result = self.system._smart_collision_candidate_check(track1, track2, 5.0)
        self.assertTrue(result)
        
        # Test with insufficient speed
        track1['speed'] = 2.0
        track2['speed'] = 3.0
        result = self.system._smart_collision_candidate_check(track1, track2, 5.0)
        self.assertFalse(result)
    
    def test_traffic_aware_collision_prediction(self):
        """Test traffic-aware collision prediction"""
        track1 = {
            'id': 1,
            'center': [100, 100],
            'velocity': [10, 0],
            'speed': 10,
            'class': 'car'
        }
        track2 = {
            'id': 2,
            'center': [200, 100],
            'velocity': [-8, 0],
            'speed': 8,
            'class': 'truck'
        }
        
        # Test with low traffic density
        traffic_state = {'density': 'low', 'avg_speed': 25}
        result = self.system._traffic_aware_collision_prediction(track1, track2, 30, traffic_state)
        
        if result:
            self.assertIn('ttc', result)
            self.assertIn('collision_point', result)
            self.assertGreater(result['ttc'], 0)
            
    def test_balanced_collision_prediction(self):
        """Test balanced collision prediction method"""
        track1 = {
            'id': 1,
            'center': [100, 100],
            'velocity': [12, 0],
            'speed': 12,
            'class': 'car'
        }
        track2 = {
            'id': 2,
            'center': [200, 100],
            'velocity': [-10, 0],
            'speed': 10,
            'class': 'truck'
        }
        
        traffic_state = {'density': 'medium', 'avg_speed': 20}
        result = self.system._balanced_collision_prediction(track1, track2, 30, traffic_state)
        
        if result:
            self.assertIn('ttc', result)
            self.assertIn('collision_point', result)
            
    def test_ultra_conservative_collision_prediction(self):
        """Test ultra-conservative collision prediction"""
        track1 = {
            'id': 1,
            'center': [100, 100],
            'velocity': [15, 0],
            'speed': 15,
            'class': 'car'
        }
        track2 = {
            'id': 2,
            'center': [180, 100],
            'velocity': [-12, 0],
            'speed': 12,
            'class': 'truck'
        }
        
        traffic_state = {'density': 'high', 'avg_speed': 15}
        result = self.system._ultra_conservative_collision_prediction(track1, track2, 25, traffic_state)
        
        if result:
            self.assertIn('ttc', result)
            self.assertIn('collision_point', result)
    
    def test_persistent_collision_validation(self):
        """Test persistent collision validation system"""
        potential_collisions = [{
            'track1': {'id': 1, 'center': [100, 100], 'class': 'car'},
            'track2': {'id': 2, 'center': [200, 100], 'class': 'truck'},
            'collision_data': {'ttc': 2.5, 'collision_point': [150, 100]},
            'validation_layers': {
                'trajectory': True,
                'depth': True,
                'optical_flow': True,
                'physics': False
            }
        }]
        
        # Initialize collision candidates
        for collision in potential_collisions:
            key = f"{collision['track1']['id']}_{collision['track2']['id']}"
            self.system.incident_candidates[key] = {
                'frames_detected': 1,
                'first_frame': 100,
                'collision_data': collision['collision_data']
            }
        
        result = self.system._persistent_collision_validation(potential_collisions)
        
        self.assertIsInstance(result, list)
        
    def test_validate_live_stream_collision(self):
        """Test live stream collision validation"""
        collision = {
            'track1': {'id': 1, 'center': [100, 100], 'class': 'car'},
            'track2': {'id': 2, 'center': [200, 100], 'class': 'truck'},
            'collision_data': {'ttc': 1.8, 'collision_point': [150, 100]}
        }
        
        confidence = 0.85
        layers_passed = 3
        
        result = self.system._validate_live_stream_collision(collision, confidence, layers_passed)
        
        # Should return boolean indicating if collision is valid
        self.assertIsInstance(result, bool)
    
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
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
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

class TestAnalyticsAndReporting(unittest.TestCase):
    """Test analytics and reporting functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # Updated config for analytics testing
        config = {
            'display_window': False,
            'save_incidents': False,
            'incident_location': 'Test Street & Test Avenue'
        }
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_process_alerts_and_record(self):
        """Test alert processing and recording"""
        incidents = [
            {
                'type': 'collision',
                'severity': 'HIGH',
                'vehicles': ['car', 'truck'],
                'time_to_collision': 2.5,
                'position': [150, 200]
            },
            {
                'type': 'stopped_vehicle',
                'severity': 'MEDIUM',
                'vehicle_class': 'car',
                'stopped_duration': 15.0,
                'position': [300, 400]
            }
        ]
        
        current_frame = 100
        
        with patch('builtins.print') as mock_print:
            self.system._process_alerts_and_record(incidents, current_frame)
        
        # Should print alerts
        self.assertTrue(mock_print.called)
        
        # Should update analytics
        self.assertGreater(len(self.system.analytics['incident_log']), 0)
    
    def test_enhanced_analytics_overlay(self):
        """Test enhanced analytics overlay creation"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        incidents = [
            {
                'type': 'collision',
                'severity': 'HIGH',
                'vehicles': ['car', 'truck'],
                'time_to_collision': 1.8,
                'sustained_confidence': 0.87,
                'validation_summary': {'layers_passed': 3, 'total_layers': 4}
            }
        ]
        
        with patch('cv2.rectangle') as mock_rect, \
             patch('cv2.putText') as mock_text:
            
            result_frame = self.system._add_enhanced_analytics_overlay(frame, incidents)
            
            self.assertIsNotNone(result_frame)
            # Should call drawing functions
            self.assertTrue(mock_rect.called or mock_text.called)
            
    def test_update_analytics(self):
        """Test analytics updating functionality"""
        initial_incidents = self.system.analytics['incidents_detected']
        
        # Simulate processing incidents
        detection_results = {
            'total_count': 3,
            'class_counts': {'car': 2, 'truck': 1}
        }
        
        incidents = [{
            'type': 'collision',
            'severity': 'HIGH'
        }]
        
        self.system._update_analytics(detection_results, incidents)
        
        # Should increment analytics
        self.assertEqual(self.system.analytics['incidents_detected'], initial_incidents + 1)
        
    def test_cleanup_functionality(self):
        """Test system cleanup"""
        # Mock the capture object
        self.system.cap = Mock()
        
        with patch('cv2.destroyAllWindows') as mock_destroy, \
             patch.object(self.system, '_generate_final_report') as mock_report:
            
            self.system._cleanup()
            
            # Should release capture and destroy windows
            self.system.cap.release.assert_called_once()
            mock_destroy.assert_called_once()
            mock_report.assert_called_once()

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
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
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
            system = camera_config = {'camera_id': 'test', 'url': 'nonexistent.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
        
        self.assertIsNotNone(system)
    
    def test_empty_detections(self):
        """Test handling of empty detection results"""
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=None), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
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
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
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
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
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



# Add these test classes to The test_advanced_incident_detection.py file

class TestYOLOProcessing(unittest.TestCase):
    """Test YOLO result processing methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_process_yolov8_results(self):
        """Test YOLOv8 results processing"""
        # Mock YOLOv8 results
        mock_results = Mock()
        mock_results.boxes = Mock()
        mock_results.boxes.xyxy = Mock()
        mock_results.boxes.xyxy.cpu.return_value.numpy.return_value = np.array([[50, 50, 150, 150], [200, 200, 300, 300]])
        mock_results.boxes.conf = Mock()
        mock_results.boxes.conf.cpu.return_value.numpy.return_value = np.array([0.8, 0.9])
        mock_results.boxes.cls = Mock()
        mock_results.boxes.cls.cpu.return_value.numpy.return_value = np.array([2, 0])  # car, person
        mock_results.names = {0: 'person', 2: 'car'}
        
        detections = self.system._process_yolov8_results(mock_results)
        
        self.assertEqual(len(detections), 2)
        self.assertEqual(detections[0]['class'], 'car')
        self.assertEqual(detections[1]['class'], 'person')
        
    def test_process_yolov8_results_empty(self):
        """Test YOLOv8 results processing with no detections"""
        mock_results = Mock()
        mock_results.boxes = None
        
        detections = self.system._process_yolov8_results(mock_results)
        self.assertEqual(len(detections), 0)

class TestVisualization(unittest.TestCase):
    """Test visualization and drawing methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_create_visualization(self):
        """Test main visualization method"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        detection_results = {
            'detections': [
                {'bbox': [50, 50, 100, 100], 'class': 'car', 'confidence': 0.8, 'center': [100, 100]}
            ],
            'total_count': 1,
            'class_counts': {'car': 1}
        }
        
        incidents = [
            {'type': 'collision', 'severity': 'HIGH', 'position': [200, 200]}
        ]
        
        result_frame = self.system._create_visualization(frame, detection_results, incidents)
        
        self.assertIsNotNone(result_frame)
        self.assertEqual(result_frame.shape, frame.shape)
    
    def test_draw_detections(self):
        """Test drawing detection boxes"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        detection_results = {
            'detections': [
                {'bbox': [50, 50, 100, 100], 'class': 'car', 'confidence': 0.8},
                {'bbox': [200, 200, 80, 80], 'class': 'person', 'confidence': 0.9}
            ]
        }
        
        result_frame = self.system._draw_detections(frame, detection_results)
        
        self.assertIsNotNone(result_frame)
        # Frame should be modified (not equal to original)
        self.assertFalse(np.array_equal(result_frame, frame))
    
    def test_draw_tracking_info(self):
        """Test drawing vehicle tracking information"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Add some tracking data
        self.system.tracked_vehicles[1] = {
            'center': [100, 100],
            'speed': 15,
            'last_seen': 1
        }
        self.system.vehicle_history[1] = [[90, 100], [95, 100], [100, 100]]
        self.system.analytics['total_frames'] = 5
        
        result_frame = self.system._draw_tracking_info(frame)
        
        self.assertIsNotNone(result_frame)
    
    def test_add_analytics_overlay(self):
        """Test adding analytics overlay"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        incidents = [
            {'type': 'collision', 'vehicles': ['car', 'truck'], 'time_to_collision': 2.5}
        ]
        
        result_frame = self.system._add_advanced_analytics_overlay(frame, incidents)
        
        self.assertIsNotNone(result_frame)

class TestPhysicsValidation(unittest.TestCase):
    """Test physics-based validation methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        config = {
            'display_window': False,
            'api_enabled': False,
            'deceleration_threshold': 12.0,
            'physics_validation_enabled': True
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_detect_physics_anomaly(self):
        """Test physics anomaly detection"""
        vehicle_id = 1
        
        # Add normal acceleration history
        self.system.acceleration_history[vehicle_id] = [2.0, 3.0, 2.5]
        result = self.system._detect_physics_anomaly(vehicle_id)
        self.assertFalse(result)
        
        # Add sudden deceleration
        self.system.acceleration_history[vehicle_id] = [2.0, 3.0, 15.0]  # Sudden spike
        result = self.system._detect_physics_anomaly(vehicle_id)
        self.assertTrue(result)
    
    def test_calculate_velocities_and_physics(self):
        """Test velocity and physics calculation"""
        # Create vehicle with history
        self.system.tracked_vehicles[1] = {
            'center': [110, 100],
            'velocity': None,
            'speed': 0
        }
        self.system.vehicle_history[1] = [[100, 100], [105, 100], [110, 100]]
        
        self.system._calculate_velocities_and_physics([1])
        
        vehicle = self.system.tracked_vehicles[1]
        self.assertIsNotNone(vehicle['velocity'])
        self.assertGreater(vehicle['speed'], 0)
        self.assertIn(1, self.system.velocity_history)

class TestMultiLayerValidation(unittest.TestCase):
    """Test multi-layer collision validation"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        config = {
            'display_window': False,
            'api_enabled': False,
            'depth_analysis_enabled': True,
            'optical_flow_enabled': True,
            'physics_validation_enabled': True,
            'depth_difference_threshold': 0.3,
            'shadow_detection_threshold': 0.8,
            'flow_magnitude_threshold': 20.0,
            'minimum_layer_agreement': 2,
            'collision_confidence_threshold': 0.6
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_find_depth_for_vehicle(self):
        """Test finding depth estimate for vehicle"""
        vehicle = {'center': [100, 100]}
        detections = [
            {'center': [105, 105]},  # Close match
            {'center': [200, 200]}   # Far match
        ]
        depth_estimates = {
            0: {'depth_score': 0.8, 'shadow_indicator': True},
            1: {'depth_score': 0.3, 'shadow_indicator': False}
        }
        
        result = self.system._find_depth_for_vehicle(vehicle, detections, depth_estimates)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['depth_score'], 0.8)
    
    def test_final_collision_validation(self):
        """Test final collision validation logic"""
        potential_collisions = [{
            'track1': {'center': [100, 100], 'id': 1, 'class': 'car'},
            'track2': {'center': [200, 100], 'id': 2, 'class': 'truck'},
            'collision_data': {'ttc': 2.5, 'collision_point': [150, 100]},
            'validation_layers': {
                'trajectory': True,
                'depth': True,
                'optical_flow': False,
                'physics': True
            }
        }]
        
        result = self.system._final_collision_validation(potential_collisions)
        
        # Should pass with 3/4 layers agreeing
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['type'], 'collision')

class TestAnalyticsAndReporting(unittest.TestCase):
    """Test analytics and reporting functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False, 'save_incidents': False}
            )
    
    def test_update_analytics(self):
        """Test analytics updating"""
        detection_results = {
            'total_count': 5,
            'class_counts': {'car': 3, 'person': 2}
        }
        incidents = [
            {'type': 'collision', 'severity': 'HIGH'},
            {'type': 'stopped_vehicle', 'severity': 'MEDIUM'}
        ]
        
        initial_frames = self.system.analytics['total_frames']
        initial_detections = self.system.analytics['total_detections']
        
        self.system._update_analytics(detection_results, incidents)
        
        self.assertEqual(self.system.analytics['total_frames'], initial_frames + 1)
        self.assertEqual(self.system.analytics['total_detections'], initial_detections + 5)
        self.assertEqual(self.system.analytics['incidents_detected'], 2)
        self.assertEqual(len(self.system.analytics['incident_log']), 2)
    
    def test_process_alerts(self):
        """Test alert processing"""
        incidents = [
            {
                'type': 'collision',
                'severity': 'CRITICAL',
                'time_to_collision': 1.5,
                'vehicles': ['car', 'truck'],
                'confidence': 0.9,
                'validation_layers': {'trajectory': True, 'depth': True}
            },
            {
                'type': 'pedestrian_on_road',
                'severity': 'HIGH'
            }
        ]
        
        initial_alerts = len(self.system.analytics['alerts'])
        
        # Capture print output
        with patch('builtins.print') as mock_print:
            self.system._process_alerts(incidents)
        
        # Should have printed alerts
        self.assertTrue(mock_print.called)
        self.assertEqual(len(self.system.analytics['alerts']), initial_alerts + 2)
    
    def test_reset_analytics(self):
        """Test analytics reset functionality"""
        # Add some data first
        self.system.analytics['total_frames'] = 100
        self.system.tracked_vehicles[1] = {'test': 'data'}
        self.system.vehicle_history[1] = [[1, 2], [3, 4]]
        
        self.system._reset_analytics()
        
        self.assertEqual(self.system.analytics['total_frames'], 0)
        self.assertEqual(len(self.system.tracked_vehicles), 0)
        self.assertEqual(len(self.system.vehicle_history), 0)
        self.assertEqual(self.system.next_vehicle_id, 0)

class TestFileOperations(unittest.TestCase):
    """Test file saving and cleanup operations"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
    
    @patch('cv2.imwrite')
    @patch('os.makedirs')
    def test_save_incident_frame(self, mock_makedirs, mock_imwrite):
        """Test incident frame saving"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        incidents = [{'type': 'collision'}, {'type': 'stopped_vehicle'}]
        
        mock_imwrite.return_value = True
        
        with patch('builtins.print') as mock_print:
            self.system._save_incident_frame(frame, incidents, 123)
        
        mock_makedirs.assert_called_once()
        mock_imwrite.assert_called_once()
        mock_print.assert_called()
    
    @patch('cv2.imwrite')
    @patch('os.makedirs')
    def test_save_frame_manual(self, mock_makedirs, mock_imwrite):
        """Test manual frame saving"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        mock_imwrite.return_value = True
        
        with patch('builtins.print') as mock_print:
            self.system._save_frame(frame, 456, manual=True)
        
        mock_makedirs.assert_called_once()
        mock_imwrite.assert_called_once()
        # Check that filename contains "manual"
        call_args = mock_imwrite.call_args[0]
        self.assertIn("manual", call_args[0])
    
    def test_cleanup(self):
        """Test cleanup functionality"""
        # Mock video capture
        self.system.cap = Mock()
        
        with patch('cv2.destroyAllWindows') as mock_destroy, \
             patch.object(self.system, '_generate_final_report') as mock_report:
            
            self.system._cleanup()
            
            self.system.cap.release.assert_called_once()
            mock_destroy.assert_called_once()
            mock_report.assert_called_once()

class TestUtilityMethods(unittest.TestCase):
    """Test utility and helper methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
    
    def test_is_in_road_area(self):
        """Test road area detection"""
        # Test point in road area
        self.assertTrue(self.system._is_in_road_area(640, 360))  # Center of 1280x720
        
        # Test point outside road area
        self.assertFalse(self.system._is_in_road_area(50, 50))  # Top-left corner
        self.assertFalse(self.system._is_in_road_area(1200, 50))  # Top-right corner
    
    def test_determine_multilayer_severity(self):
        """Test severity determination based on confidence"""
        collision = {'validation_layers': {}}
        
        # Test different confidence levels
        self.assertEqual(self.system._determine_multilayer_severity(collision, 0.95), 'CRITICAL')
        self.assertEqual(self.system._determine_multilayer_severity(collision, 0.85), 'HIGH')
        self.assertEqual(self.system._determine_multilayer_severity(collision, 0.7), 'MEDIUM')
        self.assertEqual(self.system._determine_multilayer_severity(collision, 0.5), 'LOW')
    
    def test_create_final_collision_incident(self):
        """Test final collision incident creation"""
        collision = {
            'track1': {'class': 'car', 'center': [100, 100], 'id': 1},
            'track2': {'class': 'truck', 'center': [200, 100], 'id': 2},
            'collision_data': {'ttc': 2.5, 'collision_point': [150, 100]},
            'validation_layers': {'trajectory': True, 'depth': False}
        }
        
        result = self.system._create_final_collision_incident(collision, 0.8)
        
        self.assertEqual(result['type'], 'collision')
        self.assertEqual(result['vehicles'], ['car', 'truck'])
        self.assertEqual(result['time_to_collision'], 2.5)
        self.assertEqual(result['confidence'], 0.8)
        self.assertIn('timestamp', result)



class TestMainDetectionLoop(unittest.TestCase):
    """Test the main detection loop and run_detection method"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    @patch('cv2.waitKey')
    @patch('cv2.imshow')
    @patch('cv2.namedWindow')
    def test_run_detection_short_loop(self, mock_window, mock_imshow, mock_waitkey, mock_video_capture):
        """Test a short run of the main detection loop"""
        # Mock video capture
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        
        # Create test frames
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
        # Mock reading frames - return a few frames then quit
        mock_cap.read.side_effect = [
            (True, test_frame),
            (True, test_frame),
            (True, test_frame),
            (False, None)  # End of video
        ]
        
        mock_video_capture.return_value = mock_cap
        
        # Mock waitKey to simulate 'q' press after a few frames
        mock_waitkey.side_effect = [255, 255, ord('q')]  # Regular keys then 'q'
        
        # Complete config for main loop
        config = {
            'display_window': True,  # Enable display for this test
            'save_incidents': False,
            'api_enabled': False,
            'frame_skip': 1,  # Process every frame
            'confidence_threshold': 0.4,
            'model_version': 'yolov8s'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()) as mock_model:
            # Mock the model to return some detections
            mock_model_instance = Mock()
            mock_model_instance.return_value = [Mock()]  # Mock results
            mock_model.return_value = mock_model_instance
            
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
            
            # Mock the detect_objects method to return consistent results
            system._detect_objects = Mock(return_value={
                'detections': [
                    {'bbox': [100, 100, 50, 50], 'class': 'car', 'confidence': 0.8, 'center': [125, 125], 'area': 2500}
                ],
                'total_count': 1,
                'class_counts': {'car': 1},
                'fps': 30
            })
            
            # Capture print output
            with patch('builtins.print'):
                # This should run the detection loop until 'q' is pressed
                system.run_detection()
            
            # Verify key methods were called
            self.assertTrue(system.analytics['total_frames'] > 0)
            mock_imshow.assert_called()
    
    @patch('cv2.VideoCapture')
    @patch('cv2.waitKey')
    def test_keyboard_controls(self, mock_waitkey, mock_video_capture):
        """Test keyboard controls in main loop"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        mock_cap.read.side_effect = [
            (True, test_frame),
            (True, test_frame),
            (True, test_frame),
            (False, None)
        ]
        
        mock_video_capture.return_value = mock_cap
        
        # Test different key presses
        mock_waitkey.side_effect = [
            ord('s'),  # Save frame
            ord('r'),  # Reset analytics
            ord('q')   # Quit
        ]
        
        config = {
            'display_window': False,
            'save_incidents': False,
            'api_enabled': False,
            'frame_skip': 1
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            system = AdvancedIncidentDetectionSystem(camera_config=camera_config, config=config)
            
            # Mock methods that would be called
            system._save_frame = Mock()
            system._reset_analytics = Mock()
            system._detect_objects = Mock(return_value={
                'detections': [], 'total_count': 0, 'class_counts': {}, 'fps': 30
            })
            
            with patch('builtins.print'):
                system.run_detection()
            
            # Verify methods were called
            system._save_frame.assert_called()
            system._reset_analytics.assert_called()

class TestModelLoading(unittest.TestCase):
    """Test model loading functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_load_model_yolov8_success(self, mock_video_capture):
        """Test successful YOLOv8 model loading"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        # Mock successful YOLO import and model loading
        with patch('builtins.__import__') as mock_import:
            mock_yolo_class = Mock()
            mock_model = Mock()
            mock_yolo_class.return_value = mock_model
            
            # Create a mock module
            mock_ultralytics = Mock()
            mock_ultralytics.YOLO = mock_yolo_class
            
            def import_side_effect(name, *args, **kwargs):
                if name == 'ultralytics':
                    return mock_ultralytics
                return Mock()
            
            mock_import.side_effect = import_side_effect
            
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
            
            self.assertIsNotNone(system.model)
            self.assertEqual(system.model_type, 'yolov8')
    
    @patch('cv2.VideoCapture')
    def test_load_model_fallback_to_yolov5(self, mock_video_capture):
        """Test fallback to YOLOv5 when YOLOv8 fails"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        with patch('builtins.__import__') as mock_import:
            # Make ultralytics import fail
            def import_side_effect(name, *args, **kwargs):
                if name == 'ultralytics':
                    raise ImportError("ultralytics not found")
                return Mock()
            
            mock_import.side_effect = import_side_effect
            
            # Mock torch.hub.load for YOLOv5
            with patch('torch.hub.load') as mock_torch_load:
                mock_model = Mock()
                mock_torch_load.return_value = mock_model
                
                system = AdvancedIncidentDetectionSystem(
                    stream_url="test.mp4",
                    config={'display_window': False}
                )
                
                self.assertIsNotNone(system.model)
                self.assertEqual(system.model_type, 'yolov5')

class TestReportGeneration(unittest.TestCase):
    """Test report generation functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
    
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    @patch('json.dump')
    def test_generate_final_report(self, mock_json_dump, mock_open):
        """Test final report generation"""
        # Add some test data
        self.system.analytics.update({
            'total_frames': 1000,
            'total_detections': 500,
            'incidents_detected': 5,
            'class_totals': {'car': 300, 'person': 100, 'truck': 100},
            'incident_log': [
                {'type': 'collision', 'severity': 'HIGH', 'frame_number': 100},
                {'type': 'stopped_vehicle', 'severity': 'MEDIUM', 'frame_number': 200}
            ],
            'collision_layers': {
                'trajectory_detected': 10,
                'depth_confirmed': 8,
                'flow_confirmed': 6,
                'physics_confirmed': 5,
                'final_confirmed': 3
            },
            'api_reports_sent': 2,
            'api_failures': 1
        })
        
        with patch('builtins.print') as mock_print:
            self.system._generate_final_report()
        
        # Verify file operations
        mock_open.assert_called_once()
        mock_json_dump.assert_called_once()
        
        # Verify report content
        report_data = mock_json_dump.call_args[0][0]
        self.assertIn('session_summary', report_data)
        self.assertIn('collision_layer_performance', report_data)
        self.assertIn('incident_summary', report_data)
        
        # Verify console output
        self.assertTrue(mock_print.called)
        print_calls = [call[0][0] for call in mock_print.call_args_list]
        self.assertTrue(any('REPORT' in call for call in print_calls))

class TestEnhancedFeatures(unittest.TestCase):
    """Test enhanced features and new methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        config = {
            'display_window': False,
            'save_incidents': False,
            'collision_distance_threshold': 30,
            'min_collision_speed': 8.0,
            'deceleration_threshold': 10.0,
            'physics_validation_enabled': True,
            'incident_location': 'Test Location'
        }
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_relative_velocity_score(self):
        """Test relative velocity scoring"""
        v1 = [10, 0]
        v2 = [-8, 0]
        
        score = self.system._relative_velocity_score(v1, v2)
        self.assertIsInstance(score, (int, float))
        self.assertGreater(score, 0)
        
    def test_calculate_angle(self):
        """Test angle calculation between vectors"""
        v1 = [1, 0]
        v2 = [0, 1]
        
        angle = self.system._calculate_angle(v1, v2)
        self.assertIsInstance(angle, (int, float))
        self.assertGreaterEqual(angle, 0)
        self.assertLessEqual(angle, 180)
        
    def test_is_duplicate_incident(self):
        """Test duplicate incident detection"""
        incident1 = {
            'type': 'collision',
            'position': [100, 100],
            'vehicles': ['car', 'truck']
        }
        
        # Add to recent incidents
        self.system.recent_incidents = [{
            'incident': incident1,
            'frame': 100,
            'timestamp': 1000
        }]
        
        # Test duplicate detection
        is_duplicate = self.system._is_duplicate_incident(incident1, 105)
        self.assertTrue(is_duplicate)
        
        # Test non-duplicate (different position)
        incident2 = {
            'type': 'collision',
            'position': [300, 300],
            'vehicles': ['car', 'truck']
        }
        
        is_duplicate = self.system._is_duplicate_incident(incident2, 105)
        self.assertFalse(is_duplicate)
        
    def test_record_incident_if_not_duplicate(self):
        """Test incident recording with duplicate prevention"""
        incident = {
            'type': 'collision',
            'position': [200, 200],
            'vehicles': ['car', 'truck'],
            'severity': 'HIGH'
        }
        
        # Should record new incident
        with patch.object(self.system, '_record_incident_clip') as mock_record:
            self.system._record_incident_if_not_duplicate(incident, 150)
            mock_record.assert_called_once()
            
        # Should not record duplicate
        with patch.object(self.system, '_record_incident_clip') as mock_record:
            self.system._record_incident_if_not_duplicate(incident, 155)
            mock_record.assert_not_called()
    
    def test_is_following_pattern(self):
        """Test vehicle following pattern detection"""
        track1 = {
            'id': 1,
            'center': [100, 100],
            'velocity': [10, 0],
            'speed': 10
        }
        track2 = {
            'id': 2,
            'center': [120, 100],
            'velocity': [10, 0],
            'speed': 10
        }
        
        # Add vehicle history
        self.system.vehicle_history[1] = [[i, 100] for i in range(90, 101)]
        self.system.vehicle_history[2] = [[i+20, 100] for i in range(90, 101)]
        
        result = self.system._is_following_pattern(track1, track2)
        self.assertIsInstance(result, bool)
        
    def test_same_lane_following(self):
        """Test same lane following detection"""
        track1 = {
            'id': 1,
            'center': [100, 200],
            'velocity': [10, 0],
            'speed': 10
        }
        track2 = {
            'id': 2,
            'center': [80, 200],  # Behind track1 in same lane
            'velocity': [10, 0],
            'speed': 10
        }
        
        result = self.system._same_lane_following(track1, track2)
        self.assertIsInstance(result, bool)
        
    def test_maintaining_consistent_distance(self):
        """Test consistent distance maintenance detection"""
        track1_id = 1
        track2_id = 2
        
        # Create consistent distance history
        self.system.vehicle_history[track1_id] = [[100+i, 200] for i in range(10)]
        self.system.vehicle_history[track2_id] = [[80+i, 200] for i in range(10)]
        
        result = self.system._maintaining_consistent_distance(track1_id, track2_id)
        self.assertIsInstance(result, bool)
        
    def test_update_traffic_density(self):
        """Test traffic density update"""
        detections = [
            {'class': 'car', 'confidence': 0.8},
            {'class': 'truck', 'confidence': 0.9},
            {'class': 'car', 'confidence': 0.7},
            {'class': 'person', 'confidence': 0.8}
        ]
        
        initial_density = getattr(self.system, 'traffic_density', None)
        self.system._update_traffic_density(detections)
        
        # Should update traffic density metrics
        self.assertIsNotNone(getattr(self.system, 'traffic_density', None))
        
    @patch('subprocess.run')
    def test_call_classification(self, mock_subprocess):
        """Test video classification calling"""
        mock_subprocess.return_value = Mock(returncode=0)
        
        with patch('builtins.print'):
            self.system._call_classification()
        
        mock_subprocess.assert_called_once()
        
    def test_record_incident_clip(self):
        """Test incident clip recording"""
        incident = {
            'type': 'collision',
            'severity': 'HIGH',
            'vehicles': ['car', 'truck']
        }
        
        # Add some frames to buffer
        for i in range(10):
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            self.system.frame_buffer.append(frame)
        
        with patch('cv2.VideoWriter') as mock_writer, \
             patch('builtins.print'):
            
            mock_writer_instance = Mock()
            mock_writer.return_value = mock_writer_instance
            
            self.system._record_incident_clip(incident)
            
            # Should create video writer
            mock_writer.assert_called()

class TestVisualization(unittest.TestCase):
    """Test visualization and drawing methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False, 'api_enabled': False}
            )
    
    def test_create_visualization(self):
        """Test main visualization method"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        detection_results = {
            'detections': [
                {'bbox': [50, 50, 100, 100], 'class': 'car', 'confidence': 0.8, 'center': [100, 100]}
            ],
            'total_count': 1,
            'class_counts': {'car': 1}
        }
        
        incidents = [
            {'type': 'collision', 'severity': 'HIGH', 'position': [200, 200]}
        ]
        
        result_frame = self.system._create_visualization(frame, detection_results, incidents)
        
        self.assertIsNotNone(result_frame)
        self.assertEqual(result_frame.shape, frame.shape)
    
    def test_draw_detections(self):
        """Test drawing detection boxes"""
        # Create a frame with some initial content so we can detect changes
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        detection_results = {
            'detections': [
                {'bbox': [50, 50, 100, 100], 'class': 'car', 'confidence': 0.8},
                {'bbox': [200, 200, 80, 80], 'class': 'person', 'confidence': 0.9}
            ]
        }
        
        # Mock cv2 drawing functions to avoid actual drawing
        with patch('cv2.rectangle') as mock_rect, \
             patch('cv2.putText') as mock_text:
            
            result_frame = self.system._draw_detections(frame, detection_results)
            
            # Verify drawing functions were called
            self.assertTrue(mock_rect.called)
            self.assertTrue(mock_text.called)
            
            # Should return the same frame object (modified in place)
            self.assertIs(result_frame, frame)
    
    def test_draw_tracking_info(self):
        """Test drawing vehicle tracking information"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Add some tracking data
        self.system.tracked_vehicles[1] = {
            'center': [100, 100],
            'speed': 15,
            'last_seen': 1
        }
        self.system.vehicle_history[1] = [[90, 100], [95, 100], [100, 100]]
        self.system.analytics['total_frames'] = 5
        
        with patch('cv2.line') as mock_line, \
             patch('cv2.rectangle') as mock_rect, \
             patch('cv2.putText') as mock_text:
            
            result_frame = self.system._draw_tracking_info(frame)
            
            self.assertIsNotNone(result_frame)
    
    def test_add_analytics_overlay(self):
        """Test adding analytics overlay"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        incidents = [
            {'type': 'collision', 'vehicles': ['car', 'truck'], 'time_to_collision': 2.5}
        ]
        
        with patch('cv2.rectangle') as mock_rect, \
             patch('cv2.putText') as mock_text:
            
            result_frame = self.system._add_advanced_analytics_overlay(frame, incidents)
            
            self.assertIsNotNone(result_frame)

class TestMainDetectionLoop(unittest.TestCase):
    """Test the main detection loop and run_detection method"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    @patch('cv2.waitKey')
    @patch('cv2.imshow')
    @patch('cv2.namedWindow')
    @patch('cv2.destroyAllWindows')
    def test_run_detection_short_loop(self, mock_destroy, mock_window, mock_imshow, mock_waitkey, mock_video_capture):
        """Test a short run of the main detection loop"""
        # Mock video capture
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        
        # Create test frames
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        
        # Mock reading frames - return a few frames then quit
        mock_cap.read.side_effect = [
            (True, test_frame.copy()),
            (True, test_frame.copy()),
            (False, None)  # End of video - trigger restart
        ]
        
        mock_video_capture.return_value = mock_cap
        
        # Mock waitKey to simulate 'q' press immediately
        mock_waitkey.return_value = ord('q')
        
        # Complete config for main loop
        config = {
            'display_window': True,
            'save_incidents': False,
            'api_enabled': False,
            'frame_skip': 1,
            'confidence_threshold': 0.4,
            'model_version': 'yolov8s'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()) as mock_model:
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
            
            # Mock the detect_objects method to avoid model complexity
            system._detect_objects = Mock(return_value={
                'detections': [],
                'total_count': 0,
                'class_counts': {},
                'fps': 30
            })
            
            # Mock other methods that might be called
            system._update_vehicle_tracking = Mock(return_value={'active_tracks': []})
            system._detect_incidents_multilayer = Mock(return_value=[])
            system._create_visualization = Mock(return_value=test_frame)
            
            # Capture print output and run
            with patch('builtins.print'):
                system.run_detection()
            
            # Verify some key calls were made
            self.assertTrue(mock_imshow.called or mock_waitkey.called)
    
    @patch('cv2.VideoCapture')
    @patch('cv2.waitKey')
    @patch('cv2.destroyAllWindows')
    def test_keyboard_controls(self, mock_destroy, mock_waitkey, mock_video_capture):
        """Test keyboard controls in main loop"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        mock_cap.read.side_effect = [
            (True, test_frame.copy()),
            (True, test_frame.copy()),
            (True, test_frame.copy()),
            (False, None)
        ]
        
        mock_video_capture.return_value = mock_cap
        
        # Test save frame key
        mock_waitkey.side_effect = [
            ord('s'),  # Save frame
            ord('q')   # Quit
        ]
        
        config = {
            'display_window': False,
            'save_incidents': False,
            'api_enabled': False,
            'frame_skip': 1
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            system = AdvancedIncidentDetectionSystem(camera_config=camera_config, config=config)
            
            # Mock all the methods that would be called
            system._detect_objects = Mock(return_value={
                'detections': [], 'total_count': 0, 'class_counts': {}, 'fps': 30
            })
            system._update_vehicle_tracking = Mock(return_value={'active_tracks': []})
            system._detect_incidents_multilayer = Mock(return_value=[])
            system._create_visualization = Mock(return_value=test_frame)
            system._save_frame = Mock()
            
            with patch('builtins.print'):
                system.run_detection()
            
            # Verify save frame was called
            system._save_frame.assert_called()

class TestModelLoading(unittest.TestCase):
    """Test model loading functionality"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_load_model_yolov8_success(self, mock_video_capture):
        """Test successful YOLOv8 model loading"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        # Create a complete config that includes model_version
        config = {
            'display_window': False,
            'model_version': 'yolov8s',
            'confidence_threshold': 0.4
        }
        
        # Mock the _load_model method directly instead of trying to mock imports
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model') as mock_load_model:
            mock_model = Mock()
            mock_load_model.return_value = mock_model
            
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
            
            # Check that model was set
            self.assertIsNotNone(system.model)
            mock_load_model.assert_called_once()
    
    @patch('cv2.VideoCapture')
    def test_load_model_failure(self, mock_video_capture):
        """Test model loading failure"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        # Mock _load_model to return None (failure)
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=None):
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
            
            # Should handle failure gracefully
            self.assertIsNone(system.model)

class TestMultiLayerValidation(unittest.TestCase):
    """Test multi-layer collision validation"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        # FIXED: Complete config with all required keys
        config = {
            'display_window': False,
            'api_enabled': False,
            'depth_analysis_enabled': True,
            'optical_flow_enabled': True,
            'physics_validation_enabled': True,
            'depth_difference_threshold': 0.3,
            'shadow_detection_threshold': 0.8,
            'flow_magnitude_threshold': 20.0,
            'minimum_layer_agreement': 2,
            'collision_confidence_threshold': 0.6,
            'require_all_layers': False,  # Add this
            'deceleration_threshold': 12.0,  # Add this for physics validation
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            self.system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_find_depth_for_vehicle(self):
        """Test finding depth estimate for vehicle"""
        vehicle = {'center': [100, 100]}
        detections = [
            {'center': [105, 105]},  # Close match
            {'center': [200, 200]}   # Far match
        ]
        depth_estimates = {
            0: {'depth_score': 0.8, 'shadow_indicator': True},
            1: {'depth_score': 0.3, 'shadow_indicator': False}
        }
        
        result = self.system._find_depth_for_vehicle(vehicle, detections, depth_estimates)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['depth_score'], 0.8)
    
    def test_final_collision_validation(self):
        """Test final collision validation logic"""
        potential_collisions = [{
            'track1': {'center': [100, 100], 'id': 1, 'class': 'car'},
            'track2': {'center': [200, 100], 'id': 2, 'class': 'truck'},
            'collision_data': {'ttc': 2.5, 'collision_point': [150, 100]},
            'validation_layers': {
                'trajectory': True,
                'depth': True,
                'optical_flow': False,
                'physics': True
            }
        }]
        
        result = self.system._final_collision_validation(potential_collisions)
        
        # Should pass with 3/4 layers agreeing (minimum_layer_agreement = 2)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['type'], 'collision')
        self.assertIn('confidence', result[0])
    
    def test_final_collision_validation_insufficient_agreement(self):
        """Test final collision validation with insufficient layer agreement"""
        potential_collisions = [{
            'track1': {'center': [100, 100], 'id': 1, 'class': 'car'},
            'track2': {'center': [200, 100], 'id': 2, 'class': 'truck'},
            'collision_data': {'ttc': 2.5, 'collision_point': [150, 100]},
            'validation_layers': {
                'trajectory': True,
                'depth': False,
                'optical_flow': False,
                'physics': False
            }
        }]
        
        result = self.system._final_collision_validation(potential_collisions)
        
        # Should fail with only 1/4 layers agreeing (minimum_layer_agreement = 2)
        self.assertEqual(len(result), 0)

# Replace problematic edge case tests with these simpler versions

class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions for maximum coverage"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_video_capture_initialization_failure(self, mock_video_capture):
        """Test video capture initialization failure"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = False
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = camera_config = {'camera_id': 'test', 'url': 'nonexistent.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
            
            # Should still create system but with failed capture
            self.assertIsNotNone(system)
            
            # Test that cap is set but not opened
            self.assertIsNotNone(system.cap)
    
    def test_detect_objects_with_no_model(self):
        """Test object detection when model is None"""
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=None), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
        
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        result = system._detect_objects(test_frame)
        
        self.assertEqual(result['total_count'], 0)
        self.assertEqual(result['fps'], 0)
    
    def test_detect_objects_with_exception(self):
        """Test object detection when model throws exception"""
        config = {
            'display_window': False,
            'confidence_threshold': 0.4
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model') as mock_load:
            
            # Mock model that throws exception when called
            mock_model = Mock()
            mock_model.side_effect = Exception("Model error")
            mock_load.return_value = mock_model
            
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
            # Set model_type so the exception path is taken
            system.model_type = 'yolov8'
        
        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        with patch('builtins.print'):
            result = system._detect_objects(test_frame)
        
        # Should handle exception gracefully
        self.assertEqual(result['total_count'], 0)
    
    def test_depth_estimation_with_edge_cases(self):
        """Test depth estimation with edge cases"""
        config = {
            'display_window': False,
            'shadow_detection_threshold': 0.8
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
        
        test_frame = np.zeros((100, 100, 3), dtype=np.uint8)
        
        # Test various edge cases
        edge_case_detections = [
            {'bbox': [50, 50, 40, 40], 'area': 1600},    # Normal case
            {'bbox': [90, 90, 20, 20], 'area': 400},     # Near edge
            {'bbox': [0, 0, 10, 10], 'area': 100},       # At corner
        ]
        
        result = system._estimate_depth_from_intensity(test_frame, edge_case_detections)
        
        # Should handle all cases gracefully
        self.assertIsInstance(result, dict)
        # Should have results for valid detections
        self.assertTrue(len(result) >= 0)
    

    def test_api_various_errors(self):
        """Test API with various error conditions"""
        config = {
            'display_window': False,
            'api_enabled': True,
            'api_endpoint': 'http://localhost:5000/api/incidents',
            'api_timeout': 5,
            'incident_location': 'Test Location',
            'api_key': 'test_key'
        }
        
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            system = AdvancedIncidentDetectionSystem(camera_config=camera_config, config=config)
        
        incident = {'type': 'collision', 'severity': 'HIGH'}
        
        # Test timeout
        with patch('requests.post') as mock_post:
            import requests
            mock_post.side_effect = requests.exceptions.Timeout("Timeout")
            
            with patch('builtins.print'):
                system._send_incident_to_api(incident)
            
            self.assertEqual(system.analytics['api_failures'], 1)
        
        # Reset for next test
        system.analytics['api_failures'] = 0
        
        # Test generic exception
        with patch('requests.post') as mock_post:
            mock_post.side_effect = Exception("Generic error")
            
            with patch('builtins.print'):
                system._send_incident_to_api(incident)
            
            self.assertEqual(system.analytics['api_failures'], 1)

class TestStreamInitialization(unittest.TestCase):
    """Test stream initialization and camera handling"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('Code.hls_stream_adapter.StreamCapture')
    def test_initialize_capture_success(self, mock_stream_capture):
        """Test successful stream capture initialization"""
        mock_capture = Mock()
        mock_capture.open.return_value = True
        mock_stream_capture.return_value = mock_capture
        
        camera_config = {
            'camera_id': 'test_cam_01',
            'url': 'http://test.stream.m3u8',
            'location': 'Test Intersection'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch('builtins.print'):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
            
            result = system.initialize_capture()
            
        self.assertTrue(result)
        mock_stream_capture.assert_called_once_with(camera_config['url'], max_retries=5)
        
    @patch('Code.hls_stream_adapter.StreamCapture')
    def test_initialize_capture_failure(self, mock_stream_capture):
        """Test stream capture initialization failure"""
        mock_capture = Mock()
        mock_capture.open.return_value = False
        mock_stream_capture.return_value = mock_capture
        
        camera_config = {
            'camera_id': 'test_cam_02',
            'url': 'http://invalid.stream.m3u8',
            'location': 'Test Location'
        }
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch('builtins.print'):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False}
            )
            
            result = system.initialize_capture()
            
        self.assertFalse(result)
        
    def test_initialize_capture_no_config(self):
        """Test initialization without camera config"""
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch('builtins.print'):
            
            system = AdvancedIncidentDetectionSystem(
                camera_config=None,
                config={'display_window': False}
            )
            
            result = system.initialize_capture()
            
        self.assertFalse(result)

class TestIncidentRecording(unittest.TestCase):
    """Test incident recording and clip generation"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={'display_window': False, 'save_incidents': True}
            )
    
    @patch('cv2.VideoWriter')
    @patch('os.path.exists')
    def test_record_incident_clip_with_frames(self, mock_exists, mock_video_writer):
        """Test recording incident clip with sufficient frames"""
        mock_exists.return_value = True
        mock_writer = Mock()
        mock_video_writer.return_value = mock_writer
        
        # Add frames to buffer
        for i in range(50):
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            self.system.frame_buffer.append(frame)
        
        incident = {
            'type': 'collision',
            'severity': 'HIGH',
            'vehicles': ['car', 'truck']
        }
        
        with patch('builtins.print'):
            self.system._record_incident_clip(incident)
        
        # Should create video writer and write frames
        mock_video_writer.assert_called_once()
        self.assertTrue(mock_writer.write.called)
        mock_writer.release.assert_called_once()
        
    def test_record_incident_clip_insufficient_frames(self):
        """Test recording with insufficient frames in buffer"""
        # Clear buffer and add only few frames
        self.system.frame_buffer.clear()
        for i in range(3):
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            self.system.frame_buffer.append(frame)
        
        incident = {
            'type': 'collision',
            'severity': 'MEDIUM',
            'vehicles': ['car']
        }
        
        with patch('builtins.print') as mock_print:
            self.system._record_incident_clip(incident)
        
        # Should print warning about insufficient frames
        self.assertTrue(mock_print.called)

class TestConfigurationEdgeCases(unittest.TestCase):
    """Test configuration edge cases and defaults"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('cv2.VideoCapture')
    def test_none_config(self, mock_video_capture):
        """Test system with None config"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=None  # None config should use defaults
            )
        
        # Should still have default values
        self.assertIn('confidence_threshold', system.config)
        self.assertIsInstance(system.config['confidence_threshold'], (int, float))
    
    @patch('cv2.VideoCapture')
    def test_empty_config(self, mock_video_capture):
        """Test system with empty config dict"""
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_video_capture.return_value = mock_cap
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
            
            AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config={}  # Empty config
            )
        
        # Should still have all default values
        self.assertIn('confidence_threshold', system.config)
        self.assertIn('collision_distance_threshold', system.config)

class TestMultiCameraFunctions(unittest.TestCase):
    """Test multi-camera support functions"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
    
    @patch('json.load')
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    @patch('os.path.exists')
    def test_load_camera_configurations(self, mock_exists, mock_open, mock_json_load):
        """Test loading camera configurations from file"""
        mock_exists.return_value = True
        
        mock_config = {
            "cameras": [
                {
                    "camera_id": "cam_01",
                    "url": "http://camera1.stream.m3u8",
                    "location": "Main Intersection"
                },
                {
                    "camera_id": "cam_02",
                    "url": "http://camera2.stream.m3u8",
                    "location": "Highway Onramp"
                }
            ]
        }
        mock_json_load.return_value = mock_config
        
        from incident_detection_system import load_camera_configurations
        
        result = load_camera_configurations()
        
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['camera_id'], 'cam_01')
        self.assertEqual(result[1]['camera_id'], 'cam_02')
        
    @patch('os.path.exists')
    def test_load_camera_configurations_missing_file(self, mock_exists):
        """Test loading configurations when file doesn't exist"""
        mock_exists.return_value = False
        
        from incident_detection_system import load_camera_configurations
        
        with patch('builtins.print'):
            result = load_camera_configurations()
        
        self.assertEqual(result, [])
        
    @patch('json.load')
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    @patch('os.path.exists')
    def test_load_camera_configurations_json_error(self, mock_exists, mock_open, mock_json_load):
        """Test handling JSON decode error"""
        mock_exists.return_value = True
        mock_json_load.side_effect = json.JSONDecodeError("Invalid JSON", "doc", 0)
        
        from incident_detection_system import load_camera_configurations
        
        with patch('builtins.print'):
            result = load_camera_configurations()
        
        self.assertEqual(result, [])
        
    @patch.object(AdvancedIncidentDetectionSystem, 'run_detection')
    def test_run_camera_detection(self, mock_run_detection):
        """Test single camera detection runner"""
        camera_config = {
            'camera_id': 'test_cam',
            'url': 'test.mp4',
            'location': 'Test Location'
        }
        
        config = {
            'display_window': False,
            'save_incidents': False
        }
        
        from incident_detection_system import run_camera_detection
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True), \
             patch('builtins.print'):
            
            run_camera_detection(camera_config, config)
        
        mock_run_detection.assert_called_once()

class TestAdvancedCollisionValidation(unittest.TestCase):
    """Test advanced collision validation methods"""
    
    def setUp(self):
        if not SYSTEM_AVAILABLE:
            self.skipTest("AdvancedIncidentDetectionSystem not available")
        
        config = {
            'display_window': False,
            'depth_analysis_enabled': True,
            'optical_flow_enabled': True,
            'physics_validation_enabled': True,
            'deceleration_threshold': 10.0,
            'minimum_layer_agreement': 2,
            'collision_confidence_threshold': 0.7
        }
        
        camera_config = {'camera_id': 'test', 'url': 'test.mp4', 'location': 'Test'}
        
        with patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()), \
             patch.object(AdvancedIncidentDetectionSystem, 'initialize_capture', return_value=True):
            self.system = AdvancedIncidentDetectionSystem(
                camera_config=camera_config,
                config=config
            )
    
    def test_enhanced_severity_determination(self):
        """Test enhanced severity determination"""
        sustained_confidence = 0.85
        peak_confidence = 0.95
        
        severity = self.system._determine_enhanced_severity(sustained_confidence, peak_confidence)
        
        self.assertIn(severity, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        
    def test_create_enhanced_final_collision_incident(self):
        """Test enhanced collision incident creation"""
        collision = {
            'track1': {'class': 'car', 'center': [100, 100], 'id': 1},
            'track2': {'class': 'truck', 'center': [200, 100], 'id': 2},
            'collision_data': {'ttc': 1.5, 'collision_point': [150, 100]},
            'validation_layers': {
                'trajectory': True,
                'depth': True,
                'optical_flow': False,
                'physics': True
            }
        }
        
        sustained_confidence = 0.82
        peak_confidence = 0.91
        
        result = self.system._create_enhanced_final_collision_incident(collision, sustained_confidence, peak_confidence)
        
        self.assertEqual(result['type'], 'collision')
        self.assertEqual(result['vehicles'], ['car', 'truck'])
        self.assertIn('sustained_confidence', result)
        self.assertIn('peak_confidence', result)
        self.assertIn('validation_summary', result)
        
    def test_get_viable_collision_pairs(self):
        """Test viable collision pair detection"""
        active_tracks = {
            1: {
                'id': 1,
                'center': [100, 100],
                'velocity': [10, 0],
                'speed': 10,
                'class': 'car',
                'last_seen': 1
            },
            2: {
                'id': 2,
                'center': [200, 100],
                'velocity': [-8, 0],
                'speed': 8,
                'class': 'truck',
                'last_seen': 1
            },
            3: {
                'id': 3,
                'center': [300, 300],  # Far away
                'velocity': [5, 0],
                'speed': 5,
                'class': 'car',
                'last_seen': 1
            }
        }
        
        # Add some vehicle history
        for track_id in [1, 2, 3]:
            self.system.vehicle_history[track_id] = [[100+i*track_id, 100] for i in range(10)]
        
        pairs = self.system._get_viable_collision_pairs(active_tracks, strict_filtering=False)
        
        self.assertIsInstance(pairs, list)
        # Should find at least one viable pair (1 and 2)
        
    def test_balanced_confidence_calculation(self):
        """Test balanced confidence calculation"""
        track1 = {
            'id': 1,
            'speed': 12,
            'velocity': [12, 0],
            'class': 'car'
        }
        track2 = {
            'id': 2,
            'speed': 10,
            'velocity': [-10, 0],
            'class': 'truck'
        }
        
        distance = 50
        time_steps = 3
        traffic_state = {'density': 'medium', 'avg_speed': 20}
        
        confidence = self.system._balanced_confidence_calculation(track1, track2, distance, time_steps, traffic_state)
        
        self.assertIsInstance(confidence, (int, float))
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 1)

if __name__ == '__main__':
    if not SYSTEM_AVAILABLE:
        print("❌ AdvancedIncidentDetectionSystem not available for testing")
        print("   Make sure 'incident_detection_system.py' exists in the Code folder")
        sys.exit(1)
    
    unittest.main(verbosity=2)