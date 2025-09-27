#!/usr/bin/env python3
"""
Performance Test Runner for Traffic Guardian Incident Detection System

This script runs all performance tests and generates a comprehensive report.
"""

import sys
import os
import time
import unittest
import json
import psutil
from datetime import datetime
import argparse

# Add the Code directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Code'))

# Import test modules
try:
    from test_incident_detection_performance import IncidentDetectionPerformanceTest, LoadTest
    from test_video_pipeline_load import VideoPipelineLoadTest
    from test_profiling_and_memory import ProfilingAndMemoryTest
except ImportError as e:
    print(f"Failed to import test modules: {e}")
    print("Make sure all test files are in the same directory as this runner.")
    sys.exit(1)


class PerformanceTestRunner:
    def __init__(self, output_dir="test_results"):
        self.output_dir = output_dir
        self.results = {}
        self.start_time = None
        self.end_time = None
        self.system_info = self._collect_system_info()

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

    def _collect_system_info(self):
        """Collect system information for the test report."""
        try:
            cpu_info = {
                'cpu_count': psutil.cpu_count(),
                'cpu_count_logical': psutil.cpu_count(logical=True),
                'cpu_freq': psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
            }
        except:
            cpu_info = {'cpu_count': 'Unknown', 'cpu_count_logical': 'Unknown', 'cpu_freq': None}

        try:
            memory_info = psutil.virtual_memory()._asdict()
        except:
            memory_info = {'total': 'Unknown'}

        return {
            'timestamp': datetime.now().isoformat(),
            'platform': sys.platform,
            'python_version': sys.version,
            'cpu_info': cpu_info,
            'memory_info': memory_info
        }

    def run_test_suite(self, test_class, suite_name):
        """Run a specific test suite and capture results."""
        print(f"\n{'='*60}")
        print(f"Running {suite_name} Tests")
        print(f"{'='*60}")

        loader = unittest.TestLoader()
        suite = loader.loadTestsFromTestCase(test_class)

        # Custom test result class to capture more information
        class DetailedTestResult(unittest.TestResult):
            def __init__(self):
                super().__init__()
                self.test_results = []
                self.start_times = {}

            def startTest(self, test):
                super().startTest(test)
                self.start_times[test] = time.time()

            def stopTest(self, test):
                super().stopTest(test)
                end_time = time.time()
                start_time = self.start_times.get(test, end_time)
                duration = end_time - start_time

                result = {
                    'name': str(test),
                    'duration': duration,
                    'status': 'passed'
                }

                # Check if test failed or had error
                for failure in self.failures:
                    if failure[0] == test:
                        result['status'] = 'failed'
                        result['message'] = failure[1]
                        break

                for error in self.errors:
                    if error[0] == test:
                        result['status'] = 'error'
                        result['message'] = error[1]
                        break

                self.test_results.append(result)

        test_result = DetailedTestResult()
        suite.run(test_result)

        suite_results = {
            'suite_name': suite_name,
            'tests_run': test_result.testsRun,
            'failures': len(test_result.failures),
            'errors': len(test_result.errors),
            'success_rate': (test_result.testsRun - len(test_result.failures) - len(test_result.errors)) / test_result.testsRun if test_result.testsRun > 0 else 0,
            'total_duration': sum(t['duration'] for t in test_result.test_results),
            'test_details': test_result.test_results
        }

        if test_result.failures:
            print(f"\n⚠️  {len(test_result.failures)} test(s) failed in {suite_name}")

        if test_result.errors:
            print(f"\n❌ {len(test_result.errors)} test(s) had errors in {suite_name}")

        return suite_results

    def run_all_tests(self, test_categories=None):
        """Run all performance tests."""
        if test_categories is None:
            test_categories = ['basic', 'load', 'profiling']

        self.start_time = time.time()

        print("Starting Traffic Guardian Performance Test Suite")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"System: {self.system_info['cpu_info']['cpu_count']} CPU cores, "
              f"{self.system_info['memory_info']['total'] / (1024**3):.1f}GB RAM")

        test_suites = []

        if 'basic' in test_categories:
            test_suites.append((IncidentDetectionPerformanceTest, "Basic Performance"))

        if 'load' in test_categories:
            test_suites.append((VideoPipelineLoadTest, "Video Pipeline Load"))
            test_suites.append((LoadTest, "Sustained Load"))

        if 'profiling' in test_categories:
            test_suites.append((ProfilingAndMemoryTest, "Profiling and Memory"))

        for test_class, suite_name in test_suites:
            try:
                suite_results = self.run_test_suite(test_class, suite_name)
                self.results[suite_name.lower().replace(' ', '_')] = suite_results
            except Exception as e:
                print(f"Error running {suite_name}: {e}")
                self.results[suite_name.lower().replace(' ', '_')] = {
                    'suite_name': suite_name,
                    'error': str(e),
                    'tests_run': 0,
                    'failures': 0,
                    'errors': 1,
                    'success_rate': 0,
                    'total_duration': 0,
                    'test_details': []
                }

        self.end_time = time.time()

    def generate_report(self):
        """Generate a comprehensive performance test report."""
        total_duration = self.end_time - self.start_time if self.end_time and self.start_time else 0

        report = {
            'test_run_info': {
                'timestamp': self.system_info['timestamp'],
                'total_duration': total_duration,
                'test_categories': list(self.results.keys())
            },
            'system_info': self.system_info,
            'test_results': self.results,
            'summary': self._generate_summary()
        }

        # Save JSON report
        json_file = os.path.join(self.output_dir, f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(json_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        # Generate text report
        text_report = self._generate_text_report(report)
        text_file = os.path.join(self.output_dir, f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
        with open(text_file, 'w') as f:
            f.write(text_report)

        print(f"\n📊 Reports saved:")
        print(f"   JSON: {json_file}")
        print(f"   Text: {text_file}")

        return report

    def _generate_summary(self):
        """Generate a summary of all test results."""
        total_tests = sum(suite.get('tests_run', 0) for suite in self.results.values())
        total_failures = sum(suite.get('failures', 0) for suite in self.results.values())
        total_errors = sum(suite.get('errors', 0) for suite in self.results.values())
        total_duration = sum(suite.get('total_duration', 0) for suite in self.results.values())

        overall_success_rate = (total_tests - total_failures - total_errors) / total_tests if total_tests > 0 else 0

        return {
            'total_tests': total_tests,
            'total_failures': total_failures,
            'total_errors': total_errors,
            'overall_success_rate': overall_success_rate,
            'total_test_duration': total_duration,
            'performance_grade': self._calculate_performance_grade()
        }

    def _calculate_performance_grade(self):
        """Calculate an overall performance grade based on test results."""
        success_rates = [suite.get('success_rate', 0) for suite in self.results.values()]
        avg_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0

        if avg_success_rate >= 0.95:
            return 'A+ (Excellent)'
        elif avg_success_rate >= 0.9:
            return 'A (Very Good)'
        elif avg_success_rate >= 0.8:
            return 'B (Good)'
        elif avg_success_rate >= 0.7:
            return 'C (Fair)'
        elif avg_success_rate >= 0.6:
            return 'D (Poor)'
        else:
            return 'F (Fail)'

    def _generate_text_report(self, report):
        """Generate a human-readable text report."""
        lines = []
        lines.append("=" * 80)
        lines.append("TRAFFIC GUARDIAN INCIDENT DETECTION SYSTEM")
        lines.append("PERFORMANCE TEST REPORT")
        lines.append("=" * 80)
        lines.append("")

        # Test run information
        lines.append("📋 TEST RUN INFORMATION")
        lines.append("-" * 40)
        lines.append(f"Timestamp: {report['test_run_info']['timestamp']}")
        lines.append(f"Total Duration: {report['test_run_info']['total_duration']:.1f} seconds")
        lines.append(f"Test Categories: {', '.join(report['test_run_info']['test_categories'])}")
        lines.append("")

        # System information
        lines.append("💻 SYSTEM INFORMATION")
        lines.append("-" * 40)
        cpu_info = report['system_info']['cpu_info']
        mem_info = report['system_info']['memory_info']
        lines.append(f"Platform: {report['system_info']['platform']}")
        lines.append(f"Python Version: {report['system_info']['python_version'].split()[0]}")
        lines.append(f"CPU Cores: {cpu_info['cpu_count']} physical, {cpu_info['cpu_count_logical']} logical")
        if mem_info.get('total'):
            lines.append(f"Memory: {mem_info['total'] / (1024**3):.1f} GB total")
        lines.append("")

        # Summary
        summary = report['summary']
        lines.append("📊 SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Total Tests: {summary['total_tests']}")
        lines.append(f"Passed: {summary['total_tests'] - summary['total_failures'] - summary['total_errors']}")
        lines.append(f"Failed: {summary['total_failures']}")
        lines.append(f"Errors: {summary['total_errors']}")
        lines.append(f"Success Rate: {summary['overall_success_rate']*100:.1f}%")
        lines.append(f"Performance Grade: {summary['performance_grade']}")
        lines.append(f"Total Test Duration: {summary['total_test_duration']:.1f} seconds")
        lines.append("")

        # Detailed results
        lines.append("🔍 DETAILED RESULTS")
        lines.append("-" * 40)

        for suite_name, suite_data in report['test_results'].items():
            lines.append(f"\n{suite_data['suite_name'].upper()}")
            lines.append("  " + "-" * 30)

            if 'error' in suite_data:
                lines.append(f"  ❌ Suite Error: {suite_data['error']}")
                continue

            lines.append(f"  Tests Run: {suite_data['tests_run']}")
            lines.append(f"  Success Rate: {suite_data['success_rate']*100:.1f}%")
            lines.append(f"  Duration: {suite_data['total_duration']:.2f} seconds")

            if suite_data['failures'] > 0 or suite_data['errors'] > 0:
                lines.append(f"  ⚠️  Failures: {suite_data['failures']}, Errors: {suite_data['errors']}")

            # Individual test details
            for test in suite_data.get('test_details', []):
                status_icon = "✅" if test['status'] == 'passed' else "❌"
                lines.append(f"    {status_icon} {test['name'].split('.')[-1]}: {test['duration']:.3f}s")

        lines.append("")
        lines.append("=" * 80)
        lines.append("End of Report")
        lines.append("=" * 80)

        return "\n".join(lines)

    def print_summary(self):
        """Print a quick summary to console."""
        if not self.results:
            print("No test results available.")
            return

        summary = self._generate_summary()

        print(f"\n{'='*60}")
        print("PERFORMANCE TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['total_tests'] - summary['total_failures'] - summary['total_errors']}")
        print(f"Failed: {summary['total_failures']}")
        print(f"Errors: {summary['total_errors']}")
        print(f"Success Rate: {summary['overall_success_rate']*100:.1f}%")
        print(f"Performance Grade: {summary['performance_grade']}")

        if summary['total_failures'] == 0 and summary['total_errors'] == 0:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed. Check the detailed report for more information.")


def main():
    parser = argparse.ArgumentParser(description='Run Traffic Guardian Performance Tests')
    parser.add_argument('--categories', nargs='+',
                       choices=['basic', 'load', 'profiling'],
                       default=['basic', 'load', 'profiling'],
                       help='Test categories to run')
    parser.add_argument('--output-dir', default='test_results',
                       help='Directory to save test results')
    parser.add_argument('--quiet', action='store_true',
                       help='Suppress verbose output')

    args = parser.parse_args()

    if args.quiet:
        # Suppress most output
        class QuietTestResult(unittest.TextTestRunner):
            def __init__(self):
                super().__init__(stream=open(os.devnull, 'w'), verbosity=0)

    runner = PerformanceTestRunner(output_dir=args.output_dir)

    try:
        runner.run_all_tests(test_categories=args.categories)
        report = runner.generate_report()
        runner.print_summary()

        return 0 if runner._generate_summary()['total_failures'] == 0 and runner._generate_summary()['total_errors'] == 0 else 1

    except KeyboardInterrupt:
        print("\n⚠️  Test run interrupted by user.")
        return 1
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)