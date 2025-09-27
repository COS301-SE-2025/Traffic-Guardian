import sys
import os
import time
import psutil
import threading
import cv2
import numpy as np
import unittest
import cProfile
import pstats
from io import StringIO
from collections import defaultdict
import gc
import tracemalloc

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Code'))

try:
    from incident_detection_system import AdvancedIncidentDetectionSystem
except ImportError as e:
    print(f"Failed to import incident_detection_system: {e}")
    sys.exit(1)


class PerformanceMetrics:
    def __init__(self):
        self.cpu_usage = []
        self.memory_usage = []
        self.processing_times = []
        self.frame_rates = []
        self.start_time = None
        self.end_time = None

    def start_monitoring(self):
        self.start_time = time.time()
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_resources)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()

    def stop_monitoring(self):
        self.end_time = time.time()
        self.monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1)

    def _monitor_resources(self):
        process = psutil.Process()
        while getattr(self, 'monitoring', False):
            try:
                cpu_percent = process.cpu_percent()
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024

                self.cpu_usage.append(cpu_percent)
                self.memory_usage.append(memory_mb)
                time.sleep(0.1)
            except:
                break

    def add_processing_time(self, processing_time):
        self.processing_times.append(processing_time)

    def add_frame_rate(self, fps):
        self.frame_rates.append(fps)

    def get_summary(self):
        total_time = self.end_time - self.start_time if self.end_time and self.start_time else 0

        return {
            'total_duration': total_time,
            'avg_cpu_usage': np.mean(self.cpu_usage) if self.cpu_usage else 0,
            'max_cpu_usage': np.max(self.cpu_usage) if self.cpu_usage else 0,
            'avg_memory_mb': np.mean(self.memory_usage) if self.memory_usage else 0,
            'max_memory_mb': np.max(self.memory_usage) if self.memory_usage else 0,
            'avg_processing_time': np.mean(self.processing_times) if self.processing_times else 0,
            'max_processing_time': np.max(self.processing_times) if self.processing_times else 0,
            'avg_fps': np.mean(self.frame_rates) if self.frame_rates else 0,
            'min_fps': np.min(self.frame_rates) if self.frame_rates else 0,
            'frames_processed': len(self.processing_times)
        }


class IncidentDetectionPerformanceTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.test_configs = {
            'lightweight': {
                'detection_threshold': 0.7,
                'history_length': 10,
                'collision_distance_threshold': 150
            },
            'standard': {
                'detection_threshold': 0.5,
                'history_length': 20,
                'collision_distance_threshold': 100
            },
            'intensive': {
                'detection_threshold': 0.3,
                'history_length': 30,
                'collision_distance_threshold': 80
            }
        }

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

    def setUp(self):
        self.metrics = PerformanceMetrics()

    def tearDown(self):
        gc.collect()

    def create_test_frame(self, width=1920, height=1080):
        frame = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
        return frame

    def create_test_video_sequence(self, num_frames=100, width=640, height=480):
        frames = []
        for i in range(num_frames):
            frame = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)

            x = int(width * 0.1 + (width * 0.8 * i / num_frames))
            y = int(height * 0.5)
            cv2.rectangle(frame, (x, y), (x+50, y+30), (255, 255, 255), -1)

            frames.append(frame)
        return frames

    def profile_method(self, method, *args, **kwargs):
        pr = cProfile.Profile()
        pr.enable()

        start_time = time.time()
        result = method(*args, **kwargs)
        end_time = time.time()

        pr.disable()

        s = StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
        ps.print_stats()

        return result, end_time - start_time, s.getvalue()

    def test_initialization_performance(self):
        results = {}

        for config_name, config in self.test_configs.items():
            start_time = time.time()

            system = AdvancedIncidentDetectionSystem(config=config)

            end_time = time.time()
            init_time = end_time - start_time

            results[config_name] = {
                'initialization_time': init_time,
                'memory_after_init': psutil.Process().memory_info().rss / 1024 / 1024
            }

            del system
            gc.collect()

        print("\n=== Initialization Performance ===")
        for config_name, metrics in results.items():
            print(f"{config_name}: {metrics['initialization_time']:.3f}s, "
                  f"Memory: {metrics['memory_after_init']:.1f}MB")

        self.assertLess(max(r['initialization_time'] for r in results.values()), 10.0,
                       "Initialization should complete within 10 seconds")

    def test_single_frame_processing_performance(self):
        system = AdvancedIncidentDetectionSystem(config=self.test_configs['standard'])
        test_frame = self.create_test_frame(1920, 1080)

        warmup_iterations = 5
        test_iterations = 50

        for _ in range(warmup_iterations):
            system._detect_objects(test_frame)

        self.metrics.start_monitoring()

        processing_times = []
        for i in range(test_iterations):
            start_time = time.time()

            detection_results = system._detect_objects(test_frame)

            end_time = time.time()
            processing_time = end_time - start_time
            processing_times.append(processing_time)

            self.metrics.add_processing_time(processing_time)
            if detection_results and 'fps' in detection_results:
                self.metrics.add_frame_rate(detection_results['fps'])

        self.metrics.stop_monitoring()

        summary = self.metrics.get_summary()

        print("\n=== Single Frame Processing Performance ===")
        print(f"Average processing time: {summary['avg_processing_time']:.3f}s")
        print(f"Maximum processing time: {summary['max_processing_time']:.3f}s")
        print(f"Average CPU usage: {summary['avg_cpu_usage']:.1f}%")
        print(f"Average memory usage: {summary['avg_memory_mb']:.1f}MB")
        print(f"Target FPS achievable: {1/summary['avg_processing_time']:.1f}")

        self.assertLess(summary['avg_processing_time'], 0.5,
                       "Average frame processing should be under 500ms")

    def test_memory_usage_over_time(self):
        system = AdvancedIncidentDetectionSystem(config=self.test_configs['standard'])
        frames = self.create_test_video_sequence(200, 640, 480)

        tracemalloc.start()
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024

        self.metrics.start_monitoring()

        for i, frame in enumerate(frames):
            system._detect_objects(frame)

            if i % 50 == 0:
                current, peak = tracemalloc.get_traced_memory()
                current_mb = current / 1024 / 1024
                peak_mb = peak / 1024 / 1024

        self.metrics.stop_monitoring()
        tracemalloc.stop()

        final_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_growth = final_memory - initial_memory

        summary = self.metrics.get_summary()

        print("\n=== Memory Usage Analysis ===")
        print(f"Initial memory: {initial_memory:.1f}MB")
        print(f"Final memory: {final_memory:.1f}MB")
        print(f"Memory growth: {memory_growth:.1f}MB")
        print(f"Max memory during test: {summary['max_memory_mb']:.1f}MB")

        self.assertLess(memory_growth, 100,
                       "Memory growth should be less than 100MB for 200 frames")

    def test_concurrent_processing_performance(self):
        num_threads = 4
        frames_per_thread = 25

        def process_frames(thread_id, results):
            system = AdvancedIncidentDetectionSystem(config=self.test_configs['lightweight'])
            frames = self.create_test_video_sequence(frames_per_thread, 320, 240)

            start_time = time.time()
            for frame in frames:
                system._detect_objects(frame)
            end_time = time.time()

            results[thread_id] = {
                'processing_time': end_time - start_time,
                'frames_processed': frames_per_thread
            }

        results = {}
        threads = []

        start_time = time.time()

        for i in range(num_threads):
            thread = threading.Thread(target=process_frames, args=(i, results))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        end_time = time.time()
        total_time = end_time - start_time

        total_frames = sum(r['frames_processed'] for r in results.values())
        overall_fps = total_frames / total_time

        print("\n=== Concurrent Processing Performance ===")
        print(f"Threads: {num_threads}")
        print(f"Total frames processed: {total_frames}")
        print(f"Total time: {total_time:.3f}s")
        print(f"Overall FPS: {overall_fps:.1f}")

        for thread_id, result in results.items():
            thread_fps = result['frames_processed'] / result['processing_time']
            print(f"Thread {thread_id} FPS: {thread_fps:.1f}")

        self.assertGreater(overall_fps, 3,
                          "Concurrent processing should achieve >3 FPS overall")

    def test_incident_detection_algorithm_performance(self):
        system = AdvancedIncidentDetectionSystem(config=self.test_configs['standard'])
        self.ensure_system_analytics(system)

        # Set up mock vehicle tracking data
        system.tracked_vehicles = {
            1: {'history': [(100, 100), (105, 100), (110, 100)], 'class': 'car'},
            2: {'history': [(200, 120), (195, 120), (190, 120)], 'class': 'car'},
            3: {'history': [(150, 110), (152, 112), (154, 114)], 'class': 'car'}
        }

        mock_detections = [
            {'bbox': [100, 100, 50, 30], 'confidence': 0.9, 'class': 'car'},
            {'bbox': [200, 120, 50, 30], 'confidence': 0.8, 'class': 'car'},
            {'bbox': [150, 110, 40, 25], 'confidence': 0.7, 'class': 'car'}
        ]

        mock_tracking = {
            'active_tracks': [1, 2, 3]  # List of track IDs
        }

        test_frame = self.create_test_frame(640, 480)

        result, processing_time, profile_output = self.profile_method(
            system._detect_incidents_multilayer,
            test_frame,
            {'detections': mock_detections},
            mock_tracking
        )

        print("\n=== Incident Detection Algorithm Performance ===")
        print(f"Processing time: {processing_time:.4f}s")
        print(f"Incidents detected: {len(result) if result else 0}")

        lines = profile_output.split('\n')[:20]
        print("\nTop function calls:")
        for line in lines[5:15]:
            if line.strip():
                print(line)

        self.assertLess(processing_time, 0.1,
                       "Incident detection should complete within 100ms")

    def test_stress_test_high_resolution(self):
        system = AdvancedIncidentDetectionSystem(config=self.test_configs['intensive'])

        high_res_frame = self.create_test_frame(3840, 2160)  # 4K resolution

        num_iterations = 10
        processing_times = []

        self.metrics.start_monitoring()

        for i in range(num_iterations):
            start_time = time.time()

            try:
                result = system._detect_objects(high_res_frame)
                end_time = time.time()
                processing_time = end_time - start_time
                processing_times.append(processing_time)

                self.metrics.add_processing_time(processing_time)

            except Exception as e:
                self.fail(f"High resolution processing failed: {e}")

        self.metrics.stop_monitoring()

        summary = self.metrics.get_summary()

        print("\n=== High Resolution Stress Test (4K) ===")
        print(f"Iterations: {num_iterations}")
        print(f"Average processing time: {summary['avg_processing_time']:.3f}s")
        print(f"Max processing time: {summary['max_processing_time']:.3f}s")
        print(f"Max memory usage: {summary['max_memory_mb']:.1f}MB")
        print(f"Max CPU usage: {summary['max_cpu_usage']:.1f}%")

        self.assertLess(summary['avg_processing_time'], 5.0,
                       "4K frame processing should complete within 5 seconds")
        self.assertLess(summary['max_memory_mb'], 2000,
                       "Memory usage should stay under 2GB")


