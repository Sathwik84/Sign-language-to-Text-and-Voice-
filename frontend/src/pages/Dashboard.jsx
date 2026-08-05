import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useASL } from "../ASLContext";

const BACKEND = "";

/* ─── TTS voices hook ─────────────────────────────────────── */
function useTTSVoices() {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);
  return voices;
}

const KNOWN_FEMALE = /\b(female|woman|zira|hazel|susan|cortana|samantha|karen|moira|tessa|veena|fiona|nicky|amelie|ioana|luciana|mariska|milena|joana|lisa|linda|jenny|aria|julia|natasha|emma|olivia|victoria|eva|ava|allison|kate|alice|alva|anna|carmit|damayanti|ellen|kathy|kyoko|laura|lekha|magnolia|meijia|melina|montserrat|nora|paulina|petra|sinji|tamar|yelda|yuna|zosia|zuzana|heera|raveena)\b/i;
const KNOWN_MALE = /\b(male|man|david|mark|george|james|daniel|diego|jorge|thomas|alex|fred|bruce|richard|carlos|juan|henrik|luca|maged|felix|andres|dzmitry|prabhat|hiroshi|otoya|takumi|sin-ji|rishi|fred|albert|junior|eddy|ralph|reed|zarvox)\b/i;

function classifyVoice(v) {
  const text = (v.name + " " + v.voiceURI).toLowerCase();
  if (KNOWN_FEMALE.test(text)) return "female";
  if (KNOWN_MALE.test(text)) return "male";
  return text.includes("female") ? "female" : "male";
}

