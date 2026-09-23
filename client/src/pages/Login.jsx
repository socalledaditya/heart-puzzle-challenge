// Login.jsx
import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { api, errMsg } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/login", f);
      signIn(data);
      nav("/");
    } catch (ex) {
      if (ex.response?.data?.code === "UNVERIFIED")
        return nav("/verify", {
          state: { email: f.email.trim().toLowerCase() },
        });
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <main className="auth-card">
        <div className="auth-header">
          {/* Custom Heart Puzzle Logo SVG */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            <path d="M12 5.67V21.23"></path>
            <path d="M4.22 13.45l7.78-7.78"></path>
          </svg>
          <h1>
            Heart
            <br />
            Puzzle
            <br />
            Challenge.
          </h1>
        </div>

        <form onSubmit={submit}>
          <label>
            Email
            <div className="input-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                type="email"
                required
                autoComplete="email"
                className="with-icon"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
          </label>
          <label>
            Password
            <div className="input-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="with-icon"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
            </div>
          </label>

          {err && <p className="error">{err}</p>}
          <button className="btn auth-btn" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="muted auth-footer">
          New here? <Link to="/register">Register.</Link>
        </p>
      </main>
    </div>
  );
}