class LoadTest(unittest.TestCase):

    def test_sustained_load(self):
        system = AdvancedIncidentDetectionSystem()
        frames = self.create_test_video_sequence(500, 640, 480)

        metrics = PerformanceMetrics()
        metrics.start_monitoring()

        start_time = time.time()

        for i, frame in enumerate(frames):
            frame_start = time.time()
            system._detect_objects(frame)
            frame_end = time.time()

            metrics.add_processing_time(frame_end - frame_start)

            if i % 100 == 0:
                elapsed = time.time() - start_time
                fps = (i + 1) / elapsed
                print(f"Processed {i+1} frames, Current FPS: {fps:.1f}")

        metrics.stop_monitoring()

        summary = metrics.get_summary()

        print("\n=== Sustained Load Test (500 frames) ===")
        print(f"Total duration: {summary['total_duration']:.1f}s")
        print(f"Average FPS: {summary['frames_processed'] / summary['total_duration']:.1f}")
        print(f"Average processing time: {summary['avg_processing_time']:.3f}s")
        print(f"Memory stability: {summary['max_memory_mb'] - np.mean(metrics.memory_usage[-10:]):.1f}MB drift")

        self.assertGreater(summary['frames_processed'] / summary['total_duration'], 2,
                          "Sustained processing should maintain >2 FPS")

    def create_test_video_sequence(self, num_frames=100, width=640, height=480):
        frames = []
        for i in range(num_frames):
            frame = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)

            x = int(width * 0.1 + (width * 0.8 * i / num_frames))
            y = int(height * 0.5)
            cv2.rectangle(frame, (x, y), (x+50, y+30), (255, 255, 255), -1)

            frames.append(frame)
        return frames


if __name__ == '__main__':
    print("Starting Incident Detection System Performance Tests...")
    print("=" * 60)

    suite = unittest.TestSuite()

    suite.addTest(IncidentDetectionPerformanceTest('test_initialization_performance'))
    suite.addTest(IncidentDetectionPerformanceTest('test_single_frame_processing_performance'))
    suite.addTest(IncidentDetectionPerformanceTest('test_memory_usage_over_time'))
    suite.addTest(IncidentDetectionPerformanceTest('test_concurrent_processing_performance'))
    suite.addTest(IncidentDetectionPerformanceTest('test_incident_detection_algorithm_performance'))
    suite.addTest(IncidentDetectionPerformanceTest('test_stress_test_high_resolution'))
    suite.addTest(LoadTest('test_sustained_load'))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 60)
    print("Performance Test Summary:")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")

    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")