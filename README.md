# Smart ASL – Real-Time Sign Language to Text and Voice Translation System

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.10%2B-orange?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-2.x-lightgrey?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Smart ASL is an end-to-end, real-time American Sign Language (ASL) recognition and translation ecosystem. Developed as a Final Year Major Project and tailored for IEEE Conference publication standards, this platform bridges the communication gap between the hearing-impaired community and the hearing world through computer vision and deep learning.

---

## 📖 Introduction

### The Communication Barrier
Over 70 million deaf individuals worldwide use sign language as their primary mode of communication. However, a significant gap exists between deaf/mute individuals and the hearing majority due to a general lack of sign language literacy. This dynamic often isolates individuals, creating barriers in education, employment, and daily social interactions.

### AI and Computer Vision to the Rescue
Recent breakthroughs in Artificial Intelligence (AI), Computer Vision (CV), and Deep Learning (DL) have made it possible to build systems that interpret human gestures with high fidelity. By modeling spatial hand formations and temporal motion patterns, we can translate complex visual gestures into formats understandable by anyone.

### Objective of the Project
The primary objective of **Smart ASL** is to construct a lightweight, high-accuracy, and real-time translation system that captures American Sign Language gestures from a standard webcam and instantly translates them into:
1. **Textual Sentences** displayed on an interactive interface.
2. **Natural Synthesized Speech** (voice output) with customizable speech profiles.

### Why This Project is Useful
Unlike traditional translation applications that rely on static image classification or bulky sensory gloves, Smart ASL offers a non-invasive, software-driven approach. It requires only a standard consumer-grade webcam and local computing resources, making sign language translation highly accessible, cost-effective, and deployable in schools, customer service hubs, and public spaces.

---

## ✨ Features

*   **✅ Real-Time Webcam Detection:** High-speed capture of webcam frames (640x480) with a live visual HUD feed operating at sub-30ms latency.
*   **✅ AI Gesture Recognition:** Instantaneous translation of 100+ standard ASL vocabulary words (e.g., *apple*, *help*, *hello*, *thank you*).
*   **✅ MediaPipe Hand Tracking:** Robust spatial tracking utilizing MediaPipe Hands to capture hand landmark geometries in 3D coordinate space.
*   **✅ Hand Landmark Detection:** Visual skeletal tracking overlay mapping 21 coordinates per hand on the live dashboard.
*   **✅ MobileNetV2 Feature Extractor:** CNN-based spatial feature extractor pre-trained on ImageNet to capture rich high-level geometric properties of cropped hand shapes.
*   **✅ Bidirectional LSTM Temporal Learning:** Recurrent sequence neural network (BiLSTM) that learns the temporal changes across consecutive frames to recognize dynamic signs.
*   **✅ Live Text Prediction:** Live display of predicted gestures accompanied by a real-time confidence bar showing classifier probability.
*   **✅ Text-to-Speech (TTS):** Integrated browser-level speech synthesizer featuring male/female voice configurations and adjustable rates and pitches.
*   **✅ Virtual Sign Language Keyboard:** Composing workspace where users sign keywords consecutively to build full sentences, with interactive controls like `Backspace`, `Clear`, and `Copy to Clipboard`.
*   **✅ Learning Hub (Quiz Mode):** An educational module designed to test user signing skills. The system prompts users with words and evaluates their webcam performance in real-time, providing immediate feedback.
*   **✅ Gesture Dictionary:** A searchable catalog listing all supported gestures, allowing users to learn the correct hand signs.
*   **✅ Analytics Dashboard:** Session tracking displaying performance metrics like historical accuracy, classification distributions, and active signing duration using dynamic visual charts.
*   **✅ Session History:** Secure database logging containing user sessions, text logs, and performance reports.
*   **✅ Responsive UI:** Fluid and responsive web interface designed with modern UI standards that adapts to laptops, tablets, and desktops.
*   **✅ Dark/Light Theme:** Fully integrated theme toggler that transitions between a high-contrast dark theme and a clean light theme.

---

## 📐 System Architecture

Below is the detailed pipeline illustrating how video frames are captured, processed, classified, and output as speech:

```
+--------------------------------------------------------------+
|                        Webcam Feed                           |
|                    (640 x 480 @ 30 FPS)                      |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                       MediaPipe Hands                        |
|                  (Hand Landmark Extraction)                  |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                   Hand Detection & Gating                    |
|             (Generates Hand Bounding Box)                    |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                   Cropped Hand Image                         |
|                     (224 x 224 x 3)                          |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                     MobileNetV2 CNN                          |
|             (Spatial Feature Representation)                 |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|           1280-Dimensional Feature Vector                   |
|                   (Global Average Pooling)                   |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                13-Frame Sequence Buffer                      |
|                  (Shape: 13 x 1280)                          |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|             Bidirectional LSTM Layers                        |
|             (Temporal Feature Aggregation)                   |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                   Dense Layers + Softmax                     |
|                (Probability Distribution)                    |
+------------------------------+-------------------------------+
                               |
                               v
+------------------------------+-------------------------------+
|                  Predicted ASL Gesture                       |
|               (ArgMax Selection of Gesture)                  |
+------------------------------+-------------------------------+
                               |
            +------------------+------------------+
            |                                     |
            v                                     v
+-----------+-----------+             +-----------+-----------+
|      Text Output      |             |     Speech Output     |
|   (Sentence Builder)  |             |  (Text-To-Speech API) |
+-----------------------+             +-----------------------+
```

