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
    
    return True

def run_all_tests():
    """Run all unit tests and return results"""
    
    print("🚗 Car Detection Test Runner")
    print("=" * 60)
    
    # Setup environment
    if not setup_environment():
        print("❌ Environment setup failed!")
        return False
    
    print("=" * 60)
    
    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')
    
    # Run tests with different verbosity levels
    runner = unittest.TextTestRunner(
        verbosity=2,
        buffer=True,  # Capture stdout/stderr during tests
        failfast=False  # Continue running tests after first failure
    )
    
    print("🧪 Running Car Detection Unit Tests...")
    print("-" * 60)
    
    result = runner.run(suite)
    
    # Print detailed summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
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
        return True
    else:
        print(f"\n❌ SOME TESTS FAILED")
        return False

def run_specific_test(test_name):
    """Run a specific test class or method"""
    
    if not setup_environment():
        return False
    
    suite = unittest.TestSuite()
    
    try:
        # Import the test module
        import test_car_detection
        
        if '.' in test_name:
            # Specific test method (e.g., TestCarDetection.test_method)
            suite.addTest(unittest.TestLoader().loadTestsFromName(f'test_car_detection.{test_name}'))
        else:
            # Test class (e.g., TestCarDetection)
            test_class = getattr(test_car_detection, test_name)
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
        import test_car_detection
        
        print("📋 Available Test Classes:")
        print("-" * 40)
        
        test_classes = [
            'TestCarDetection',
            'TestCarDetectorClass', 
            'TestVideoProcessor',
            'TestProcessFrameFunction',
            'TestIntegration',
            'TestErrorHandling',
            'TestVideoPathHandling'
        ]
        
        for class_name in test_classes:
            if hasattr(test_car_detection, class_name):
                test_class = getattr(test_car_detection, class_name)
                methods = [method for method in dir(test_class) if method.startswith('test_')]
                print(f"\n{class_name}:")
                for method in methods:
                    print(f"  - {method}")
        
        print(f"\n💡 Usage Examples:")
        print(f"  python run_tests.py                    # Run all tests")
        print(f"  python run_tests.py TestCarDetection   # Run specific class")
        print(f"  python run_tests.py TestCarDetection.test_detect_cars_returns_tuple  # Run specific method")
        
    except ImportError as e:
        print(f"❌ Could not import test module: {e}")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        # Run all tests
        success = run_all_tests()
    elif sys.argv[1] == '--list':
        # List available tests
        list_available_tests()
        success = True
    else:
        # Run specific test
        test_name = sys.argv[1]
        print(f"🧪 Running specific test: {test_name}")
        print("=" * 60)
        success = run_specific_test(test_name)
    
    sys.exit(0 if success else 1)

