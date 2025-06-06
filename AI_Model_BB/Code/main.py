from car_detection import detect_cars
from video_processor import VideoProcessor


def main():
    video_path = "Videos/CarTrainingVideo.mp4"

    # Initialize the video
    processor = VideoProcessor(video_path)

    # Process video with car detection
    frames_processed = processor.process_video(
        display=True, save_frames=True, process_frame_func=detect_cars
    )

    print(f"Processed {frames_processed} frames")


if __name__ == "__main__":
    main()
