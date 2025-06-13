YOLOv5 and matplotlib are often more compatible with NumPy 1.x versions, not the newest NumPy 2.x.

pip uninstall numpy
pip install numpy==1.24.4

pip uninstall matplotlib
pip install matplotlib


current before downgrade
numpy 2.2.6

Use streamlink to convert youtube live stream to local for data consumption

streamlink https://youtu.be/BPNJQqkla08 best --player-external-http
get link then update it to NIC.py
keep running terminal

open another terminal and run 
python3 NIC.py






FOR YOVOL8

streamlink https://youtu.be/BPNJQqkla08 best --player-external-http --player-external-http-port 8080
streamlink https://www.youtube.com/watch?v=JDL-d-G--jk best --player-external-http --player-external-http-port 8080
seems the youtube live feed is down at times not good for demo purposes!
# Use the working version
python3 enhanced_nic_fixed.py

# OR the simple version
python3 NIC.py