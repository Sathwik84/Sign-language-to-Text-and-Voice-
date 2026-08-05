import { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useASL } from "../ASLContext";
import {
  Chart as ChartJS, LineElement, BarElement, CategoryScale,
  LinearScale, PointElement, Tooltip, Filler, ArcElement, Legend
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler, ArcElement, Legend);

const PALETTE = ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#3b82f6", "#ec4899", "#14b8a6", "#84cc16"];

const chartOpts = (yMax = 1, yLabel = "") => ({
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: "#0a0f1e", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "rgba(99,102,241,0.3)", borderWidth: 1, padding: 10 }
  },
  scales: {
    x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#475569", font: { size: 11, family: "'JetBrains Mono'" } } },
    y: { min: 0, max: yMax, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#475569", font: { size: 11, family: "'JetBrains Mono'" }, callback: (v) => yLabel ? `${v}${yLabel}` : v } }
  }
});

/* ── No heatmap component needed ────────────────────────── */

export default function Analytics() {
  const { connected, history } = useASL();
  const [confHistory, setConfHistory] = useState([0.61, 0.69, 0.74, 0.80, 0.85, 0.88, 0.91]);
  const [showCount, setShowCount] = useState(7);

  // DB-backed analytics state
  const [dbTopSigns, setDbTopSigns] = useState([]);
  const [accuracyTrend, setAccuracyTrend] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [uniqueSigns, setUniqueSigns] = useState(0);
  const [totalFromDb, setTotalFromDb] = useState(0);

  /* Load DB analytics */
  useEffect(() => {
    const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
    if (!user?.id) return;
    setLoadingAnalytics(true);
    fetch(`http://localhost:5000/api/analytics?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDbTopSigns(data.top_signs || []);
          setAccuracyTrend(data.accuracy_trend || []);
          setUniqueSigns(data.top_signs?.length || 0);
          setTotalFromDb(data.top_signs?.reduce((a, b) => a + b.count, 0) || 0);
        }
      })
      .catch(() => { })
      .finally(() => setLoadingAnalytics(false));
  }, []);

  /* Live confidence polling */
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/live");
        const j = await r.json();
        if (j.confidence > 0)
          setConfHistory(p => [...p.slice(-11), +j.confidence.toFixed(2)]);
      } catch { }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  /* Use DB top signs if available, else compute from session */
  const topGestures = useMemo(() => {
    if (dbTopSigns.length > 0) return dbTopSigns.map(s => ({ name: s.gesture, count: s.count }));
    if (history.length === 0) return [];
    const counts = {};
    history.forEach(h => { counts[h.gesture] = (counts[h.gesture] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [dbTopSigns, history]);

  const maxCount = topGestures[0]?.count || 1;
  const maxSlider = Math.max(topGestures.length, 3);
  const visible = topGestures.slice(0, Math.min(showCount, topGestures.length));

  const avgConf = confHistory.length
    ? (confHistory.reduce((a, b) => a + b, 0) / confHistory.length * 100).toFixed(0)
    : 0;

  /* Chart data */
  const liveLineData = {
    labels: confHistory.map((_, i) => `t${i + 1}`),
    datasets: [{ data: confHistory, borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", tension: 0.45, fill: true, pointRadius: 3, pointBackgroundColor: "#6366f1", pointBorderColor: "#050814", pointBorderWidth: 2 }]
  };

  const accuracyLineData = {
    labels: accuracyTrend.map(d => d.day.slice(5)),
    datasets: [{ data: accuracyTrend.map(d => d.avg_conf), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.08)", tension: 0.45, fill: true, pointRadius: 4, pointBackgroundColor: "#10b981", pointBorderColor: "#050814", pointBorderWidth: 2 }]
  };

  const topSignsBarData = {
    labels: topGestures.slice(0, 10).map(g => g.name),
    datasets: [{ data: topGestures.slice(0, 10).map(g => g.count), backgroundColor: PALETTE.map(c => c + "aa"), borderColor: PALETTE, borderWidth: 1, borderRadius: 6 }]
  };

  const doughnutData = {
    labels: topGestures.slice(0, 6).map(g => g.name),
    datasets: [{ data: topGestures.slice(0, 6).map(g => g.count), backgroundColor: PALETTE.slice(0, 6).map(c => c + "cc"), borderColor: PALETTE.slice(0, 6), borderWidth: 2 }]
  };

  const STATS = [
    { icon: "🤟", label: "Total Detected", value: totalFromDb || history.length || 0, delta: "All-time signs", color: "#6366f1", iconBg: "rgba(99,102,241,0.12)", tile: "linear-gradient(90deg,#6366f1,#818cf8)" },
    { icon: "🎯", label: "Avg Confidence", value: `${avgConf}%`, delta: "Live confidence avg", color: "#10b981", iconBg: "rgba(16,185,129,0.12)", tile: "linear-gradient(90deg,#10b981,#34d399)" },
    { icon: "🔠", label: "Unique Signs", value: uniqueSigns || [...new Set(history.map(h => h.gesture))].length, delta: "Distinct gestures", color: "#f59e0b", iconBg: "rgba(245,158,11,0.12)", tile: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
    { icon: "📡", label: "Model Status", value: "ONLINE", delta: "100 ASL classes", color: "#22d3ee", iconBg: "rgba(34,211,238,0.12)", tile: "linear-gradient(90deg,#22d3ee,#67e8f9)" },
  ];

  return (
    <>
      <Navbar connected={connected} />
      <div className="page">
        <div className="page-header">
          <div className="page-eyebrow">PERFORMANCE METRICS</div>
          <h1 className="page-headline">Analytics Overview</h1>
          <p className="page-sub">Your ASL recognition stats — powered by real session data</p>
        </div>

        {/* ── Stat Tiles ─────────────────────────────────────────── */}
        <div className="stat-row">
          {STATS.map((s, i) => (
            <div className="stat-tile" key={i} style={{ "--tile-accent": s.tile, "--icon-bg": s.iconBg }}>
              <div className="tile-icon">{s.icon}</div>
              <div className="tile-label">{s.label}</div>
              <div className="tile-value" style={{ color: s.color }}>{s.value}</div>
              <div className="tile-delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Live Confidence + Accuracy Trend ───────────── */}
        <div className="charts-grid" style={{ marginBottom: 14 }}>
          <div className="chart-card">
            <div className="chart-title">Live Confidence Trend</div>
            <div className="chart-sub">Recognition confidence — updates every 2 seconds</div>
            <Line data={liveLineData} options={chartOpts(1, "")} />
          </div>

          <div className="chart-card">
            <div className="chart-title">Accuracy Trend (14 days)</div>
            <div className="chart-sub">{accuracyTrend.length > 0 ? "Average daily confidence from your history" : "Sign more to see your accuracy over time"}</div>
            {accuracyTrend.length > 1
              ? <Line data={accuracyLineData} options={chartOpts(100, "%")} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "var(--text3)", fontSize: 13 }}>No data yet — start signing!</div>
            }
          </div>
        </div>

        {/* ── Row 2: Top Signs Bar + Doughnut ──────────────────── */}
        <div className="charts-grid" style={{ marginBottom: 14 }}>
          <div className="chart-card">
            <div className="chart-title">Top 10 Signs – Bar Chart</div>
            <div className="chart-sub">{dbTopSigns.length > 0 ? "All-time from your history" : "Session data (login to persist)"}</div>
            {topGestures.length > 0
              ? <Bar data={topSignsBarData} options={chartOpts(maxCount + 2)} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "var(--text3)", fontSize: 13 }}>No signs detected yet</div>
            }
          </div>

          <div className="chart-card">
            <div className="chart-title">Sign Distribution</div>
            <div className="chart-sub">Top 6 signs as a proportion of total</div>
            {topGestures.length > 0
              ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                  <div style={{ width: 200, height: 200 }}>
                    <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0a0f1e", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "rgba(99,102,241,0.3)", borderWidth: 1 } } }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {topGestures.slice(0, 6).map((g, i) => (
                      <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i] }} />
                        <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "'JetBrains Mono',monospace" }}>{g.name}</span>
                        <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: "auto" }}>{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "var(--text3)", fontSize: 13 }}>No signs detected yet</div>
            }
          </div>
        </div>

        {/* ── Row 3: Custom Top Signs Slider ───────────────────── */}
        {topGestures.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="chart-card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
                <div>
                  <div className="chart-title">Top Signs Log</div>
                  <div className="chart-sub">{dbTopSigns.length > 0 ? "All-time from your session history" : "Session data"}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--indigo-l)", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                  {Math.min(showCount, topGestures.length)}/{topGestures.length}
                </span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                  <span>Fewer</span><span style={{ color: "var(--text2)" }}>Drag to show more</span><span>More</span>
                </div>
                <input type="range" min={Math.min(3, topGestures.length)} max={maxSlider} step={1} value={showCount} onChange={e => setShowCount(+e.target.value)} />
              </div>
              <div className="freq-list">
                {visible.map((g, i) => (
                  <div className="freq-item" key={g.name}>
                    <span className="freq-name" style={{ color: PALETTE[i % PALETTE.length] }}>{g.name}</span>
                    <div className="freq-track">
                      <div className="freq-fill" style={{ width: `${(g.count / maxCount) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </div>
                    <span className="freq-count">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Row 5: Model Architecture ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { icon: "🧠", title: "Model Architecture", color: "var(--indigo-l)", body: "Bidirectional LSTM trained on 13-frame sliding window pose sequences. Captures both forward and backward temporal patterns for accurate word-level ASL classification.", chips: ["BiLSTM", "13 frames", "100 classes", "Keras"] },
            { icon: "👁️", title: "How It Works", color: "var(--cyan)", body: "MediaPipe detects hand landmarks per frame → MobileNetV2 extracts 1280-dim CNN features → BiLSTM classifies over the sequence window → Top prediction returned via REST API.", chips: ["MediaPipe", "MobileNetV2", "1280-dim", "REST API"] },
            { icon: "⚙️", title: "System Pipeline", color: "#10b981", body: "Webcam → OpenCV capture → feature extraction → LSTM inference → Flask serves /live + /video endpoints → Vite proxy → React frontend. End-to-end latency under 1 second.", chips: ["OpenCV", "Flask 3", "Vite Proxy", "React"] },
          ].map(card => (
            <div key={card.title} className="chart-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: card.color, marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 12 }}>{card.body}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {card.chips.map(c => (
                  <span key={c} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "var(--surf)", border: "1px solid var(--border)", color: "var(--text2)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.5px", textTransform: "uppercase" }}>{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
      <Footer />
    </>
  );
}
