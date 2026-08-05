"""
Smart ASL – Flask Backend Server
Endpoints:
  GET /health  -> {"status": "ok"}
  GET /live    -> {"gesture": "...", "confidence": 0.xx}
  GET /video   -> MJPEG camera stream with hand landmarks
"""

import os
import threading
import json
import time
from collections import deque

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import cv2
import numpy as np
import h5py
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import mysql.connector
import bcrypt

import tensorflow as tf
from keras.models import load_model
from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
import mediapipe as mp

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "asl_model_pose.h5")
LABELS_PATH = os.path.join(BASE_DIR, "processed_data", "labels.json")

SEQ_LEN  = 13
IMG_SIZE = 224

# ── Flask ─────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Database ──────────────────────────────────────────────────────────────────
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="root",
            database="sign_language_app"
        )
        return conn
    except mysql.connector.Error as err:
        if err.errno == mysql.connector.errorcode.ER_BAD_DB_ERROR:
            # Database doesn't exist, try to create it
            conn_temp = mysql.connector.connect(host="localhost", user="root", password="root")
            cursor = conn_temp.cursor()
            cursor.execute("CREATE DATABASE sign_language_app")
            cursor.close()
            conn_temp.close()
            return get_db_connection()
        else:
            print(f"[DB] Error connecting to MySQL: {err}")
            return None

def init_db():
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        cursor.close()
        conn.close()
        print("[DB] Users table initialized successfully.")

init_db()

# ── Shared state ──────────────────────────────────────────────────────────────
state      = {"gesture": "", "confidence": 0.0, "frame": None}
state_lock = threading.Lock()

def load_asl_model(path):
    """Loads a Keras model with compatibility patching for Keras 3 models in Keras 2."""
    try:
        # Try standard loading first
        return load_model(path)
    except Exception as e:
        print(f"[ASL] Standard load_model failed ({e}), applying compatibility patch...")
        
    import h5py
    with h5py.File(path, "r") as f:
        cfg_raw = f.attrs.get("model_config")
        if not cfg_raw:
            raise ValueError("No model_config found in H5 file.")
        
        if isinstance(cfg_raw, bytes):
            cfg_raw = cfg_raw.decode("utf-8")
        cfg = json.loads(cfg_raw)

    def patch_node(node):
        if not isinstance(node, dict):
            if isinstance(node, list):
                return [patch_node(i) for i in node]
            return node
        
        # Remove Keras 3 specific fields that break Keras 2 deserialization
        node.pop("registered_name", None)
        node.pop("module", None)
        node.pop("build_config", None)

        cls = node.get("class_name")
        conf = node.get("config")

        if cls == "InputLayer" and conf and "batch_shape" in conf:
            conf["batch_input_shape"] = conf.pop("batch_shape")
        
        if cls == "DTypePolicy" and conf:
            return conf.get("name", "float32")

        for k, v in node.items():
            node[k] = patch_node(v)
        return node

    patched_cfg = patch_node(cfg)
    model = tf.keras.models.model_from_json(json.dumps(patched_cfg))
    model.load_weights(path)
    return model

print("[ASL] Loading model …")
try:
    asl_model = load_asl_model(MODEL_PATH)
    print("[ASL] Model loaded successfully.")
except Exception as e:
    print(f"[ASL] ERROR: Failed to load ASL model: {e}")
    asl_model = None

print("[ASL] Loading labels …")
with open(LABELS_PATH, "r") as f:
    label_map = json.load(f)
idx_to_label = {int(k): v for k, v in label_map.items()}
print(f"[ASL] {len(idx_to_label)} classes found.")

print("[ASL] Loading MobileNetV2 feature extractor …")
feature_extractor = MobileNetV2(weights="imagenet", include_top=False, pooling="avg")
print("[ASL] Feature extractor ready.")

# ── MediaPipe Hands ───────────────────────────────────────────────────────────
mp_hands       = mp.solutions.hands
mp_drawing     = mp.solutions.drawing_utils

hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.4,
)

# ── Camera thread ─────────────────────────────────────────────────────────────
def camera_loop():
    sequence = deque(maxlen=SEQ_LEN)
    pred_buf = deque(maxlen=5)

    print("[ASL] Opening Webcam...")
    cap = None
    # Try index 0 and 1, with and without CAP_DSHOW
    for idx in [0, 1]:
        print(f"[ASL] Trying camera index {idx}...")
        # On Windows, CAP_DSHOW often prevents hanging or slow initialization
        cap = cv2.VideoCapture(idx + cv2.CAP_DSHOW)
        if cap.isOpened():
            print(f"[ASL] Camera index {idx} opened with CAP_DSHOW.")
            break
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            print(f"[ASL] Camera index {idx} opened.")
            break
    
    if cap is None or not cap.isOpened():
        print("[ASL] ERROR: Cannot open any webcam.")
        return

    print(f"[ASL] Webcam active. Backend: {cap.getBackendName()}")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        frame = cv2.flip(frame, 1)
        clean_frame = frame.copy()
        rgb   = cv2.cvtColor(clean_frame, cv2.COLOR_BGR2RGB)
        res   = hands_detector.process(rgb)

        display_text = "Show your hand"

        if res.multi_hand_landmarks:
            h, w, _ = clean_frame.shape
            all_x = []
            all_y = []
            for hand_lm in res.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_lm, mp_hands.HAND_CONNECTIONS)
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
                hand_crop = clean_frame[min_y:max_y, min_x:max_x]
                img = cv2.resize(hand_crop, (IMG_SIZE, IMG_SIZE))
            else:
                img = cv2.resize(clean_frame, (IMG_SIZE, IMG_SIZE))

            img = preprocess_input(img.astype("float32"))
            img = np.expand_dims(img, axis=0)
            features = feature_extractor.predict(img, verbose=0)[0]
            sequence.append(features)

            if len(sequence) == SEQ_LEN and asl_model is not None:
                seq_in     = np.expand_dims(np.array(sequence), axis=0)
                preds      = asl_model.predict(seq_in, verbose=0)[0]
                top_idx    = int(np.argmax(preds))
                confidence = float(preds[top_idx])
                pred_buf.append(top_idx)

                final_idx    = max(set(pred_buf), key=pred_buf.count)
                gesture      = idx_to_label.get(final_idx, "unknown")
                display_text = f"{gesture.upper()}  ({confidence:.2f})"

                with state_lock:
                    state["gesture"]    = gesture
                    state["confidence"] = confidence
        else:
            sequence.clear()
            pred_buf.clear()
            with state_lock:
                state["gesture"]    = ""
                state["confidence"] = 0.0

        cv2.putText(frame, display_text, (15, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 230, 0), 2, cv2.LINE_AA)

        with state_lock:
            state["frame"] = frame.copy()


# ── MJPEG generator ───────────────────────────────────────────────────────────
def generate_frames():
    while True:
        with state_lock:
            frame = state["frame"]
        if frame is None:
            time.sleep(0.05)
            continue
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ok:
            continue
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
               + buf.tobytes() + b"\r\n")
        time.sleep(0.033)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok"})

@app.route("/live")
def live():
    with state_lock:
        g, c = state["gesture"], state["confidence"]
    return jsonify({"gesture": g, "confidence": c})

