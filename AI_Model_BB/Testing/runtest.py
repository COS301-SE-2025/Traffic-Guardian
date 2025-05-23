# import unittest
# import cv2
# import numpy as np
# import os
# import tempfile
# import shutil
# from unittest.mock import patch, MagicMock, mock_open
# import sys

# # Import your modules (adjust paths as needed)
# try:
#     from video_processor import VideoProcessor
#     from car_detection import detect_cars, CarDetector
# except ImportError:
#     # Handle case where modules might not be in the same directory
#     sys.path.append('..\Code\')
#     from video_processor import VideoProcessor
#     from car_detection import detect_cars, CarDetector


# class TestCarDetection(unittest.TestCase):
#     """Test cases for car detection functionality"""
    
#     def setUp(self):
#         """Set up test fixtures before each test method."""
#         # Create a sample test frame (640x480, 3 channels)
#         self.test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
#         # Add some rectangles to simulate cars
#         cv2.rectangle(self.test_frame, (100, 200), (200, 300), (255, 255, 255), -1)
#         cv2.rectangle(self.test_frame, (300, 150), (450, 280), (128, 128, 128), -1)
        
#         # Create temporary directory for test outputs
#         self.test_dir = tempfile.mkdtemp()
        
#     def tearDown(self):
#         """Clean up after each test."""
#         # Remove temporary directory
#         if os.path.exists(self.test_dir):
#             shutil.rmtree(self.test_dir)
    
#     def test_detect_cars_returns_tuple(self):
#         """Test that detect_cars returns a tuple with frame and results"""
#         result = detect_cars(self.test_frame)
        
#         self.assertIsInstance(result, tuple)
#         self.assertEqual(len(result), 2)
        
#         frame, results = result
#         self.assertIsInstance(frame, np.ndarray)
#         self.assertIsInstance(results, dict)
    
#     def test_detect_cars_results_structure(self):
#         """Test that detect_cars returns properly structured results"""
#         frame, results = detect_cars(self.test_frame)
        
#         # Check required keys exist
#         self.assertIn('car_count', results)
#         self.assertIn('car_locations', results)
        
#         # Check data types
#         self.assertIsInstance(results['car_count'], int)
#         self.assertIsInstance(results['car_locations'], list)
        
#         # Check car_count is non-negative
#         self.assertGreaterEqual(results['car_count'], 0)
    
#     def test_detect_cars_frame_unchanged_dimensions(self):
#         """Test that output frame has same dimensions as input"""
#         original_shape = self.test_frame.shape
#         frame, _ = detect_cars(self.test_frame)
        
#         self.assertEqual(frame.shape, original_shape)
    
#     @patch('cv2.CascadeClassifier')
#     def test_detect_cars_cascade_loading_failure(self, mock_cascade):
#         """Test behavior when cascade classifier fails to load"""
#         # Mock empty cascade
#         mock_cascade_instance = MagicMock()
#         mock_cascade_instance.empty.return_value = True
#         mock_cascade.return_value = mock_cascade_instance
        
#         frame, results = detect_cars(self.test_frame)
        
#         self.assertEqual(results['car_count'], 0)
#         self.assertIn('error', results)
#         self.assertEqual(results['error'], 'Cascade not loaded')
    
#     @patch('cv2.CascadeClassifier')
#     def test_detect_cars_with_detections(self, mock_cascade):
#         """Test detect_cars with simulated detections"""
#         # Mock successful cascade loading and detection
#         mock_cascade_instance = MagicMock()
#         mock_cascade_instance.empty.return_value = False
#         mock_cascade_instance.detectMultiScale.return_value = np.array([
#             [50, 50, 100, 80],   # x, y, w, h - good aspect ratio
#             [200, 100, 120, 60], # x, y, w, h - good aspect ratio
#             [300, 200, 30, 100]  # x, y, w, h - bad aspect ratio (too tall)
#         ])
#         mock_cascade.return_value = mock_cascade_instance
        
#         frame, results = detect_cars(self.test_frame)
        
#         # Should detect 2 cars (third filtered out by aspect ratio)
#         self.assertEqual(results['car_count'], 2)
#         self.assertEqual(len(results['car_locations']), 2)
    