/* ─── Keyboard Shortcut Hint Chip ────────────────────────── */
function KbdHint({ keys, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--surf)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {keys.map(k => (
          <kbd key={k} style={{ padding: "2px 8px", borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--indigo-l)", fontWeight: 600, boxShadow: "0 2px 0 rgba(99,102,241,0.3)" }}>
            {k}
          </kbd>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const {
    gesture, confidence, connected, history
  } = useASL();

  const allVoices = useTTSVoices();
  const englishVoices = allVoices.filter(v => v.lang.startsWith("en"));
  const femaleVoices = englishVoices.filter(v => classifyVoice(v) === "female");
  const maleVoices = englishVoices.filter(v => classifyVoice(v) === "male");

  const [gender, setGender] = useState("female");
  const [fIdx, setFIdx] = useState(0);
  const [mIdx, setMIdx] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastSpoken = useRef("");

  // ── Recording state ──────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Shortcut hint visibility ─────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutToast, setShortcutToast] = useState("");

  const pool = gender === "female" ? femaleVoices : maleVoices;
  const idx = gender === "female" ? fIdx : mIdx;
  const setIdx = gender === "female" ? setFIdx : setMIdx;
  const selectedVoice = pool[idx] || null;

  // Keep a ref so speak() always reads the latest voice without stale closure
  const voiceRef = useRef(null);
  useEffect(() => { voiceRef.current = selectedVoice; }, [selectedVoice]);
  const rateRef = useRef(rate);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  const pitchRef = useRef(pitch);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  const speak = useCallback((text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rateRef.current;
    utt.pitch = pitchRef.current;
    utt.voice = voiceRef.current;
    utt.lang = voiceRef.current?.lang || "en-US";
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);

  // Auto-speak
  useEffect(() => {
    if (!gesture || gesture === lastSpoken.current) return;
    if (autoSpeak) {
      lastSpoken.current = gesture;
      speak(gesture);
    }
  }, [gesture, autoSpeak, speak]);

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt || gesture);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const showToast = (msg) => {
    setShortcutToast(msg);
    setTimeout(() => setShortcutToast(""), 1800);
  };

  // ── Stream Recording ─────────────────────────────────────
  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      // Capture the video stream from the img element via canvas
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mr.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ASL_Session_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
      showToast("🔴 Recording started");
    } catch (err) {
      alert("Camera access required for recording.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
    showToast("✅ Recording saved");
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Keyboard Shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Don't fire when user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (gesture) { speak(gesture); showToast("⌨️ Space → Speak sign"); }
          break;
        case "KeyC":
          if (gesture) { handleCopy(gesture); showToast("⌨️ C → Copied!"); }
          break;
        case "KeyA":
          setAutoSpeak(p => { showToast(`⌨️ A → Auto-TTS ${!p ? "ON" : "OFF"}`); return !p; });
          break;
        case "KeyR":
          recording ? stopRecording() : startRecording();
          showToast(`⌨️ R → ${recording ? "Stop" : "Start"} recording`);
          break;
        case "Slash":
          if (e.shiftKey) { setShowShortcuts(p => !p); }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gesture, speak, recording]);

  const recent = history.slice(0, 6);

  return (
    <>
      <Navbar connected={connected} />

      {/* Shortcut Toast */}
      {shortcutToast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "rgba(10,15,30,0.95)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "var(--indigo-l)", boxShadow: "var(--glow-ind)", backdropFilter: "blur(12px)", pointerEvents: "none", animation: "slide-up 0.2s ease" }}>
          {shortcutToast}
        </div>
      )}

      <div className="page" style={{ paddingBottom: 12 }}>

        {/* ROW 1: Camera + Recognition Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="cam-card" style={{ height: 480, borderRadius: 24 }}>
            <div className="cam-corner tl" /><div className="cam-corner tr" />
            <div className="cam-corner bl" /><div className="cam-corner br" />
            <div className="cam-hud-top">
              <span className="cam-label">CAM_01 / REALTIME_INFERENCE</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {recording && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "rgba(255,68,68,0.12)", padding: "3px 9px", borderRadius: 4, border: "1px solid rgba(255,68,68,0.25)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4444", display: "inline-block", animation: "pulse-anim 1s ease infinite" }} />
                    REC {formatTime(recordingTime)}
                  </span>
                )}
                <span className="cam-rec"><span className="cam-rec-dot" />LIVE</span>
              </div>
            </div>
            <img src={`${BACKEND}/video`} alt="Live Camera" className="cam-feed" />
            <div className="cam-hud-bottom">
              <div className="cam-gesture-hud">{gesture ? gesture.toUpperCase() : "AWAITING…"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <div className="cam-conf-hud">
                  <div className="cam-conf-label">Confidence</div>
                  <div className="cam-conf-value">{(confidence * 100).toFixed(0)}%</div>
                </div>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${recording ? "rgba(255,68,68,0.4)" : "rgba(99,102,241,0.4)"}`, background: recording ? "rgba(255,68,68,0.15)" : "rgba(99,102,241,0.15)", color: recording ? "#ff6b6b" : "var(--indigo-l)", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1, transition: "all 0.2s" }}
                >
                  {recording ? `⏹ STOP (${formatTime(recordingTime)})` : "⏺ RECORD"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="result-card" style={{ flex: 1, padding: 30 }}>
              <div className="result-label">AI RECOGNITION</div>
              <div className="gesture-big" style={{ fontSize: 64, marginBottom: 20 }}>
                {gesture ? gesture.toUpperCase() : <span className="gesture-placeholder">Hold Still…</span>}
              </div>
              <div className="conf-section" style={{ marginBottom: 20 }}>
                <div className="conf-row">
                  <span className="conf-label">Confidence Score</span>
                  <span className="conf-pct">{(confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="conf-bar">
                  <div className="conf-fill" style={{ width: `${confidence * 100}%` }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="speak-btn" style={{ flex: 1 }} onClick={() => speak(gesture)} disabled={!gesture}>
                  {speaking ? "🔊 Speaking…" : "▶ Text to Speech"}
                </button>
                <button
                  onClick={() => handleCopy(gesture)}
                  disabled={!gesture}
                  title="Copy (C)"
                  style={{ padding: "13px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: copied ? "rgba(16,185,129,0.1)" : "var(--surf)", color: copied ? "var(--emerald)" : "var(--text2)", cursor: "pointer", fontSize: 16, transition: "all 0.2s" }}
                >
                  {copied ? "✓" : "📋"}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "14px 20px", borderRadius: 14, background: "var(--surf)", border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>🤖 Auto-TTS</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>Speak signs instantly</div>
                </div>
                <button onClick={() => setAutoSpeak(p => !p)} style={{ width: 50, height: 26, borderRadius: 99, border: "none", background: autoSpeak ? "var(--indigo)" : "var(--surf2)", cursor: "pointer", position: "relative" }}>
                  <span style={{ position: "absolute", top: 3, left: autoSpeak ? 27 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.3s" }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Voice Controls + Recent */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="result-label">🎙️ Audio Controls</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {["female", "male"].map(v => (
                  <button key={v} onClick={() => setGender(v)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${gender === v ? "var(--indigo)" : "var(--border)"}`, background: gender === v ? "rgba(99,102,241,0.1)" : "var(--surf)", color: gender === v ? "var(--indigo-l)" : "var(--text2)", fontWeight: 700, cursor: "pointer" }}>
                    {v === "female" ? "👩 Female" : "👨 Male"}
                  </button>
                ))}
              </div>
            </div>
            {pool.length > 0 && (
              <div className="themed-select-wrap" style={{ marginBottom: 16 }}>
                <select value={idx} onChange={e => setIdx(+e.target.value)}>
                  {pool.map((v, i) => <option key={i} value={i}>{v.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", marginBottom: 8 }}>SPEED</div>
                <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={e => setRate(+e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", marginBottom: 8 }}>PITCH</div>
                <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={e => setPitch(+e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="result-label">Recent Session History</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recent.length === 0 ? (
                <div style={{ color: "var(--text3)", padding: 40, textAlign: "center" }}>Waiting for movement...</div>
              ) : recent.map(h => (
                <div className="recent-item" key={h.id} style={{ padding: "8px 12px" }}>
                  <span className="recent-badge">{h.gesture}</span>
                  <span className="recent-time" style={{ marginLeft: "auto" }}>{h.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: Keyboard Shortcuts Panel */}
        <div className="card" style={{ padding: 24 }}>
          <div className="result-label" style={{ cursor: "pointer" }} onClick={() => setShowShortcuts(p => !p)}>
            ⌨️ Keyboard Shortcuts
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
              {showShortcuts ? "▲ Hide" : "▼ Show"}
            </span>
          </div>
          {showShortcuts && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 8 }}>
              <KbdHint keys={["Space"]} label="Speak current sign" />
              <KbdHint keys={["C"]} label="Copy sign to clipboard" />
              <KbdHint keys={["A"]} label="Toggle Auto-TTS" />
              <KbdHint keys={["R"]} label="Start / Stop recording" />
              <KbdHint keys={["Shift", "?"]} label="Toggle shortcut panel" />
            </div>
          )}
        </div>

      </div>
      <Footer />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}
