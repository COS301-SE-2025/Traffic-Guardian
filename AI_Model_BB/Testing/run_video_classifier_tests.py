"""
Test Runner for Video Incident Classifier
Runs all unit tests for the video classification system.
"""

import sys
import os
import unittest
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir.parent / 'Code'))

def run_video_classifier_tests():
    """Run all video classifier tests."""
    print("🚗💥 VIDEO INCIDENT CLASSIFIER TEST SUITE")
    print("=" * 60)
    
    try:
        # Import the test module
        from test_video_incident_classifier import (
            TestLRUCache,
            TestCrashReport,
            TestEnhancedVideoPreprocessor,
            TestCrashSpecificCNN,
            TestEnhancedCrashClassifier,
            TestAPIIntegration,
            TestUtilityFunctions,
            TestBatchProcessing
        )
        
        # Create test suite
        test_suite = unittest.TestSuite()
        
        # Add all test classes
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
        
        # Run tests with detailed output
        runner = unittest.TextTestRunner(
            verbosity=2,
            stream=sys.stdout,
            buffer=False
        )
        
        print(f"Running {test_suite.countTestCases()} tests...\n")
        result = runner.run(test_suite)
        
        # Print detailed summary
        print("\n" + "=" * 60)
        print("📊 DETAILED TEST RESULTS")
        print("=" * 60)
        
        total_tests = result.testsRun
        failures = len(result.failures)
        errors = len(result.errors)
        successes = total_tests - failures - errors
        success_rate = (successes / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ Successful Tests: {successes}")
        print(f"❌ Failed Tests: {failures}")
        print(f"🚨 Error Tests: {errors}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️  Total Tests Run: {total_tests}")
        
        # Show details for failures
        if result.failures:
            print(f"\n❌ FAILURE DETAILS ({len(result.failures)} failures):")
            print("-" * 40)
            for i, (test, traceback) in enumerate(result.failures, 1):
                print(f"{i}. {test}")
                # Show last few lines of traceback
                lines = traceback.strip().split('\n')
                for line in lines[-3:]:
                    if line.strip():
                        print(f"   {line}")
                print()
        
        # Show details for errors
        if result.errors:
            print(f"\n🚨 ERROR DETAILS ({len(result.errors)} errors):")
            print("-" * 40)
            for i, (test, traceback) in enumerate(result.errors, 1):
                print(f"{i}. {test}")
                # Show last few lines of traceback
                lines = traceback.strip().split('\n')
                for line in lines[-3:]:
                    if line.strip():
                        print(f"   {line}")
                print()
        
        # Overall result
        if failures == 0 and errors == 0:
            print("🎉 ALL TESTS PASSED! The video incident classifier is working correctly.")
        elif failures + errors < total_tests * 0.1:  # Less than 10% failures
            print("⚠️  MOSTLY SUCCESSFUL: Most tests passed with minor issues.")
        else:
            print("❌ SIGNIFICANT ISSUES: Multiple test failures detected.")
        
        print("=" * 60)
        
        return result.wasSuccessful()
        
    except ImportError as e:
        print(f"❌ Error importing test modules: {e}")
        print("Make sure the video_incident_classifier.py file is in the Code directory.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error running tests: {e}")
        return False

def run_specific_test_class(test_class_name):
    """Run a specific test class."""
    print(f"🧪 Running {test_class_name} tests...")
    
    try:
        # Import the specific test class
        module = __import__('test_video_incident_classifier', fromlist=[test_class_name])
        test_class = getattr(module, test_class_name)
        
        # Create and run test suite
        suite = unittest.TestLoader().loadTestsFromTestCase(test_class)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        return result.wasSuccessful()
        
    except (ImportError, AttributeError) as e:
        print(f"❌ Error running {test_class_name}: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Run specific test class if provided
        test_class_name = sys.argv[1]
        success = run_specific_test_class(test_class_name)
    else:
        # Run all tests
        success = run_video_classifier_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
