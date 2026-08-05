import mediapipe as mp

import cv2
import numpy as np
import os
import json
from collections import deque

from keras.models import load_model
from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input

# =====================
# Settings
# =====================
MODEL_PATH = "asl_model_pose.h5"
LABELS_PATH = "processed_data/labels.json"
SEQ_LEN = 13
IMG_SIZE = 224


# =====================
# Load Model
# =====================
print("Loading model...")
model = load_model(MODEL_PATH)


# =====================
# Load Labels
# =====================
print("Loading labels...")

with open(LABELS_PATH, "r") as f:
    label_map = json.load(f)

# labels.json format: {0: "apple", 1: "boy", ...}
idx_to_label = {int(k): v for k, v in label_map.items()}

print("Total classes:", len(idx_to_label))


# =====================
# MobileNet Feature Extractor
# =====================
print("Loading MobileNet...")
feature_extractor = MobileNetV2(
    weights="imagenet",
    include_top=False,
    pooling="avg"
)


# =====================
# MediaPipe Hands (to avoid face predictions)
# =====================
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.4
)


# =====================
# Buffers
# =====================
sequence = deque(maxlen=SEQ_LEN)
pred_buffer = deque(maxlen=5)   # for stable prediction


# =====================
# Webcam
# =====================
cap = cv2.VideoCapture(0)
print("Camera started. Press Q to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    # ---------------------
    # Hand Detection
    # ---------------------
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb)

    display_text = "Show hand"

    if results.multi_hand_landmarks:

        # Draw hand
        for hand_landmarks in results.multi_hand_landmarks:
            mp.solutions.drawing_utils.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS
            )

        # ---------------------
        # Feature Extraction
        # ---------------------
        img = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
        img = preprocess_input(img)
        img = np.expand_dims(img, axis=0)

        features = feature_extractor.predict(img, verbose=0)[0]
        sequence.append(features)

        # ---------------------
        # Prediction when sequence ready
        # ---------------------
        if len(sequence) == SEQ_LEN:
            seq_input = np.expand_dims(sequence, axis=0)

            preds = model.predict(seq_input, verbose=0)[0]
            top_idx = np.argmax(preds)
            confidence = preds[top_idx]

            pred_buffer.append(top_idx)

            # Majority voting for stability
            final_idx = max(set(pred_buffer), key=pred_buffer.count)
            word = idx_to_label[final_idx]

            display_text = f"{word} ({confidence:.2f})"

    else:
        sequence.clear()
        pred_buffer.clear()

    # ---------------------
    # Display
    # ---------------------
    cv2.putText(
        frame,
        display_text,
        (20, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.imshow("ASL Prediction", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


cap.release()
cv2.destroyAllWindows()