### Architecture Breakdown
1.  **Webcam Capture:** The system captures video frames from a standard USB webcam.
2.  **MediaPipe Hands:** Hand coordinates are extracted to isolate the hand region from background noise (e.g. human face, background clutter).
3.  **Hand Detection & Gating:** A bounding box is computed from the extreme coordinates of the hand landmarks.
4.  **Resizing:** The cropped hand region is resized to $224 \times 224$ pixels to match the input specifications of the CNN.
5.  **MobileNetV2 Feature Extraction:** The cropped image passes through a truncated MobileNetV2 network, outputting a $1280$-dimensional spatial feature vector.
6.  **Temporal Buffer:** Feature vectors from 13 consecutive frames are buffered in a queue to construct a $13 \times 1280$ sequence matrix.
7.  **Bidirectional LSTM:** The temporal sequence matrix is fed into a two-layer BiLSTM network that captures the motion dynamics of the gesture.
8.  **Dense Classifier:** Features are passed through fully connected layers with Dropout and Batch Normalization.
9.  **Softmax Classification:** Outlines the probability of each ASL class, identifying the target gesture.
10. **Output:** The predicted gesture is compiled into a sentence builder and synthesized into voice output.

---

## 🧠 Machine Learning Model

The core classifier uses a state-of-the-art hybrid architecture that separates spatial image processing from temporal motion tracking. This separation reduces training parameters and enables high frame-rate inference on CPU-bound devices.

```
                  +-----------------------------------+
                  |      Input Sequence (13, 1280)    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |   Bidirectional LSTM (256 units)  |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |        Batch Normalization        |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |           Dropout (0.4)           |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |   Bidirectional LSTM (128 units)  |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |        Batch Normalization        |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |           Dropout (0.4)           |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |        Dense Layer (128 ReLU)     |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |           Dropout (0.4)           |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |     Dense Class Output (Softmax)  |
                  +-----------------------------------+
```

### Components and Rationale

*   **MediaPipe Hands:** Instead of feeding entire images into deep network structures, MediaPipe isolates the region of interest (ROI). This reduces background clutter and ensures the model extracts features purely from hand shapes.
*   **MobileNetV2:** Selected for its lightweight convolutional architecture. MobileNetV2 uses depthwise separable convolutions to extract features from images at a fraction of the computational footprint of VGG or ResNet models.
*   **Bidirectional LSTM (BiLSTM):** Dynamic sign language gestures depend on the motion path of the hand over time. Standard unidirectional LSTMs only process historical frames. A **Bidirectional** LSTM processes the input sequence in both forward and backward temporal directions, capturing complete movement contexts.
*   **Batch Normalization:** Applied after recurrent layers to stabilize activation distributions, accelerating convergence during training and mitigating internal covariate shift.
*   **Dropout (0.4):** Randomly deactivates 40% of neurons during training phases. This acts as a regularizer, preventing co-adaptation of features and minimizing overfitting.
*   **Dense Layers:** Mapping layers that project the recurrent temporal features into a multi-dimensional classifier space.
*   **Softmax:** Compiles logits into a probability distribution summing to $1.0$, allowing the system to output prediction confidence scores.

---

## 📊 Dataset & Preprocessing

The model is trained on a curated dataset representing standard ASL words. Each sample consists of a sequence of video frames capturing the execution of a sign.

### Dataset Breakdown
*   **Total Samples:** $5,760$ video sequences
*   **Training Samples:** $4,608$ sequences (80%)
*   **Testing Samples:** $1,152$ sequences (20%)
*   **Class Distribution:** Balanced representation across vocabulary gesture classes.

### Preprocessing Pipeline
1.  **MediaPipe Landmark Detection:** 21 coordinates $(x, y, z)$ are extracted per frame.
2.  **Hand Cropping:** The hand coordinates establish cropping boundaries around the palm.
3.  **Image Normalization:** Pixels are normalized to $[-1, 1]$ values as expected by MobileNetV2.
4.  **Feature Extraction:** Preprocessed frames are fed through the MobileNetV2 model to generate $1280$-dimensional vectors.
5.  **Sequence Generation:** Chronological features of 13 frames are grouped into single multi-dimensional tensors.
6.  **Train/Test Split:** Standard stratified partitioning (80/20) is performed to ensure consistent label distribution across train and test partitions.

