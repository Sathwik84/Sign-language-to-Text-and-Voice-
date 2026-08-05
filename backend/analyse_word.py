import numpy as np
import json
from keras.models import load_model
from sklearn.metrics import accuracy_score, classification_report

# Paths
MODEL_PATH = "asl_model_pose.h5"
X_PATH = "processed_data/X_pose_seq.npy"
Y_PATH = "processed_data/y_pose_seq.npy"
LABELS_PATH = "processed_data/labels.json"

# Load data
X = np.load(X_PATH)
y_true = np.load(Y_PATH)

# Load labels
with open(LABELS_PATH, "r") as f:
    label_map = json.load(f)

idx_to_label = {int(k): v for k, v in label_map.items()}

# Load model
model = load_model(MODEL_PATH)

# Predict
y_probs = model.predict(X, verbose=0)
y_pred = np.argmax(y_probs, axis=1)

# Top-1 Accuracy
top1 = accuracy_score(y_true, y_pred)
print("\nTop-1 Accuracy:", top1)

# Top-3 Accuracy
top3 = np.mean([
    y_true[i] in np.argsort(y_probs[i])[-3:]
    for i in range(len(y_true))
])
print("Top-3 Accuracy:", top3)

# Classification report (per word)
labels = [idx_to_label[i] for i in range(len(idx_to_label))]
print("\nPer-word performance:")
print(classification_report(y_true, y_pred, target_names=labels))
