import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useASL } from "../ASLContext";

export default function History() {
  const { history, clearHistory, connected } = useASL();
  const [q, setQ] = useState("");

  const filtered = history.filter(h =>
    h.gesture.toLowerCase().includes(q.toLowerCase())
  );

  const unique = [...new Set(history.map(h => h.gesture))].length;
  const avgConf = history.length
    ? (history.reduce((a, b) => a + b.confidence, 0) / history.length * 100).toFixed(1)
    : "—";

  /* ── CSV Export Logic ── */
  const exportCSV = () => {
    if (history.length === 0) return;

    const headers = ["ID", "Gesture", "Confidence", "Timestamp"];
    const rows = history.map(h => [
      h.id,
      h.gesture,
      (h.confidence * 100).toFixed(1) + "%",
      h.time.toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ASL_Session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar connected={connected} />
      <div className="page">
        <div className="page-header">
          <div className="page-eyebrow">session logistics</div>
          <h1 className="page-headline">History & Audit Log</h1>
          <p className="page-sub">Comprehensive record of all signs detected during this session.</p>
        </div>

        <div className="history-layout">
          <div className="history-panel">
            <div className="history-head">
              <input
                className="h-search"
                placeholder="Find gesture..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <div style={{ display: "flex", gap: 10 }}>
                {history.length > 0 && (
                  <>
                    <button className="clear-btn" onClick={exportCSV} style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                      📥 Export CSV
                    </button>
                    <button className="clear-btn" onClick={clearHistory}>✕ Clear All</button>
                  </>
                )}
              </div>
            </div>

            <div className="history-body">
              {filtered.length === 0 ? (
                <div className="history-empty">
                  <div className="history-empty-icon">📂</div>
                  <div>No entries found.</div>
                </div>
              ) : filtered.map((h, i) => (
                <div className="h-item" key={h.id}>
                  <span className="h-num">#{filtered.length - i}</span>
                  <span className="h-badge">{h.gesture}</span>
                  <span className="h-conf">{(h.confidence * 100).toFixed(0)}%</span>
                  <span className="h-time">
                    {h.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="history-sidebar">
            <div className="side-tile">
              <div className="side-title">Session Summary</div>
              <div className="mini-row"><span>Log Entries</span><span>{history.length}</span></div>
              <div className="mini-row"><span>Unique Gestures</span><span>{unique}</span></div>
              <div className="mini-row"><span>Reliability</span><span>{avgConf}%</span></div>
            </div>

            <div className="side-tile">
              <div className="side-title">Data Policy</div>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
                All session data is stored in volatile memory and is purged upon browser refresh. Use the <strong>Export CSV</strong> button to save your results permanently.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
