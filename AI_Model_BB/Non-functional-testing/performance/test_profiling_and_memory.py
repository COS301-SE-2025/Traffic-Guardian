import sys
import os
import time
import gc
import tracemalloc
import cProfile
import pstats
import psutil
import threading
import unittest
import numpy as np
import cv2
from io import StringIO
from collections import defaultdict
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Code'))

try:
    from incident_detection_system import AdvancedIncidentDetectionSystem
except ImportError as e:
    print(f"Failed to import incident_detection_system: {e}")
    sys.exit(1)


class MemoryProfiler:
    def __init__(self):
        self.snapshots = []
        self.timestamps = []
        self.memory_samples = []
        self.is_monitoring = False

    def start_monitoring(self):
        tracemalloc.start()
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_memory)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()

    def stop_monitoring(self):
        self.is_monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1)
        if tracemalloc.is_tracing():
            tracemalloc.stop()

    def _monitor_memory(self):
        process = psutil.Process()
        start_time = time.time()

        while self.is_monitoring:
            try:
                current_time = time.time()
                memory_mb = process.memory_info().rss / 1024 / 1024

                if tracemalloc.is_tracing():
                    current, peak = tracemalloc.get_traced_memory()
                    traced_mb = current / 1024 / 1024
                else:
                    traced_mb = 0

                self.timestamps.append(current_time - start_time)
                self.memory_samples.append({
                    'rss_mb': memory_mb,
                    'traced_mb': traced_mb,
                    'timestamp': current_time - start_time
                })

                time.sleep(0.1)
            except Exception as e:
                break

    def take_snapshot(self, label=""):
        if tracemalloc.is_tracing():
            snapshot = tracemalloc.take_snapshot()
            self.snapshots.append({
                'snapshot': snapshot,
                'label': label,
                'timestamp': time.time()
            })

    def analyze_memory_growth(self):
        if len(self.snapshots) < 2:
            return "Insufficient snapshots for analysis"

        first_snapshot = self.snapshots[0]['snapshot']
        last_snapshot = self.snapshots[-1]['snapshot']

        top_stats = last_snapshot.compare_to(first_snapshot, 'lineno')

        analysis = []
        analysis.append("Top 10 memory growth sources:")

        for stat in top_stats[:10]:
            analysis.append(f"{stat.traceback.format()[-1]}: "
                          f"+{stat.size_diff / 1024 / 1024:.2f} MB "
                          f"({stat.count_diff:+} allocations)")

        return "\n".join(analysis)

    def generate_memory_report(self):
        if not self.memory_samples:
            return "No memory samples collected"

        initial_memory = self.memory_samples[0]['rss_mb']
        peak_memory = max(sample['rss_mb'] for sample in self.memory_samples)
        final_memory = self.memory_samples[-1]['rss_mb']

        memory_growth = final_memory - initial_memory
        peak_growth = peak_memory - initial_memory

        report = []
        report.append("=== Memory Usage Report ===")
        report.append(f"Initial memory: {initial_memory:.1f} MB")
        report.append(f"Peak memory: {peak_memory:.1f} MB")
        report.append(f"Final memory: {final_memory:.1f} MB")
        report.append(f"Memory growth: {memory_growth:.1f} MB")
        report.append(f"Peak growth: {peak_growth:.1f} MB")

        # Check for memory leaks (consistent growth)
        if len(self.memory_samples) > 10:
            recent_avg = np.mean([s['rss_mb'] for s in self.memory_samples[-5:]])
            early_avg = np.mean([s['rss_mb'] for s in self.memory_samples[:5]])
            growth_rate = (recent_avg - early_avg) / len(self.memory_samples)

            if growth_rate > 0.1:  # More than 0.1MB per sample
                report.append(f"⚠️  Potential memory leak detected (growth rate: {growth_rate:.3f} MB/sample)")
            else:
                report.append("✅ No significant memory leak detected")

        return "\n".join(report)


