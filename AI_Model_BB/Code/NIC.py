import cv2
import torch

# Load YOLOv5 small model from ultralytics repo
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

# Connect to the video stream served by streamlink
cap = cv2.VideoCapture("http://127.0.1.1:45969/")

if not cap.isOpened():
    print("Failed to open stream.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame.")
        break

    # Inference
    results = model(frame)

    # Optionally filter just vehicles
    df = results.pandas().xyxy[0]
    vehicles = df[df['name'].isin(['car', 'truck', 'bus', 'motorbike'])]

    print(f"Detected {len(vehicles)} vehicles")

    # Draw results on image
    annotated = results.render()[0]

    cv2.imshow("YOLO Vehicle Detection", annotated)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
