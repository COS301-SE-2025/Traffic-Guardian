Testing Setup - Quick Guide


What You're Looking At

AI_Model_BB/
├── Code/                    # The actual car detection code
│   ├── car_detection.py     # Main detection function
│   ├── video_processor.py   # Handles video files
│   └── Videos/              # Test videos go here
└── Testing/                 # Test files (you are here)
    ├── test_car_detection.py
    ├── run_tests.py
    └── other test files...
```

Step 1: Install What You Need

Open terminal in the `Testing` folder and run:


pip install opencv-python numpy





Step 2: Check Everything Works


python setup_verification.py


If you see green checkmarks (✅), you're good. If you see red X's (❌), something's wrong with the setup.

Step 3: Run The Tests

python run_tests.py


You should see something like:

🚗 Car Detection Test Runner
...
Tests run: 23
Successes: 23
Failures: 0
Errors: 0
✅ ALL TESTS PASSED!


If tests fail, read the error messages - they usually tell you exactly what's wrong.



Common Problems

"Can't import car_detection"
**Fix:** Make sure the `Code` folder has `car_detection.py` and `video_processor.py`

"Videos folder not found" 
**Fix:** Put video files in `Code/Videos/` folder

Tests pass but some are skipped
**That's normal.** Some tests only run if certain classes exist.

Running Specific Tests

To run specific test, Use these:


# Test just the car detection function
python run_tests.py TestCarDetection

# Test just video processing
python run_tests.py TestVideoProcessor

# See what tests are available
python run_tests.py --list
```

## Adding New Tests

When you add new functions to the code, add tests:

1. Open `test_car_detection.py`
2. Find the right test class (like `TestCarDetection`)
3. Add a new method:



python run_tests.py TestCarDetection.test_my_new_function

What Tests Are Checking

For detect_cars():**
- Returns the right format (frame + results dictionary)
- Results have car_count and car_locations
- Handles bad input without crashing

For VideoProcessor:**
- Can open video files
- Processes frames correctly  
- Cleans up resources properly


Code Coverage

couldnt integrate into the runtest.py
pip install coverage

# Run tests with coverage tracking
coverage run --source=../Code -m unittest test_car_detection.py

# View coverage report
coverage report