#     def test_detect_cars_aspect_ratio_filtering(self):
#         """Test that aspect ratio filtering works correctly"""
#         # This test would need to be adjusted based on your actual implementation
#         # For now, we'll test the concept
        
#         # Test data: (x, y, w, h) rectangles
#         test_detections = [
#             (0, 0, 100, 50),   # aspect ratio 2.0 - should pass
#             (0, 0, 50, 100),   # aspect ratio 0.5 - should fail (too tall)
#             (0, 0, 200, 50),   # aspect ratio 4.0 - should fail (too wide)
#             (0, 0, 80, 60),    # aspect ratio 1.33 - should pass
#         ]
        
#         valid_cars = []
#         for x, y, w, h in test_detections:
#             aspect_ratio = w / h
#             if 0.8 <= aspect_ratio <= 3.0:  # Same as your code
#                 valid_cars.append((x, y, w, h))
        
#         # Should have 2 valid cars
#         self.assertEqual(len(valid_cars), 2)


# class TestCarDetectorClass(unittest.TestCase):
#     """Test cases for CarDetector class using background subtraction"""
    
#     def setUp(self):
#         """Set up test fixtures"""
#         self.detector = CarDetector()
#         self.test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
#         # Add some moving objects
#         cv2.rectangle(self.test_frame, (100, 200), (200, 300), (255, 255, 255), -1)
    
#     def test_car_detector_initialization(self):
#         """Test CarDetector initializes properly"""
#         self.assertIsNotNone(self.detector.bg_subtractor)
    
#     def test_detect_cars_method_exists(self):
#         """Test that detect_cars method exists and is callable"""
#         self.assertTrue(hasattr(self.detector, 'detect_cars'))
#         self.assertTrue(callable(getattr(self.detector, 'detect_cars')))
    
#     def test_detect_cars_returns_correct_format(self):
#         """Test CarDetector.detect_cars returns correct format"""
#         result = self.detector.detect_cars(self.test_frame)
        
#         self.assertIsInstance(result, tuple)
#         self.assertEqual(len(result), 2)
        
#         frame, results = result
#         self.assertIsInstance(frame, np.ndarray)
#         self.assertIsInstance(results, dict)
#         self.assertIn('car_count', results)
#         self.assertIn('car_locations', results)
    
#     def test_background_subtraction_processing(self):
#         """Test that background subtraction processes multiple frames"""
#         # Process several frames to build background model
#         frames = []
#         for i in range(5):
#             # Create slightly different frames
#             frame = np.zeros((480, 640, 3), dtype=np.uint8)
#             cv2.rectangle(frame, (100 + i*10, 200), (200 + i*10, 300), (255, 255, 255), -1)
#             frames.append(frame)
        
#         results_list = []
#         for frame in frames:
#             _, results = self.detector.detect_cars(frame)
#             results_list.append(results['car_count'])
        
#         # At least some frames should show detection after background model is built
#         self.assertTrue(any(count > 0 for count in results_list[2:]))  # Skip first 2 frames


# class TestVideoProcessor(unittest.TestCase):
#     """Test cases for VideoProcessor class"""
    
#     def setUp(self):
#         """Set up test fixtures"""
#         self.test_video_path = "test_video.mp4"
#         self.temp_dir = tempfile.mkdtemp()
        
#     def tearDown(self):
#         """Clean up after tests"""
#         if os.path.exists(self.temp_dir):
#             shutil.rmtree(self.temp_dir)
    
#     def test_video_processor_initialization(self):
#         """Test VideoProcessor initializes with correct attributes"""
#         processor = VideoProcessor(self.test_video_path)
        
#         self.assertEqual(processor.video_path, self.test_video_path)
#         self.assertEqual(processor.output_dir, "output_frames")
#         self.assertIsNone(processor.cap)
    
#     @patch('os.path.exists')
#     def test_process_video_file_not_found(self, mock_exists):
#         """Test process_video handles missing video file"""
#         mock_exists.return_value = False
        
#         processor = VideoProcessor("nonexistent.mp4")
#         result = processor.process_video()
        
#         self.assertEqual(result, 0)
    
#     @patch('cv2.VideoCapture')
#     @patch('os.path.exists')
#     def test_process_video_file_cannot_open(self, mock_exists, mock_capture):
#         """Test process_video handles video file that can't be opened"""
#         mock_exists.return_value = True
        