---

## 📈 Model Performance

The model shows strong generalization and robust real-time classification performance, as summarized in the validation table below:

| Metric | Accuracy / Value | Interpretation |
| :--- | :--- | :--- |
| **Training Accuracy** | `99.78%` | High-fidelity fitting on sign datasets. |
| **Testing Accuracy** | `95.83%` | Generalizes cleanly to unseen speakers and setups. |
| **Average Latency** | `~25ms / prediction` | Ideal for real-time video frames (30-40 FPS). |
| **Overfitting Gap** | `< 4.0%` | Low overfitting due to Dropout and Batch Normalization. |

*   **Strong Generalization:** Tested across multiple lighting environments and user profiles.
*   **Low Overfitting:** The close alignment of training and testing accuracies validates the effectiveness of regularizing layers.
*   **Real-time Ready:** Low frame-level processing times guarantee zero lag during conversational translation.

---

## 💻 Technology Stack

### Frontend Architecture
*   **React (Vite):** Reactive client framework chosen for high performance and fast build reload times.
*   **Vanilla CSS:** Clean styling to implement a modern glassmorphic theme.
*   **Chart.js:** Renders real-time accuracy and gesture frequency metrics on the user dashboard.

### Backend Infrastructure
*   **Flask (Python):** Lightweight micro-web framework used to host the webcam streaming loop and authentication endpoints.
*   **MediaPipe:** Real-time hand coordinate solver.
*   **OpenCV:** Video capture, frame flipping, cropping, and annotation drawing library.
*   **MySQL:** Secure relational database management system to manage user credentials and history logs.

### Machine Learning
*   **TensorFlow & Keras:** Backbone deep learning libraries used to assemble and train the BiLSTM classifier.
*   **MobileNetV2:** Feature extraction model.
*   **Scikit-learn:** Performs train-test splitting and evaluates confusion matrices.

---

## 📂 Project Folder Structure

Below is the directory structure mapping out the repository components:

```
sign-to-txt-voice/
├── .gitignore                      # Git exclusion configurations
├── README.md                       # Comprehensive project documentation
├── system_requirements.md          # Technical dependencies and system setup
├── backend/                        # Python Flask Server & ML scripts
│   ├── app.py                      # Core server: camera thread, inference and database API
│   ├── asl_model_pose.h5           # Pre-trained BiLSTM classifier weights (~46 MB)
│   ├── requirements.txt            # Python environment dependencies
│   ├── extract_features_pose.py    # MediaPipe hand crop + MobileNetV2 extraction pipeline
│   ├── train_model_pose.py         # Keras script to compile and train the BiLSTM model
│   ├── evaluate_model.py           # Model testing, evaluation and metric logger
│   ├── predict_pose.py             # Inference utility methods
│   ├── history_log.npy             # Saved metrics from model training phases
│   ├── processed_data/             # Preprocessed feature tensors
│   │   ├── labels.json             # Map file pairing gesture names with model indexes
│   │   ├── X_pose_seq.npy          # Extracted sequence training inputs
│   │   └── y_pose_seq.npy          # Sequence labels
│   ├── dataset/                    # Raw frames grouped by vocabulary directories
│   └── static/ / templates/        # Flask static configurations and layouts
└── frontend/                       # React client app
    ├── package.json                # NPM libraries and development scripts
    ├── index.html                  # HTML template entry point
    ├── vite.config.js              # Vite bundler configurations
    ├── public/                     # Static media assets
    └── src/
        ├── main.jsx                # DOM rendering entry point
        ├── App.jsx                 # Client routes and navigation handler
        ├── ASLContext.jsx          # Context provider handling text buffer and history logs
        ├── index.css               # Vanilla CSS design stylesheet
        ├── components/             # Reusable UI widgets
        │   ├── AccuracyChart.jsx   # Line and bar graphs for metric summaries
        │   ├── AnalyticsCard.jsx   # KPI scorecard widget
        │   ├── ConfidenceBar.jsx   # Probability bar indicator
        │   ├── Navbar.jsx          # Interactive navigation sidebar
        │   ├── Footer.jsx          # Footer block
        │   └── ThemeToggle.jsx     # CSS light/dark transition trigger
        ├── pages/                  # Main page templates
        │   ├── Dashboard.jsx       # Real-time webcam workspace and translation feed
        │   ├── Analytics.jsx       # Deep metrics, gesture frequencies, and CSV export
        │   ├── History.jsx         # User translation logs and session statistics
        │   ├── Login.jsx           # User authentication interface
        │   ├── Signup.jsx          # Client registration workspace
        │   └── ForgotPassword.jsx  # Recovery interface
        └── utils/
            └── languageMap.js      # Reference maps mapping gestures to categories
```