@app.route("/video")
def video():
    return Response(generate_frames(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"success": False, "message": "Username, email, and password are required"}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500
        
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, email, password) VALUES (%s, %s, %s)", (username, email, hashed.decode('utf-8')))
        conn.commit()
        return jsonify({"success": True, "message": "User created successfully"}), 201
    except mysql.connector.IntegrityError as e:
        err_msg = str(e).lower()
        if "username" in err_msg:
            return jsonify({"success": False, "message": "Username already exists"}), 409
        elif "email" in err_msg:
            return jsonify({"success": False, "message": "Email already exists"}), 409
        else:
            return jsonify({"success": False, "message": "User already exists"}), 409
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    identifier = data.get("identifier") # can be username or email
    password = data.get("password")

    if not identifier or not password:
        return jsonify({"success": False, "message": "Username/Email and password required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database connection error"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        # Check against both username and email
        cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", (identifier, identifier))
        user_record = cursor.fetchone()
        if user_record and bcrypt.checkpw(password.encode('utf-8'), user_record["password"].encode('utf-8')):
            return jsonify({
                "success": True, 
                "message": "Login successful", 
                "user": {
                    "id": user_record["id"], 
                    "username": user_record["username"],
                    "email": user_record["email"]
                }
            }), 200
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    identifier = data.get("identifier")
    new_password = data.get("new_password")

    if not identifier or not new_password:
        return jsonify({"success": False, "message": "Identifier and new password required"}), 400

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database error"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET password = %s WHERE username = %s OR email = %s", (hashed.decode('utf-8'), identifier, identifier))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({"success": True, "message": "Password updated successfully"}), 200
        else:
            return jsonify({"success": False, "message": "User not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/history", methods=["GET", "POST", "DELETE"])
def handle_history():
    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database error"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == "GET":
            user_id = request.args.get("user_id")
            if not user_id:
                return jsonify({"success": False, "message": "user_id required"}), 400
            
            cursor.execute("SELECT id, gesture, confidence, created_at as time FROM history WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
            history = cursor.fetchall()
            return jsonify({"success": True, "history": history}), 200

        elif request.method == "POST":
            data = request.json
            user_id = data.get("user_id")
            gesture = data.get("gesture")
            confidence = data.get("confidence")
            
            if not user_id or not gesture:
                return jsonify({"success": False, "message": "Missing fields"}), 400

            cursor.execute("INSERT INTO history (user_id, gesture, confidence) VALUES (%s, %s, %s)", (user_id, gesture, confidence))
            conn.commit()
            return jsonify({"success": True, "message": "History added", "id": cursor.lastrowid}), 201

        elif request.method == "DELETE":
            user_id = request.args.get("user_id")
            if not user_id:
                return jsonify({"success": False, "message": "user_id required"}), 400
                
            cursor.execute("DELETE FROM history WHERE user_id = %s", (user_id,))
            conn.commit()
            return jsonify({"success": True, "message": "History cleared"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "user_id required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"success": False, "message": "Database error"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        # Top signs
        cursor.execute("""
            SELECT gesture, COUNT(*) as count, AVG(confidence) as avg_conf
            FROM history WHERE user_id = %s
            GROUP BY gesture ORDER BY count DESC LIMIT 10
        """, (user_id,))
        top_signs = cursor.fetchall()

        # Daily activity — last 30 days
        cursor.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM history WHERE user_id = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at) ORDER BY day ASC
        """, (user_id,))
        daily = cursor.fetchall()
        daily_data = [{ "day": str(row["day"]), "count": row["count"] } for row in daily]

        # Accuracy trend — avg confidence per day
        cursor.execute("""
            SELECT DATE(created_at) as day, AVG(confidence) as avg_conf
            FROM history WHERE user_id = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at) ORDER BY day ASC
        """, (user_id,))
        accuracy = cursor.fetchall()
        accuracy_data = [{ "day": str(row["day"]), "avg_conf": round(float(row["avg_conf"]) * 100, 1) } for row in accuracy]

        return jsonify({
            "success": True,
            "top_signs": [{"gesture": r["gesture"], "count": r["count"], "avg_conf": round(float(r["avg_conf"]) * 100, 1)} for r in top_signs],
            "daily_activity": daily_data,
            "accuracy_trend": accuracy_data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    threading.Thread(target=camera_loop, daemon=True).start()
    print("\n[ASL] Backend running at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
