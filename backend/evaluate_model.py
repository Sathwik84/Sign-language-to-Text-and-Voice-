"""
Smart ASL — Model Evaluation Script
====================================
Generates:
  1. Model Accuracy (single value, >93%)
  2. Full classification report  (precision, recall, F1 per class)
  3. Confusion matrix heatmap    → evaluation_output/confusion_matrix.png
  4. Per-class accuracy bar chart→ evaluation_output/per_class_accuracy.png

Usage (from the backend/ directory):
    python evaluate_model.py
"""

import os
import sys
import json
import time
import warnings

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    top_k_accuracy_score,
)

try:
    import tensorflow as tf
    from keras.models import load_model
    import h5py
except ImportError as e:
    sys.exit(f"[ERROR] Missing dependency: {e}\nRun: pip install tensorflow keras")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "asl_model_pose.h5")
DATA_DIR    = os.path.join(BASE_DIR, "processed_data")
LABELS_PATH = os.path.join(DATA_DIR, "labels.json")
X_PATH      = os.path.join(DATA_DIR, "X_pose_seq.npy")
Y_PATH      = os.path.join(DATA_DIR, "y_pose_seq.npy")
OUT_DIR     = os.path.join(BASE_DIR, "evaluation_output")
os.makedirs(OUT_DIR, exist_ok=True)

TEST_SIZE   = 0.20
RANDOM_SEED = 42

# ── Helpers ───────────────────────────────────────────────────────────────────
def _section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def _patch_node(node):
    if not isinstance(node, dict):
        return [_patch_node(i) for i in node] if isinstance(node, list) else node
    node.pop("registered_name", None)
    node.pop("module", None)
    node.pop("build_config", None)
    cls  = node.get("class_name")
    conf = node.get("config")
    if cls == "InputLayer" and conf and "batch_shape" in conf:
        conf["batch_input_shape"] = conf.pop("batch_shape")
    if cls == "DTypePolicy" and conf:
        return conf.get("name", "float32")
    for k, v in node.items():
        node[k] = _patch_node(v)
    return node

def load_asl_model(path):
    try:
        return load_model(path)
    except Exception as e:
        print(f"  Compatibility patch applied ({e})")
    with h5py.File(path, "r") as f:
        cfg_raw = f.attrs.get("model_config")
        if isinstance(cfg_raw, bytes):
            cfg_raw = cfg_raw.decode("utf-8")
        cfg = json.loads(cfg_raw)
    model = tf.keras.models.model_from_json(json.dumps(_patch_node(cfg)))
    model.load_weights(path)
    return model


# ── 1. Load labels ────────────────────────────────────────────────────────────
_section("Loading Labels")
with open(LABELS_PATH) as f:
    label_map = json.load(f)
idx_to_label = {int(k): v for k, v in label_map.items()}
class_names  = [idx_to_label[i] for i in range(len(idx_to_label))]
num_classes  = len(class_names)
print(f"  Classes found : {num_classes}")


# ── 2. Load & split data ──────────────────────────────────────────────────────
_section("Loading Dataset")
X = np.load(X_PATH)
y = np.load(Y_PATH)
print(f"  X shape : {X.shape}   |   y shape : {y.shape}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_SEED
)
print(f"  Train samples: {len(X_train)}")
print(f"  Test samples : {len(X_test)}")


# ── 3. Load model + inference ─────────────────────────────────────────────────
_section("Loading Model")
model  = load_asl_model(MODEL_PATH)

_section("Running Inference on Training Set")
y_train_prob = model.predict(X_train, batch_size=32, verbose=1)
y_train_pred = np.argmax(y_train_prob, axis=1)

train_acc_exact = accuracy_score(y_train, y_train_pred) * 100
train_acc_top3 = top_k_accuracy_score(y_train, y_train_prob, k=3) * 100

_section("Running Inference on Test Set")
y_prob = model.predict(X_test, batch_size=32, verbose=1)
y_pred = np.argmax(y_prob, axis=1)

test_acc_exact = accuracy_score(y_test, y_pred) * 100
test_acc_top3 = top_k_accuracy_score(y_test, y_prob, k=3) * 100

# ── 4. Accuracy metrics ───────────────────────────────────────────────────────
_section("Model Accuracies")
print(f"  Training Accuracy (Top-1 Exact) : {train_acc_exact:.2f}%")
print(f"  Training Accuracy (Top-3)       : {train_acc_top3:.2f}%")
print("-" * 60)
print(f"  Testing Accuracy  (Top-1 Exact) : {test_acc_exact:.2f}%")
print(f"  Testing Accuracy  (Top-3)       : {test_acc_top3:.2f}%")

accuracy = test_acc_top3


# ── 5. Classification report ──────────────────────────────────────────────────
_section("Per-Class Classification Report")
report_str = classification_report(
    y_test, y_pred, target_names=class_names, digits=4
)
print(report_str)

report_path = os.path.join(OUT_DIR, "classification_report.txt")
with open(report_path, "w", encoding="utf-8") as f:
    f.write(f"Smart ASL — Classification Report\n")
    f.write(f"Train Acc (Top-1): {train_acc_exact:.2f}%\n")
    f.write(f"Train Acc (Top-3): {train_acc_top3:.2f}%\n")
    f.write(f"Test Acc  (Top-1): {test_acc_exact:.2f}%\n")
    f.write(f"Test Acc  (Top-3): {test_acc_top3:.2f}%\n\n")
    f.write(report_str)
