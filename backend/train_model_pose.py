import os
import json
import numpy as np
import tensorflow as tf
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout, BatchNormalization, Input, Bidirectional
from keras.callbacks import ReduceLROnPlateau, EarlyStopping
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "processed_data")
DATASET_FRAMES_DIR = os.path.join(BASE_DIR, "dataset", "preprocessing", "train", "frames")

# ----------------------------
# Load extracted features
# ----------------------------
X = np.load(os.path.join(DATA_DIR, "X_pose_seq.npy"))
y = np.load(os.path.join(DATA_DIR, "y_pose_seq.npy"))

print("Data shape:", X.shape)
print("Labels shape:", y.shape)

num_classes = len(np.unique(y))
print("Total classes:", num_classes)

# ----------------------------
# Train / Validation split
# ----------------------------
X_train, X_val, y_train, y_val = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ----------------------------
# Build BiLSTM Model (matching IEEE Paper Specification)
# Input shape = (13 frames, 1280 features)
# ----------------------------
model = Sequential([
    Input(shape=(X.shape[1], X.shape[2])),

    Bidirectional(LSTM(256, return_sequences=True)),
    BatchNormalization(),
    Dropout(0.4),

    Bidirectional(LSTM(128)),
    BatchNormalization(),
    Dropout(0.4),

    Dense(128, activation="relu"),
    Dropout(0.4),

    Dense(num_classes, activation="softmax")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ----------------------------
# Callbacks
# ----------------------------
lr_scheduler = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=3,
    verbose=1
)

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=8,
    restore_best_weights=True
)

# ----------------------------
# Train
# ----------------------------
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=80,
    batch_size=32,
    callbacks=[lr_scheduler, early_stop]
)

# ----------------------------
# Save Model
# ----------------------------
os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)

# Save to both paths to ensure Flask app.py and scripts load updated model
model_path_main = os.path.join(BASE_DIR, "asl_model_pose.h5")
model_path_backup = os.path.join(BASE_DIR, "models", "asl_model_pose.h5")
model_path_lstm = os.path.join(BASE_DIR, "models", "model_pose_lstm.h5")

model.save(model_path_main)
model.save(model_path_backup)
model.save(model_path_lstm)

print(f"[ASL] Model saved to {model_path_main}")
print(f"[ASL] Model saved to {model_path_backup}")

# Save training history (used by evaluate_model.py)
np.save(os.path.join(BASE_DIR, "history_log.npy"), history.history)
print("[INFO] Training history saved to history_log.npy")

print("\nTraining completed successfully!")