#         # Mock VideoCapture that fails to open
#         mock_cap = MagicMock()
#         mock_cap.isOpened.return_value = False
#         mock_capture.return_value = mock_cap
        
#         processor = VideoProcessor("test.mp4")
#         result = processor.process_video()
        
#         self.assertEqual(result, 0)
    
#     @patch('cv2.VideoCapture')
#     @patch('os.path.exists')
#     def test_process_video_successful_processing(self, mock_exists, mock_capture):
#         """Test successful video processing"""
#         mock_exists.return_value = True
        
#         # Mock VideoCapture with successful operation
#         mock_cap = MagicMock()
#         mock_cap.isOpened.return_value = True
#         mock_cap.get.side_effect = lambda prop: {
#             cv2.CAP_PROP_FPS: 30.0,
#             cv2.CAP_PROP_FRAME_COUNT: 100,
#             cv2.CAP_PROP_FRAME_WIDTH: 640,
#             cv2.CAP_PROP_FRAME_HEIGHT: 480
#         }.get(prop, 0)
        
#         # Mock frame reading - return 3 frames then stop
#         mock_cap.read.side_effect = [
#             (True, np.zeros((480, 640, 3), dtype=np.uint8)),
#             (True, np.zeros((480, 640, 3), dtype=np.uint8)),
#             (True, np.zeros((480, 640, 3), dtype=np.uint8)),
#             (False, None)  # End of video
#         ]
        
#         mock_capture.return_value = mock_cap
        
#         processor = VideoProcessor("test.mp4")
        
#         # Mock cv2 functions to avoid display issues in tests
#         with patch('cv2.imshow'), patch('cv2.waitKey', return_value=ord('q')), \
#              patch('cv2.destroyAllWindows'):
#             result = processor.process_video(display=False)
        
#         self.assertEqual(result, 3)  # Should process 3 frames
    
#     def test_cleanup_method(self):
#         """Test cleanup method releases resources"""
#         processor = VideoProcessor("test.mp4")
        
#         # Mock a VideoCapture object
#         mock_cap = MagicMock()
#         processor.cap = mock_cap
        
#         with patch('cv2.destroyAllWindows') as mock_destroy:
#             processor.cleanup()
            
#             mock_cap.release.assert_called_once()
#             mock_destroy.assert_called_once()


# class TestProcessFrameFunction(unittest.TestCase):
#     """Test cases for process_frame_func parameter"""
    
#     def setUp(self):
#         """Set up test fixtures"""
#         self.test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
#     def test_custom_process_function(self):
#         """Test custom processing function integration"""
#         def custom_detector(frame):
#             """Mock custom detection function"""
#             processed_frame = frame.copy()
#             cv2.putText(processed_frame, "TEST", (10, 30), 
#                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
#             results = {
#                 "car_count": 5,
#                 "car_locations": [(10, 10, 50, 50)],
#                 "custom_data": "test"
#             }
#             return processed_frame, results
        
#         # Test the custom function
#         frame, results = custom_detector(self.test_frame)
        
#         self.assertEqual(results["car_count"], 5)
#         self.assertEqual(len(results["car_locations"]), 1)
#         self.assertIn("custom_data", results)
#         self.assertEqual(results["custom_data"], "test")


# class TestIntegration(unittest.TestCase):
#     """Integration tests combining multiple components"""
    
#     def setUp(self):
#         """Set up integration test fixtures"""
#         self.test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
#         # Add some car-like shapes
#         cv2.rectangle(self.test_frame, (50, 100), (150, 180), (255, 255, 255), -1)
#         cv2.rectangle(self.test_frame, (300, 200), (450, 320), (128, 128, 128), -1)
    
#     @patch('cv2.VideoCapture')
#     @patch('os.path.exists')
#     def test_full_pipeline_integration(self, mock_exists, mock_capture):
#         """Test full pipeline from video processing to car detection"""
#         mock_exists.return_value = True
        