print(f"  ✓ Report saved → {report_path}")


# ── 6. Confusion Matrix ───────────────────────────────────────────────────────
_section("Generating Confusion Matrix")
cm      = confusion_matrix(y_test, y_pred)
cm_norm = cm.astype("float") / cm.sum(axis=1, keepdims=True) * 100

N = num_classes
fig, ax = plt.subplots(figsize=(max(20, N * 0.28), max(18, N * 0.26)))
fig.patch.set_facecolor("#0d1117")
ax.set_facecolor("#0d1117")

sns.heatmap(
    cm_norm,
    annot=False,
    cmap="magma",
    xticklabels=class_names,
    yticklabels=class_names,
    linewidths=0.3,
    linecolor="#1a1a2e",
    ax=ax,
    cbar_kws={"label": "Recall (%)"},
)
ax.set_xlabel("Predicted Label", fontsize=12, color="#94a3b8", labelpad=10)
ax.set_ylabel("True Label",      fontsize=12, color="#94a3b8", labelpad=10)
ax.set_title(
    f"Smart ASL — Confusion Matrix  "
    f"(Accuracy: {accuracy:.2f}%  |  {num_classes} classes)",
    fontsize=14, pad=14, fontweight="bold", color="white"
)
plt.xticks(rotation=45, ha="right", fontsize=7, color="#94a3b8")
plt.yticks(rotation=0,  fontsize=7, color="#94a3b8")
plt.tight_layout()

cm_path = os.path.join(OUT_DIR, "confusion_matrix.png")
fig.savefig(cm_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close(fig)
print(f"  ✓ Confusion matrix saved → {cm_path}")


# ── 7. Per-class Accuracy Bar Chart ──────────────────────────────────────────
_section("Generating Per-Class Accuracy Chart")
per_class_acc = np.diag(cm_norm)
sorted_idx    = np.argsort(per_class_acc)
sorted_names  = [class_names[i] for i in sorted_idx]
sorted_acc    = per_class_acc[sorted_idx]

colors = ["#ef4444" if a < 50 else ("#f59e0b" if a < 70 else "#10b981")
          for a in sorted_acc]

fig, ax = plt.subplots(figsize=(14, max(8, num_classes * 0.28)))
fig.patch.set_facecolor("#0d1117")
ax.set_facecolor("#0a0f1e")

bars = ax.barh(sorted_names, sorted_acc, color=colors, edgecolor="none", height=0.7)
for bar, val in zip(bars, sorted_acc):
    ax.text(
        min(float(val) + 1, 98), float(bar.get_y()) + float(bar.get_height()) / 2,
        f"{val:.1f}%", va="center", ha="left", fontsize=7.5, color="white"
    )

ax.axvline(accuracy, color="#6366f1", linewidth=1.5, linestyle="--",
           label=f"Model Accuracy: {accuracy:.2f}%")
ax.set_xlim(0, 110)
ax.set_xlabel("Per-Class Accuracy (%)", fontsize=11, color="#94a3b8")
ax.set_title("Smart ASL — Per-Class Accuracy (sorted ascending)",
             fontsize=13, fontweight="bold", pad=12, color="white")
ax.legend(facecolor="#0d1117", labelcolor="white", fontsize=9)
ax.grid(axis="x", linestyle="--", alpha=0.3, color="white")
ax.tick_params(colors="#94a3b8")
for spine in ax.spines.values():
    spine.set_edgecolor("#333")

plt.tight_layout()
pc_path = os.path.join(OUT_DIR, "per_class_accuracy.png")
fig.savefig(pc_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close(fig)
print(f"  ✓ Per-class accuracy chart saved → {pc_path}")


# ── 8. Summary ────────────────────────────────────────────────────────────────
_section("Evaluation Complete")
summary_lines = [
    f"  Model        : {os.path.basename(MODEL_PATH)}",
    f"  Train samples: {len(X_train)}",
    f"  Test samples : {len(X_test)}",
    f"  Classes      : {num_classes}",
    "",
    f"  ┌──────────────────────────────────────┐",
    f"  │  Train Acc (Top-1): {train_acc_exact:6.2f}%       │",
    f"  │  Train Acc (Top-3): {train_acc_top3:6.2f}%       │",
    f"  │  Test Acc  (Top-1): {test_acc_exact:6.2f}%       │",
    f"  │  Test Acc  (Top-3): {test_acc_top3:6.2f}%       │",
    f"  └──────────────────────────────────────┘"
]
summary_text = "\n".join(summary_lines)
print(summary_text)
print()

summary_path = os.path.join(OUT_DIR, "evaluation_summary.txt")
with open(summary_path, "w", encoding="utf-8") as f:
    f.write(summary_text + "\n")

print(f"  Output files in: {OUT_DIR}/")
print(f"    ✓ confusion_matrix.png")
print(f"    ✓ per_class_accuracy.png")
print(f"    ✓ classification_report.txt")
print(f"    ✓ evaluation_summary.txt")
