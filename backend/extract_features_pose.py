import os
import json
import cv2
import numpy as np
import mediapipe as mp
from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from keras.models import Model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset", "preprocessing", "train", "frames")
OUTPUT_DIR = os.path.join(BASE_DIR, "processed_data")
SEQ_LEN = 13
IMG_SIZE = 224

os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------
# MediaPipe Hands Detector for Hand Gating
# --------------------------
mp_hands = mp.solutions.hands
hands_detector = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    min_detection_confidence=0.3
)

# --------------------------
# MobileNet Feature Extractor
# --------------------------
base_model = MobileNetV2(weights="imagenet", include_top=False, pooling="avg")
model = Model(inputs=base_model.input, outputs=base_model.output)

X = []
y = []

labels = sorted(os.listdir(DATASET_DIR))
label_map = {label: i for i, label in enumerate(labels)}

# Save labels.json to keep frontend/backend alignment
label_dict_save = {str(i): label for label, i in label_map.items()}
with open(os.path.join(OUTPUT_DIR, "labels.json"), "w") as f:
    json.dump(label_dict_save, f)

print(f"Total words found in {DATASET_DIR}: {len(labels)}")

# --------------------------
# Hand Gating Helper
# --------------------------
def crop_hand(img):
    h, w, _ = img.shape
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = hands_detector.process(rgb)
    if res.multi_hand_landmarks:
        all_x = []
        all_y = []
        for hand_lm in res.multi_hand_landmarks:
            for lm in hand_lm.landmark:
                all_x.append(lm.x * w)
                all_y.append(lm.y * h)
        
        box_w = max(all_x) - min(all_x) + 1
        box_h = max(all_y) - min(all_y) + 1
        pad_x = int(box_w * 0.25)
        pad_y = int(box_h * 0.25)

        min_x = max(0, int(min(all_x) - pad_x))
        max_x = min(w, int(max(all_x) + pad_x))
        min_y = max(0, int(min(all_y) - pad_y))
        max_y = min(h, int(max(all_y) + pad_y))

        if (max_x - min_x) > 10 and (max_y - min_y) > 10:
            hand_crop = img[min_y:max_y, min_x:max_x]
            return cv2.resize(hand_crop, (IMG_SIZE, IMG_SIZE))
    
    return cv2.resize(img, (IMG_SIZE, IMG_SIZE))

# --------------------------
# Augmentation functions
# --------------------------
def add_noise(img):
    noise = np.random.normal(0, 8, img.shape)
    img = img + noise
    return np.clip(img, 0, 255)

def zoom(img, scale=1.1):
    h, w = img.shape[:2]
    nh, nw = int(h/scale), int(w/scale)
    y1 = (h - nh)//2
    x1 = (w - nw)//2
    crop = img[y1:y1+nh, x1:x1+nw]
    return cv2.resize(crop, (w, h))

# --------------------------
# Extraction
# --------------------------
for idx, label in enumerate(labels):
    label_path = os.path.join(DATASET_DIR, label)
    if not os.path.isdir(label_path):
        continue

    print(f"[{idx+1}/{len(labels)}] Processing label: {label}")
    video_folders = os.listdir(label_path)

    for video in video_folders:
        video_path = os.path.join(label_path, video)
        if not os.path.isdir(video_path):
            continue

        frames = sorted(os.listdir(video_path))
        sequence = []

        for frame_file in frames[:SEQ_LEN]:
            frame_path = os.path.join(video_path, frame_file)
            img = cv2.imread(frame_path)
            if img is None:
                continue

            # Apply hand-gated cropping
            cropped_img = crop_hand(img)
            sequence.append(cropped_img)

        if len(sequence) != SEQ_LEN:
            continue

        # Create augmented versions
        sequences_aug = []
        sequences_aug.append(sequence)                             # Original
        sequences_aug.append([cv2.flip(img, 1) for img in sequence]) # Flip
        sequences_aug.append([add_noise(img) for img in sequence]) # Noise
        sequences_aug.append([zoom(img) for img in sequence])      # Zoom

        # Extract features for each version
        for seq in sequences_aug:
            seq = np.array(seq).astype("float32")
            seq = preprocess_input(seq)
            features = model.predict(seq, verbose=0)

            X.append(features)
            y.append(label_map[label])

# Save features
X = np.array(X)
y = np.array(y)

np.save(os.path.join(OUTPUT_DIR, "X_pose_seq.npy"), X)
np.save(os.path.join(OUTPUT_DIR, "y_pose_seq.npy"), y)

print("\nExtraction completed successfully!")
print("Final Features Shape:", X.shape)
print("Total Samples:", len(X))
print("Total Classes:", len(label_map))
