import os
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout, BatchNormalization, Input
from keras.callbacks import ReduceLROnPlateau, EarlyStopping

DATA_DIR = "processed_data"

# Load data
X = np.load(os.path.join(DATA_DIR, "X_pose_seq.npy"))
y = np.load(os.path.join(DATA_DIR, "y_pose_seq.npy"))

print("Data shape:", X.shape)
print("Labels shape:", y.shape)

num_classes = len(np.unique(y))
print("Total classes:", num_classes)

# -------- Normalize features (VERY IMPORTANT) --------
samples, timesteps, features = X.shape
X = X.reshape(samples, -1)

scaler = StandardScaler()
X = scaler.fit_transform(X)

X = X.reshape(samples, timesteps, features)

# -------- Train/Validation split --------
X_train, X_val, y_train, y_val = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

# -------- Class weights (important for small data) --------
class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(y_train),
    y=y_train
)

class_weights = dict(enumerate(class_weights))

# -------- Smaller model (prevents overfitting) --------
model = Sequential([
    Input(shape=(13, 1280)),

    LSTM(128, return_sequences=True),
    BatchNormalization(),
    Dropout(0.5),

    LSTM(64),
    BatchNormalization(),
    Dropout(0.5),

    Dense(64, activation="relu"),
    Dropout(0.5),

    Dense(num_classes, activation="softmax")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# -------- Callbacks --------
lr_scheduler = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=5,
    min_lr=1e-5
)

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=10,
    restore_best_weights=True
)

# -------- Train --------
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=60,
    batch_size=32,
    class_weight=class_weights,
    callbacks=[lr_scheduler, early_stop]
)

# Save model
model.save("asl_pose_lstm.keras")

print("\nTraining completed and model saved!")
