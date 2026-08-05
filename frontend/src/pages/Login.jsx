import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem("user", JSON.stringify(data.user));
                navigate("/dashboard");
            } else {
                setError(data.message || "Invalid credentials");
            }
        } catch (err) {
            setError("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
            <div className="card" style={{ padding: "40px", width: "100%", maxWidth: "420px", textAlign: "center" }}>
                <div style={{ marginBottom: "30px" }}>
                    <div className="nav-logo" style={{ margin: "0 auto 16px", width: "48px", height: "48px", fontSize: "24px" }}>👋</div>
                    <h1 className="page-headline" style={{ fontSize: "28px" }}>Welcome Back</h1>
                    <p className="page-sub">Sign in to your account</p>
                </div>

                {error && <div style={{ background: "rgba(244,63,94,0.1)", color: "var(--rose)", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", border: "1px solid rgba(244,63,94,0.3)" }}>{error}</div>}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Username or Email</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            style={{ width: "100%", padding: "14px", borderRadius: "10px", background: "var(--surf)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", fontSize: "15px", transition: "border 0.2s" }}
                            onFocus={e => e.target.style.borderColor = "var(--indigo)"}
                            onBlur={e => e.target.style.borderColor = "var(--border)"}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: "100%", padding: "14px", borderRadius: "10px", background: "var(--surf)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", fontSize: "15px", transition: "border 0.2s" }}
                            onFocus={e => e.target.style.borderColor = "var(--indigo)"}
                            onBlur={e => e.target.style.borderColor = "var(--border)"}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ marginTop: "10px", width: "100%", padding: "14px", borderRadius: "10px", background: "linear-gradient(135deg, var(--indigo), var(--cyan))", color: "white", border: "none", fontWeight: "700", fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "transform 0.2s", boxShadow: "var(--glow-ind)" }}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div style={{ marginTop: "20px" }}>
                    <Link to="/forgot-password" style={{ color: "var(--text2)", textDecoration: "none", fontSize: "13px", fontWeight: "500" }}>Forgot your password?</Link>
                </div>

                <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--text2)" }}>
                    Don't have an account? <Link to="/signup" style={{ color: "var(--cyan)", textDecoration: "none", fontWeight: "600" }}>Sign up here</Link>
                </div>
            </div>
        </div>
    );
}