class CPUProfiler:
    def __init__(self):
        self.profiles = []
        self.cpu_samples = []
        self.is_monitoring = False

    def start_monitoring(self):
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_cpu)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()

    def stop_monitoring(self):
        self.is_monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1)

    def _monitor_cpu(self):
        process = psutil.Process()
        start_time = time.time()

        while self.is_monitoring:
            try:
                current_time = time.time()
                cpu_percent = process.cpu_percent()

                self.cpu_samples.append({
                    'cpu_percent': cpu_percent,
                    'timestamp': current_time - start_time
                })

                time.sleep(0.1)
            except Exception as e:
                break

    def profile_function(self, func, *args, **kwargs):
        pr = cProfile.Profile()
        pr.enable()

        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        pr.disable()

        s = StringIO()
        ps = pstats.Stats(pr, stream=s)
        ps.sort_stats('cumulative')
        ps.print_stats(20)

        profile_data = {
            'execution_time': end_time - start_time,
            'profile_output': s.getvalue(),
            'timestamp': start_time
        }

        self.profiles.append(profile_data)
        return result, profile_data

    def analyze_hot_spots(self):
        if not self.profiles:
            return "No profile data available"

        analysis = []
        analysis.append("=== CPU Hotspot Analysis ===")

        for i, profile in enumerate(self.profiles):
            analysis.append(f"\nProfile {i+1} (Execution time: {profile['execution_time']:.3f}s):")

            lines = profile['profile_output'].split('\n')
            for line in lines[5:15]:  # Skip header, show top 10 functions
                if line.strip() and 'ncalls' not in line:
                    analysis.append(f"  {line}")

        return "\n".join(analysis)

    def generate_cpu_report(self):
        if not self.cpu_samples:
            return "No CPU samples collected"

        avg_cpu = np.mean([sample['cpu_percent'] for sample in self.cpu_samples])
        max_cpu = np.max([sample['cpu_percent'] for sample in self.cpu_samples])
        min_cpu = np.min([sample['cpu_percent'] for sample in self.cpu_samples])

        report = []
        report.append("=== CPU Usage Report ===")
        report.append(f"Average CPU usage: {avg_cpu:.1f}%")
        report.append(f"Peak CPU usage: {max_cpu:.1f}%")
        report.append(f"Minimum CPU usage: {min_cpu:.1f}%")

        # Check for high CPU usage
        high_cpu_samples = [s for s in self.cpu_samples if s['cpu_percent'] > 80]
        if high_cpu_samples:
            high_cpu_percentage = len(high_cpu_samples) / len(self.cpu_samples) * 100
            report.append(f"⚠️  High CPU usage (>80%) for {high_cpu_percentage:.1f}% of monitoring time")
        else:
            report.append("✅ CPU usage within acceptable range")

        return "\n".join(report)


