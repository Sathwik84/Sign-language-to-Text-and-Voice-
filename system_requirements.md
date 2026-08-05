# Smart ASL — System Requirements

This document outlines the necessary hardware and software environments to run the Smart ASL Project.

## Software Requirements

### Backend (Python)
- **Python Version**: 3.9 or 3.10 (3.11+ may have compatibility issues with older TensorFlow versions).
- **Core Dependencies**:
  - `flask`: Web server framework.
  - `flask-cors`: Cross-Origin Resource Sharing.
  - `tensorflow`: For running the ASL BiLSTM model.
  - `mediapipe`: For hand landmark detection.
  - `opencv-python`: For camera capture and image processing.
  - `numpy`: Numerical processing.
  - `h5py`: For model weight loading.

### Frontend (React + Vite)
- **Node.js**: Version 18 or 20 (LTS).
- **Package Manager**: `npm` or `yarn`.
- **Core Dependencies**:
  - `react`, `react-router-dom`: Frontend framework and routing.
  - `chart.js`: For performance analytics visualization.
  - `vite`: Fast build tool and dev server.

## Hardware Requirements
- **Camera**: Standard HD Webcam (720p or 1080p).
- **GPU (Optional)**: NVIDIA GPU with CUDA support for faster inference (though CPU-only also works for real-time at ~1s latency).
- **Memory**: Minimum 8GB RAM.

## Setup Instructions

### Backend Setup
1. Navigate to `Smart_ASL_Project/`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate it: `venv\Scripts\activate`.
4. Install dependencies: `pip install -r requirements.txt`.
5. Run the server: `python app.py`.

### Frontend Setup
1. Navigate to `frontend/`.
2. Install packages: `npm install`.
3. Run the dev server: `npm run dev`.
4. Open `http://localhost:5173` in your browser.
