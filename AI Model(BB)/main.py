from video_processor import VideoProcessor
from car_detection import detect_cars

def main():
    # Use the correct path to your video file
    video_path = "Videos/CarTrainingVideo.mp4"
    
    # Initialize the video processor
    processor = VideoProcessor(video_path)
    
    # Process video with car detection
    frames_processed = processor.process_video(
        display=True, 
        save_frames=True,
        process_frame_func=detect_cars
    )
    
    print(f"Processed {frames_processed} frames")

if __name__ == "__main__":
    main()