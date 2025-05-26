Car Detection with OpenCV

A Python application for detecting and counting vehicles in video files using computer vision techniques. This project provides multiple detection methods including Haar cascades and background subtraction for robust car detection in traffic videos.

🚗 Features

- **Real-time car detection** in video files
- **Multiple detection methods**:
  - Background subtraction (motion-based)
- **Visual feedback** with bounding boxes and counts
- **Frame-by-frame processing** with optional saving
- **Adjustable parameters** for different video types
- **Debug mode** for parameter tuning

📋 Requirements

###System Requirements
- Python 3.7 or higher
- Webcam or video files for processing


Python Dependencies:

pip install opencv-python numpy




 📁 Project Structure

car-detection/
│
├── main.py                 # Main execution script
├── video_processor.py      # Video processing class
├── car_detection.py        # Car detection functions
├── Videos/                 # Place your video files here
│   └── CarTrainingVideo.mp4
├── output_frames/          # Generated frames (auto-created)
└── README.md


### 2. Add Your Video
Place your video file(s) in the `Videos/` directory:
```
Videos/
└── your_video.mp4
```

### 3. Update Video Path
Edit `main.py` to point to your video:
```python
video_path = "Videos/your_video.mp4"
```

### 4. Run the Application
```bash
python main.py
```


🎮 Controls

**During Video Playback:**
- `q` - Quit the application
- `p` - Pause/resume video
- `ESC` - Close video window