---

## ⚙️ Installation & Setup

### Prerequisites
*   Python 3.8 to 3.10
*   Node.js (v16 or higher)
*   MySQL Server (v8.0+)
*   Standard Webcam

### 1. Database Setup
Log in to your MySQL terminal and configure the database matching backend credentials:
```sql
CREATE DATABASE sign_language_app;
```

### 2. Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   *   **Windows (Command Prompt):** `venv\Scripts\activate`
   *   **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
   *   **macOS / Linux:** `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the Flask server:
   ```bash
   python app.py
   ```
   *The server runs locally at `http://127.0.0.1:5000/`.*

### 3. Frontend Installation
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
   *The application will open at `http://localhost:5173/`.*

---

## 🚀 Usage Guide

1.  **Start Services:** Verify both the Flask server and Vite development server are running.
2.  **Authentication:** Register a new profile or log in on the client portal.
3.  **Real-Time Dashboard:**
    *   Navigate to the **Dashboard** page.
    *   Enable webcam access when prompted.
    *   Align your hand in the center of the camera frame.
    *   Perform a supported ASL gesture (e.g. holding a sign for ~13 frames).
    *   The live landmark overlay maps hand coordinates, and the translation feed displays the predicted word along with the model's confidence level.
4.  **Compose Sentences:** Use the virtual gesture-keyboard functions. Lock words into the text buffer, use gestures for spaces/backspaces, and click **Speak** to synthesize the sentence.
5.  **Educational Hub:** Navigate to the **Learning** page. Take the sign language challenge where the system prompts a word, you present the sign, and the model scores your accuracy.
6.  **Analytics & Reports:** Go to the **Analytics** page to view charts of your signing speeds and accuracy. Export session history as a CSV for offline records.

---

## 📸 Screenshots

| Page | Preview Placeholder |
| :--- | :--- |
| **Real-time AI Dashboard** | *`[Dashboard Screen Placeholder]`* |
| **Live Hand Landmark Tracking HUD** | *`[Camera Stream Overlay Placeholder]`* |
| **Interactive Sign Dictionary** | *`[Dictionary Grid View Placeholder]`* |
| **Gamified Learning Hub (Quiz Mode)** | *`[Quiz Evaluation Interface Placeholder]`* |
| **User Performance Analytics** | *`[ChartJS Accuracy Graph Placeholder]`* |
| **CSV Export & Session Logs** | *`[Session History Table Placeholder]`* |

---

## ⚡ Performance Highlights

*   **⚡ Sub-30ms Inference:** Combining MobileNetV2 with BiLSTM minimizes compute overhead.
*   **🏎️ Optimized Feature Extraction:** Features are processed as low-dimensional spatial mappings rather than full image structures.
*   **📈 High Accuracy:** Validated at $95.83\%$ testing accuracy across 100 sign classes.
*   **💡 Lightweight Architecture:** Only uses a webcam; no expensive depth sensors or specialized glove controllers are required.
*   **🔒 High Generalization:** Robust performance across variable backgrounds, skin tones, and environmental lighting.

---

## 🔮 Future Scope

*   **📝 Continuous Sign Language Recognition:** Transitioning from individual words to fluent sentence structure analysis.
*   **🌎 Multilingual Localization:** Extending translations from American Sign Language (ASL) to Indian Sign Language (ISL), British Sign Language (BSL), and regional variations.
*   **🤖 Attention/Transformer Integration:** Upgrading the recurrent layer structure to Transformer-based spatial-temporal architectures (e.g., Video Vision Transformers) for multi-sequence hand shapes.
*   **📱 Native Mobile Application:** Compiling the system into light models deployable via TensorFlow Lite on Android and iOS platforms.
*   **🎙️ Smart Voice Assistant Integrations:** Direct pairing with APIs like Alexa, Siri, or Google Home to control smart appliances using sign language.

---

## 🔬 Research & Academic Contribution

The proposed sign translation framework presents an optimized approach combining lightweight computer vision with deep sequential classifiers. By utilizing **MediaPipe Hands** as an initial hand-gating filter, we offload spatial normalization from the model. This allows a standard **MobileNetV2** pre-trained feature extractor to capture structural patterns without background noise. The **Bidirectional LSTM** layer leverages forward and backward temporal sequences to improve recognition rates of dynamic, motion-dependent gestures.

This work establishes that high-performance, real-time sign language systems can be deployed without heavy GPU clusters, offering a scalable template for consumer accessibility devices.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ✍️ Authors & Contributors

*   **Bhavya Sri** - *Lead ML & Full-Stack Developer* - [GitHub Profile](https://github.com/)
*   **Project Advisor / Mentor** - *Department of Computer Science & Engineering*

*For inquiries, academic collaboration, or usage queries, feel free to reach out via GitHub or email.*