#         # Setup mock video capture
#         mock_cap = MagicMock()
#         mock_cap.isOpened.return_value = True
#         mock_cap.get.side_effect = lambda prop: {
#             cv2.CAP_PROP_FPS: 30.0,
#             cv2.CAP_PROP_FRAME_COUNT: 2,
#             cv2.CAP_PROP_FRAME_WIDTH: 640,
#             cv2.CAP_PROP_FRAME_HEIGHT: 480
#         }.get(prop, 0)
        
#         # Return test frames
#         mock_cap.read.side_effect = [
#             (True, self.test_frame),
#             (True, self.test_frame),
#             (False, None)
#         ]
#         mock_capture.return_value = mock_cap
        
#         # Test with both detection methods
#         processor = VideoProcessor("test.mp4")
        
#         with patch('cv2.imshow'), patch('cv2.waitKey', return_value=ord('q')), \
#              patch('cv2.destroyAllWindows'):
            
#             # Test with Haar cascade detection
#             frames_processed = processor.process_video(
#                 display=False,
#                 process_frame_func=detect_cars
#             )
            
#             self.assertEqual(frames_processed, 2)
        
#         # Test with background subtraction
#         detector = CarDetector()
        
#         # Reset mock for second test
#         mock_cap.read.side_effect = [
#             (True, self.test_frame),
#             (True, self.test_frame),
#             (False, None)
#         ]
        
#         processor2 = VideoProcessor("test.mp4")
        
#         with patch('cv2.imshow'), patch('cv2.waitKey', return_value=ord('q')), \
#              patch('cv2.destroyAllWindows'):
            
#             frames_processed = processor2.process_video(
#                 display=False,
#                 process_frame_func=detector.detect_cars
#             )
            
#             self.assertEqual(frames_processed, 2)


# class TestErrorHandling(unittest.TestCase):
#     """Test error handling and edge cases"""
    
#     def test_empty_frame_handling(self):
#         """Test handling of empty/invalid frames"""
#         empty_frame = np.array([])
        
#         # Should not crash with empty frame
#         try:
#             frame, results = detect_cars(empty_frame)
#             # If it doesn't crash, check that it returns something reasonable
#             self.assertIsNotNone(results)
#         except Exception as e:
#             # If it does crash, that's also acceptable for invalid input
#             self.assertIsInstance(e, (ValueError, cv2.error))
    
#     def test_invalid_frame_dimensions(self):
#         """Test handling of frames with invalid dimensions"""
#         # 2D grayscale frame instead of 3D color
#         invalid_frame = np.zeros((480, 640), dtype=np.uint8)
        
#         try:
#             frame, results = detect_cars(invalid_frame)
#             # Should handle gracefully or raise appropriate exception
#         except cv2.error:
#             # OpenCV error is acceptable for invalid input
#             pass
    
#     def test_very_small_frame(self):
#         """Test handling of very small frames"""
#         tiny_frame = np.zeros((10, 10, 3), dtype=np.uint8)
        
#         frame, results = detect_cars(tiny_frame)
        
#         # Should not crash and should return 0 cars for tiny frame
#         self.assertEqual(results['car_count'], 0)
#         self.assertEqual(frame.shape, tiny_frame.shape)


# if __name__ == '__main__':
#     # Create test suite
#     test_suite = unittest.TestSuite()
    
#     # Add test classes
#     test_classes = [
#         TestCarDetection,
#         TestCarDetectorClass, 
#         TestVideoProcessor,
#         TestProcessFrameFunction,
#         TestIntegration,
#         TestErrorHandling
#     ]
    
#     for test_class in test_classes:
#         tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
#         test_suite.addTests(tests)
    
#     # Run tests with detailed output
#     runner = unittest.TextTestRunner(verbosity=2)
#     result = runner.run(test_suite)
    
#     # Print summary
#     print(f"\n{'='*50}")
#     print(f"TESTS RUN: {result.testsRun}")
#     print(f"FAILURES: {len(result.failures)}")
#     print(f"ERRORS: {len(result.errors)}")
    
#     if result.failures:
#         print(f"\nFAILURES:")
#         for test, traceback in result.failures:
#             print(f"- {test}: {traceback}")
    
#     if result.errors:
#         print(f"\nERRORS:")
#         for test, traceback in result.errors:
#             print(f"- {test}: {traceback}")
    
#     # Exit with appropriate code
#     sys.exit(0 if result.wasSuccessful() else 1)