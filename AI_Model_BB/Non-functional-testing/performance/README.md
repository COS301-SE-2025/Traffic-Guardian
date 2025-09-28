# Traffic Guardian Performance Testing Suite

This directory contains comprehensive performance tests for the Traffic Guardian Incident Detection System. The test suite evaluates system performance, memory usage, CPU utilization, and load handling capabilities.

## 📁 Test Structure

```
performance/
├── test_incident_detection_performance.py  # Core performance tests
├── test_video_pipeline_load.py            # Video processing load tests
├── test_profiling_and_memory.py           # Memory and CPU profiling
├── run_performance_tests.py               # Test runner and report generator
├── requirements.txt                       # Dependencies
└── README.md                              # This file
```

## 🧪 Test Categories

### 1. Basic Performance Tests (`test_incident_detection_performance.py`)

- **Initialization Performance**: Measures system startup time and memory allocation
- **Single Frame Processing**: Tests processing speed for individual frames
- **Memory Usage Over Time**: Monitors memory consumption during extended operation
- **Concurrent Processing**: Tests multi-threaded performance
- **Algorithm Performance**: Profiles incident detection algorithms
- **High Resolution Stress Test**: Tests 4K video processing capability

### 2. Video Pipeline Load Tests (`test_video_pipeline_load.py`)

- **Single Stream Load**: Tests real-time video stream processing
- **Multiple Stream Concurrent Load**: Tests concurrent multi-camera processing
- **High Resolution Load**: Tests high-definition video processing
- **Sustained Processing Stability**: Tests long-duration stability
- **Burst Load Handling**: Tests performance under sudden load spikes

### 3. Profiling and Memory Tests (`test_profiling_and_memory.py`)

- **Memory Usage Analysis**: Detailed memory consumption tracking
- **Memory Leak Detection**: Identifies potential memory leaks
- **CPU Profiling**: Identifies performance bottlenecks
- **Resolution Scaling**: Tests memory usage across different resolutions
- **Memory Pressure Testing**: Tests performance under constrained memory
- **Object Lifecycle Tracking**: Monitors object creation and cleanup

## 🚀 Quick Start

### Prerequisites

1. Install required dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure the incident detection system is properly set up in `../../Code/`

### Running All Tests

```bash
python run_performance_tests.py
```

### Running Specific Test Categories

```bash
# Run only basic performance tests
python run_performance_tests.py --categories basic

# Run load and profiling tests
python run_performance_tests.py --categories load profiling
```

### Running Individual Test Files

```bash
# Run basic performance tests
python test_incident_detection_performance.py

# Run load tests
python test_video_pipeline_load.py

# Run profiling tests
python test_profiling_and_memory.py
```

## 📊 Test Reports

The test runner generates comprehensive reports in multiple formats:

- **JSON Report**: Machine-readable results with detailed metrics
- **Text Report**: Human-readable summary with performance analysis
- **Console Summary**: Quick overview displayed in terminal

Reports are saved in the `test_results/` directory by default.

## 🎯 Performance Benchmarks

### Expected Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| Frame Processing (720p) | < 100ms | < 500ms |
| Frame Processing (1080p) | < 200ms | < 1000ms |
| Memory Growth (100 frames) | < 50MB | < 100MB |
| CPU Usage (sustained) | < 70% | < 90% |
| Real-time FPS (720p) | > 25 FPS | > 15 FPS |
| Concurrent Streams | 4+ streams | 2+ streams |

### Performance Grades

- **A+ (Excellent)**: 95%+ tests pass, exceeds all targets
- **A (Very Good)**: 90%+ tests pass, meets most targets
- **B (Good)**: 80%+ tests pass, acceptable performance
- **C (Fair)**: 70%+ tests pass, some performance issues
- **D (Poor)**: 60%+ tests pass, significant issues
- **F (Fail)**: <60% tests pass, unacceptable performance

## 🔧 Test Configuration

### Environment Variables

Set these environment variables to customize test behavior:

```bash
# Test data directory
export TEST_DATA_DIR="/path/to/test/videos"

# Model path override
export MODEL_PATH="/path/to/custom/model"

# Enable verbose logging
export VERBOSE_TESTING=true
```

### Customizing Tests

Tests can be customized by modifying configuration dictionaries in each test file:

```python
# In test_incident_detection_performance.py
test_configs = {
    'lightweight': {
        'detection_threshold': 0.7,
        'history_length': 10,
        'collision_distance_threshold': 150
    },
    # ... add custom configs
}
```

## 📈 Interpreting Results

### Key Metrics

- **Processing Time**: Time to process a single frame
- **Memory Usage**: RAM consumption during operation
- **CPU Usage**: Processor utilization percentage
- **Frame Rate**: Frames processed per second
- **Throughput**: Total data processing capacity

### Warning Signs

- **Memory Growth**: Consistent increase over time (potential leak)
- **High CPU Usage**: Sustained >80% usage
- **Frame Drops**: Processing can't keep up with input
- **Timeout Errors**: Processing takes too long

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**
   ```
   ModuleNotFoundError: No module named 'incident_detection_system'
   ```
   - Ensure the Code directory path is correct
   - Check that the incident detection system is properly installed

2. **CUDA/GPU Errors**
   ```
   RuntimeError: CUDA out of memory
   ```
   - Reduce test frame resolution
   - Decrease batch sizes in tests
   - Use CPU-only mode if needed

3. **High Memory Usage**
   ```
   MemoryError: Unable to allocate array
   ```
   - Close other applications
   - Reduce concurrent test threads
   - Use smaller test datasets

### Performance Optimization Tips

1. **For Better CPU Performance**:
   - Close unnecessary applications
   - Use dedicated testing machine
   - Ensure adequate cooling

2. **For Better Memory Performance**:
   - Increase virtual memory/swap space
   - Use memory-efficient test configurations
   - Run tests individually if needed

3. **For Consistent Results**:
   - Run tests multiple times
   - Use consistent system state
   - Monitor background processes

## 📝 Adding New Tests

### Creating Performance Tests

1. Inherit from `unittest.TestCase`
2. Use performance measurement utilities
3. Set appropriate assertions for performance thresholds
4. Include cleanup code to prevent memory leaks

Example:
```python
class CustomPerformanceTest(unittest.TestCase):
    def test_custom_performance(self):
        metrics = PerformanceMetrics()
        metrics.start_monitoring()

        # Your test code here

        metrics.stop_monitoring()
        summary = metrics.get_summary()

        self.assertLess(summary['avg_processing_time'], 0.1)
```

### Adding to Test Runner

Update `run_performance_tests.py` to include your new test class:

```python
if 'custom' in test_categories:
    test_suites.append((CustomPerformanceTest, "Custom Tests"))
```

## 📄 License

This testing suite is part of the Traffic Guardian project and follows the same licensing terms.

## 🤝 Contributing

When adding new performance tests:

1. Follow existing naming conventions
2. Include comprehensive documentation
3. Set realistic performance thresholds
4. Test on multiple system configurations
5. Update this README with new test descriptions

## 📞 Support

For issues related to performance testing:

1. Check the troubleshooting section above
2. Review test output logs
3. Ensure system meets minimum requirements
4. Contact the development team with detailed error information

---

**Last Updated**: September 2025
**Version**: 1.0
**Maintainer**: Traffic Guardian Development Team