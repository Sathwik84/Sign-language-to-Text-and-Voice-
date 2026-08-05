import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { path: "/dashboard", label: "Dashboard", icon: "⬡" },
  { path: "/analytics", label: "Analytics", icon: "◈" },
  { path: "/history", label: "History", icon: "≡" },
];

/* ── Inline SVG logo — no external dependency ─────────────── */
function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#lg1)" opacity="0.15" />
      <rect width="36" height="36" rx="10" fill="none" stroke="url(#lg1)" strokeWidth="1.2" opacity="0.6" />
      <g filter="url(#glow)" fill="url(#lg1)">
        <rect x="12" y="18" width="12" height="10" rx="3" />
        <rect x="8" y="20" width="5" height="4" rx="2" />
        <rect x="13" y="10" width="4" height="10" rx="2" />
        <rect x="23" y="12" width="4" height="8" rx="2" />
      </g>
      <circle cx="18" cy="18" r="15" fill="none" stroke="url(#lg1)" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
    </svg>
  );
}

export default function Navbar({ connected }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (p) =>
    location.pathname === p || (p === "/dashboard" && location.pathname === "/");

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => navigate("/")}>
        <Logo />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span className="nav-title">Smart ASL</span>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--text3)", letterSpacing: "2px", textTransform: "uppercase" }}>
            Sign Language To Text and Voice
          </span>
        </div>
      </div>

      <div className="nav-links">
        {LINKS.map(({ path, label, icon }) => (
          <button
            key={path}
            className={`nav-link ${isActive(path) ? "active" : ""}`}
            onClick={() => navigate(path)}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="nav-right">
        {user && (
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, marginRight: 4 }}>
            👤 {user.username}
          </span>
        )}
        <div className={`live-pill ${connected === false ? "offline" : ""}`}>
          <span className="pulse" />
          {connected === false ? "OFFLINE" : "LIVE"}
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            border: "1px solid rgba(244,63,94,0.3)",
            background: "rgba(244,63,94,0.08)",
            color: "#f43f5e",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.18)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(244,63,94,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          ⏻ Logout
        </button>
      </div>
    </nav>
  );
}
