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