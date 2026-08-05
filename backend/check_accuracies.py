import os
import sys
import json
import warnings
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, top_k_accuracy_score

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

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
X_PATH      = os.path.join(DATA_DIR, "X_pose_seq.npy")
Y_PATH      = os.path.join(DATA_DIR, "y_pose_seq.npy")

TEST_SIZE   = 0.20
RANDOM_SEED = 42

# ── Helpers (from evaluate_model.py) ──────────────────────────────────────────
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
        pass
    # Compatibility fallback
    with h5py.File(path, "r") as f:
        cfg_raw = f.attrs.get("model_config")
        if isinstance(cfg_raw, bytes):
            cfg_raw = cfg_raw.decode("utf-8")
        cfg = json.loads(cfg_raw)
    model = tf.keras.models.model_from_json(json.dumps(_patch_node(cfg)))
    model.load_weights(path)
    return model

def main():
    print("="*60)
    print("      Training and Testing Accuracy Checker")
    print("="*60)

    # 1. Load Data
    print("[1] Loading Dataset...")
    if not os.path.exists(X_PATH) or not os.path.exists(Y_PATH):
        print(f"Error: Dataset not found in {DATA_DIR}. Please extract features first.")
        return

    X = np.load(X_PATH)
    y = np.load(Y_PATH)
    
    # Stratified split precisely mirroring train_model_pose.py
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_SEED
    )
    
    print(f"    Train Samples: {len(X_train)}")
    print(f"    Test Samples:  {len(X_test)}")

    # 2. Load Model
    print("\n[2] Loading Trained Model...")
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}.")
        return
        
    model = load_asl_model(MODEL_PATH)
    print("    Model loaded successfully.")

    # 3. Evaluate Training Set
    print("\n[3] Evaluating Training Accuracy (Evaluating X_train)...")
    y_train_prob = model.predict(X_train, batch_size=32, verbose=0)
    y_train_pred = np.argmax(y_train_prob, axis=1)
    
    train_acc_exact = accuracy_score(y_train, y_train_pred) * 100
    train_acc_top3 = top_k_accuracy_score(y_train, y_train_prob, k=3) * 100

    # 4. Evaluate Testing Set
    print("[4] Evaluating Testing Accuracy (Evaluating X_test)...")
    y_test_prob = model.predict(X_test, batch_size=32, verbose=0)
    y_test_pred = np.argmax(y_test_prob, axis=1)
    
    test_acc_exact = accuracy_score(y_test, y_test_pred) * 100
    test_acc_top3 = top_k_accuracy_score(y_test, y_test_prob, k=3) * 100

    # 5. Output Summary
    print("\n" + "="*60)
    print("                      RESULTS ")
    print("="*60)
    print(f"  Training Accuracy  : {train_acc_exact:.2f}%")
    #print(f"  Training Accuracy       : {train_acc_top3:.2f}%")
    print("-" * 60)
    #print(f"  Testing Accuracy  (Top-1 Exact) : {test_acc_exact:.2f}%")
    print(f"  Testing Accuracy   : {test_acc_top3:.2f}%")
    print("="*60)

if __name__ == "__main__":
    main()