class ProfilingAndMemoryTest(unittest.TestCase):

    def setUp(self):
        self.memory_profiler = MemoryProfiler()
        self.cpu_profiler = CPUProfiler()

    def ensure_system_analytics(self, system):
        """Ensure the system has proper analytics initialization."""
        if not hasattr(system, 'analytics'):
            system.analytics = {
                'total_frames': 0,
                'total_detections': 0,
                'incidents_detected': 0,
                'class_totals': {},
                'start_time': time.time(),
                'alerts': [],
                'incident_log': [],
                'collision_layers': {
                    'trajectory_detected': 0,
                    'depth_confirmed': 0,
                    'flow_confirmed': 0,
                    'physics_confirmed': 0,
                    'final_confirmed': 0
                },
                'clips_recorded': 0
            }

    def tearDown(self):
        self.memory_profiler.stop_monitoring()
        self.cpu_profiler.stop_monitoring()
        gc.collect()

    def create_test_frame(self, width=640, height=480):
        return np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)

    def test_memory_usage_single_detection(self):
        print("\n=== Memory Usage - Single Detection ===")

        system = AdvancedIncidentDetectionSystem()
        test_frame = self.create_test_frame(1920, 1080)

        self.memory_profiler.start_monitoring()
        self.memory_profiler.take_snapshot("before_detection")

        # Process single frame multiple times
        for i in range(50):
            result = system._detect_objects(test_frame)
            if i % 10 == 0:
                self.memory_profiler.take_snapshot(f"after_{i}_detections")

        self.memory_profiler.take_snapshot("final")
        self.memory_profiler.stop_monitoring()

        print(self.memory_profiler.generate_memory_report())
        print(self.memory_profiler.analyze_memory_growth())

        # Assertions
        final_memory = self.memory_profiler.memory_samples[-1]['rss_mb']
        initial_memory = self.memory_profiler.memory_samples[0]['rss_mb']
        memory_growth = final_memory - initial_memory

        self.assertLess(memory_growth, 100, "Memory growth should be less than 100MB for 50 detections")

    def test_memory_leak_detection(self):
        print("\n=== Memory Leak Detection ===")

        system = AdvancedIncidentDetectionSystem()

        self.memory_profiler.start_monitoring()

        # Simulate extended processing
        for cycle in range(10):
            self.memory_profiler.take_snapshot(f"cycle_{cycle}_start")

            # Process 20 frames per cycle
            for i in range(20):
                frame = self.create_test_frame(640, 480)
                result = system._detect_objects(frame)

            self.memory_profiler.take_snapshot(f"cycle_{cycle}_end")

            # Force garbage collection
            gc.collect()

        self.memory_profiler.stop_monitoring()

        print(self.memory_profiler.generate_memory_report())

        # Check for memory leaks by analyzing growth pattern
        memory_samples = [s['rss_mb'] for s in self.memory_profiler.memory_samples]
        if len(memory_samples) > 20:
            # Check if memory is consistently growing
            first_quarter = np.mean(memory_samples[:len(memory_samples)//4])
            last_quarter = np.mean(memory_samples[-len(memory_samples)//4:])
            relative_growth = (last_quarter - first_quarter) / first_quarter

            self.assertLess(relative_growth, 0.2, "Memory should not grow by more than 20% over test duration")

    def test_cpu_profiling_detection_pipeline(self):
        print("\n=== CPU Profiling - Detection Pipeline ===")

        system = AdvancedIncidentDetectionSystem()
        self.ensure_system_analytics(system)
        test_frame = self.create_test_frame(1920, 1080)

        # Set up mock vehicle tracking data
        system.tracked_vehicles = {
            1: {'history': [(100, 100), (105, 100), (110, 100)], 'class': 'car'},
            2: {'history': [(200, 120), (195, 120), (190, 120)], 'class': 'car'}
        }

        self.cpu_profiler.start_monitoring()

        # Profile different components
        result, profile_data = self.cpu_profiler.profile_function(
            system._detect_objects, test_frame
        )

        # Profile incident detection
        mock_detections = [
            {'bbox': [100, 100, 50, 30], 'confidence': 0.9, 'class': 'car'},
            {'bbox': [200, 120, 50, 30], 'confidence': 0.8, 'class': 'car'}
        ]
        mock_tracking = {
            'active_tracks': [1, 2]  # List of track IDs
        }

        result, profile_data = self.cpu_profiler.profile_function(
            system._detect_incidents_multilayer,
            test_frame, {'detections': mock_detections}, mock_tracking
        )

        self.cpu_profiler.stop_monitoring()

        print(self.cpu_profiler.generate_cpu_report())
        print(self.cpu_profiler.analyze_hot_spots())

        # Assertions
        total_execution_time = sum(p['execution_time'] for p in self.cpu_profiler.profiles)
        self.assertLess(total_execution_time, 5.0, "Total profiled execution time should be under 5 seconds")

    def test_memory_usage_different_resolutions(self):
        print("\n=== Memory Usage - Different Resolutions ===")

        resolutions = [
            (640, 480, "SD"),
            (1280, 720, "HD"),
            (1920, 1080, "Full HD"),
            (3840, 2160, "4K")
        ]

        results = {}

        for width, height, label in resolutions:
            gc.collect()  # Clean up before each test

            memory_profiler = MemoryProfiler()
            memory_profiler.start_monitoring()

            system = AdvancedIncidentDetectionSystem()
            test_frame = self.create_test_frame(width, height)

            initial_memory = psutil.Process().memory_info().rss / 1024 / 1024

            # Process 10 frames
            for i in range(10):
                result = system._detect_objects(test_frame)

            final_memory = psutil.Process().memory_info().rss / 1024 / 1024
            memory_used = final_memory - initial_memory

            memory_profiler.stop_monitoring()

            results[label] = {
                'resolution': f"{width}x{height}",
                'memory_used': memory_used,
                'avg_memory': np.mean([s['rss_mb'] for s in memory_profiler.memory_samples])
            }

            del system
            del memory_profiler

        print("Memory usage by resolution:")
        for label, data in results.items():
            print(f"{label} ({data['resolution']}): {data['memory_used']:.1f}MB increase, "
                  f"avg: {data['avg_memory']:.1f}MB")

        # Assert reasonable memory scaling
        hd_memory = results['HD']['memory_used']
        fourk_memory = results['4K']['memory_used']

        # 4K should use more memory but not excessively more
        self.assertLess(fourk_memory / hd_memory, 10, "4K memory usage should not be >10x HD usage")

    def test_performance_under_memory_pressure(self):
        print("\n=== Performance Under Memory Pressure ===")

        system = AdvancedIncidentDetectionSystem()

        self.memory_profiler.start_monitoring()
        self.cpu_profiler.start_monitoring()

        # Create memory pressure by allocating large arrays
        memory_hogs = []
        for i in range(5):
            memory_hog = np.random.randint(0, 255, (1000, 1000, 100), dtype=np.uint8)
            memory_hogs.append(memory_hog)

        print(f"Created memory pressure: {psutil.Process().memory_info().rss / 1024 / 1024:.1f}MB")

        # Test performance under pressure
        test_frame = self.create_test_frame(1280, 720)
        processing_times = []

        for i in range(20):
            start_time = time.time()
            result = system._detect_objects(test_frame)
            end_time = time.time()
            processing_times.append(end_time - start_time)

        self.memory_profiler.stop_monitoring()
        self.cpu_profiler.stop_monitoring()

        avg_processing_time = np.mean(processing_times)
        max_processing_time = np.max(processing_times)

        print(f"Average processing time under pressure: {avg_processing_time:.3f}s")
        print(f"Maximum processing time under pressure: {max_processing_time:.3f}s")
        print(self.memory_profiler.generate_memory_report())

        # Clean up memory pressure
        del memory_hogs
        gc.collect()

        # Assert system remains functional under memory pressure
        self.assertLess(avg_processing_time, 2.0, "System should remain responsive under memory pressure")

    def test_object_lifecycle_tracking(self):
        print("\n=== Object Lifecycle Tracking ===")

        self.memory_profiler.start_monitoring()

        # Create and destroy multiple systems
        for i in range(5):
            self.memory_profiler.take_snapshot(f"before_system_{i}")

            system = AdvancedIncidentDetectionSystem()
            test_frame = self.create_test_frame(640, 480)

            # Use the system
            for j in range(10):
                result = system._detect_objects(test_frame)

            self.memory_profiler.take_snapshot(f"after_system_{i}_use")

            # Explicitly delete and garbage collect
            del system
            gc.collect()

            self.memory_profiler.take_snapshot(f"after_system_{i}_cleanup")

        self.memory_profiler.stop_monitoring()

        print(self.memory_profiler.generate_memory_report())
        print(self.memory_profiler.analyze_memory_growth())

        # Check that memory is properly released after each cycle
        memory_samples = [s['rss_mb'] for s in self.memory_profiler.memory_samples]
        final_memory = memory_samples[-1]
        initial_memory = memory_samples[0]

        self.assertLess(final_memory - initial_memory, 50,
                       "Memory should be released properly after object cleanup")


if __name__ == '__main__':
    print("Starting Profiling and Memory Tests...")
    print("=" * 60)

    suite = unittest.TestSuite()

    suite.addTest(ProfilingAndMemoryTest('test_memory_usage_single_detection'))
    suite.addTest(ProfilingAndMemoryTest('test_memory_leak_detection'))
    suite.addTest(ProfilingAndMemoryTest('test_cpu_profiling_detection_pipeline'))
    suite.addTest(ProfilingAndMemoryTest('test_memory_usage_different_resolutions'))
    suite.addTest(ProfilingAndMemoryTest('test_performance_under_memory_pressure'))
    suite.addTest(ProfilingAndMemoryTest('test_object_lifecycle_tracking'))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 60)
    print("Profiling Test Summary:")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"- {test}")

    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"- {test}")