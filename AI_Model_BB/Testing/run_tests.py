import unittest
import sys
import os

def setup_environment():
    """Set up the test environment"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    code_folder = os.path.join(project_root, 'Code')
    
    if code_folder not in sys.path:
        sys.path.insert(0, code_folder)
    
    print(f"🔧 Environment Setup:")
    print(f"   Current dir: {current_dir}")
    print(f"   Project root: {project_root}")
    print(f"   Code folder: {code_folder}")
    print(f"   Videos folder: {os.path.join(code_folder, 'Videos')}")
    
    # Verify Code folder exists
    if not os.path.exists(code_folder):
        print(f"❌ Code folder not found at: {code_folder}")
        return False
    
    # List files in Code folder
    code_files = os.listdir(code_folder)
    print(f"   Files in Code: {code_files}")
    
    # Check for Videos folder
    videos_folder = os.path.join(code_folder, 'Videos')
    if os.path.exists(videos_folder):
        video_files = os.listdir(videos_folder)
        print(f"   Videos available: {video_files}")
    else:
        print(f"   ⚠️ Videos folder not found")
    
    # Check for incident detection system
    incident_system_file = os.path.join(code_folder, 'incident_detection_system.py')
    if os.path.exists(incident_system_file):
        print(f"   ✅ incident_detection_system.py found")
    else:
        print(f"   ⚠️ incident_detection_system.py not found")
        print(f"      Make sure to save your AdvancedIncidentDetectionSystem code as 'incident_detection_system.py'")
    
    return True

def run_all_tests():
    """Run all unit tests and return results"""
    
    print("🚗 Advanced Incident Detection Test Runner")
    print("=" * 70)
    
    # Setup environment
    if not setup_environment():
        print("❌ Environment setup failed!")
        return False
    
    print("=" * 70)
    
    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(
        verbosity=2,
        buffer=True,  # Capture stdout/stderr during tests
        failfast=False  # Continue running tests after first failure
    )
    
    print("🧪 Running Advanced Incident Detection Unit Tests...")
    print("-" * 70)
    
    result = runner.run(suite)
    
    # Print detailed summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print(f"\n❌ FAILURES ({len(result.failures)}):")
        for i, (test, traceback) in enumerate(result.failures, 1):
            print(f"{i}. {test}")
            # Print just the assertion error, not the full traceback
            error_msg = traceback.split('AssertionError:')[-1].strip() if 'AssertionError:' in traceback else traceback.split('\n')[-2]
            print(f"   {error_msg}")
    
    if result.errors:
        print(f"\n🚨 ERRORS ({len(result.errors)}):")
        for i, (test, traceback) in enumerate(result.errors, 1):
            print(f"{i}. {test}")
            # Print the last line of the error
            error_msg = traceback.splitlines()[-1] if traceback.splitlines() else "Unknown error"
            print(f"   {error_msg}")
    
    # Overall result
    if result.wasSuccessful():
        print(f"\n✅ ALL TESTS PASSED!")
        print(f"🎯 The Advanced Incident Detection System is working correctly!")
        return True
    else:
        print(f"\n❌ SOME TESTS FAILED")
        print(f"💡 Check the error messages above to fix the issues")
        return False

def run_specific_test(test_name):
    """Run a specific test class or method"""
    
    if not setup_environment():
        return False
    
    suite = unittest.TestSuite()
    
    try:
        # Import the test module
        import test_advanced_incident_detection
        
        if '.' in test_name:
            # Specific test method (e.g., TestCollisionDetection.test_method)
            suite.addTest(unittest.TestLoader().loadTestsFromName(f'test_advanced_incident_detection.{test_name}'))
        else:
            # Test class (e.g., TestCollisionDetection)
            test_class = getattr(test_advanced_incident_detection, test_name)
            suite.addTest(unittest.TestLoader().loadTestsFromTestCase(test_class))
        
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        return result.wasSuccessful()
        
    except Exception as e:
        print(f"❌ Error running test '{test_name}': {e}")
        return False

def list_available_tests():
    """List all available test classes and methods"""
    
    if not setup_environment():
        return
    
    try:
        import test_advanced_incident_detection
        
        print("📋 Available Test Classes:")
        print("-" * 50)
        
        test_classes = [
            'TestAdvancedIncidentDetectionSystem',
            'TestCollisionDetection', 
            'TestVehicleTracking',
            'TestAPIIntegration',
            'TestIncidentDetection',
            'TestErrorHandling',
            'TestConfiguration',
            'TestIntegration'
        ]
        
        for class_name in test_classes:
            if hasattr(test_advanced_incident_detection, class_name):
                test_class = getattr(test_advanced_incident_detection, class_name)
                methods = [method for method in dir(test_class) if method.startswith('test_')]
                print(f"\n🔍 {class_name}:")
                for method in methods:
                    print(f"  - {method}")
        
        print(f"\n💡 Usage Examples:")
        print(f"  python run_tests.py                                    # Run all tests")
        print(f"  python run_tests.py TestCollisionDetection             # Run collision detection tests")
        print(f"  python run_tests.py TestAPIIntegration                 # Run API integration tests")
        print(f"  python run_tests.py TestCollisionDetection.test_collision_candidate_validation  # Run specific method")
        
        print(f"\n🧪 Test Categories:")
        print(f"  🏗️  TestAdvancedIncidentDetectionSystem - System initialization")
        print(f"  💥 TestCollisionDetection - Multi-layer collision detection")
        print(f"  🚗 TestVehicleTracking - Vehicle tracking and matching")
        print(f"  🌐 TestAPIIntegration - API reporting functionality")
        print(f"  🚨 TestIncidentDetection - Specific incident types")
        print(f"  ⚠️  TestErrorHandling - Error handling and edge cases")
        print(f"  ⚙️  TestConfiguration - Configuration management")
        print(f"  🔗 TestIntegration - End-to-end integration tests")
        
    except ImportError as e:
        print(f"❌ Could not import test module: {e}")
        print(f"💡 Make sure 'test_advanced_incident_detection.py' exists in the Testing folder")

def run_quick_validation():
    """Run a quick validation to check if the system can be imported"""
    print("🔍 Quick System Validation")
    print("-" * 40)
    
    if not setup_environment():
        return False
    
    try:
        # Try to import the main system
        from incident_detection_system import AdvancedIncidentDetectionSystem
        print("✅ AdvancedIncidentDetectionSystem imported successfully")
        
        # Try to create a minimal instance (without video)
        from unittest.mock import patch, Mock
        with patch('cv2.VideoCapture'), \
             patch.object(AdvancedIncidentDetectionSystem, '_load_model', return_value=Mock()):
            system = AdvancedIncidentDetectionSystem(
                stream_url="test.mp4",
                config={'display_window': False, 'api_enabled': False}
            )
        print("✅ System instance created successfully")
        
        # Check key methods exist
        required_methods = [
            '_detect_objects',
            '_update_vehicle_tracking', 
            '_detect_incidents_multilayer',
            '_send_incident_to_api',
            '_is_collision_candidate',
            '_are_vehicles_approaching'
        ]
        
        for method in required_methods:
            if hasattr(system, method):
                print(f"✅ Method {method} found")
            else:
                print(f"❌ Method {method} missing")
                return False
        
        print("\n🎉 System validation successful! Ready for testing.")
        return True
        
    except ImportError as e:
        print(f"❌ Could not import AdvancedIncidentDetectionSystem: {e}")
        print(f"💡 Make sure your incident detection code is saved as 'incident_detection_system.py' in the Code folder")
        return False
    except Exception as e:
        print(f"❌ System validation failed: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) == 1:
        # Run all tests
        success = run_all_tests()
    elif sys.argv[1] == '--list':
        # List available tests
        list_available_tests()
        success = True
    elif sys.argv[1] == '--validate':
        # Quick validation
        success = run_quick_validation()
    else:
        # Run specific test
        test_name = sys.argv[1]
        print(f"🧪 Running specific test: {test_name}")
        print("=" * 60)
        success = run_specific_test(test_name)
    
    sys.exit(0 if success else 1)