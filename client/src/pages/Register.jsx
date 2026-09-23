// Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errMsg } from "../api";

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "",
    email: "",
    rollNo: "",
    password: "",
    eventCode: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/register", f);
      nav("/verify", { state: { email: data.email, devOtp: data.devOtp } });
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <main className="auth-card">
        <h2>
          Register for
          <br />
          the competition
        </h2>

        <form onSubmit={submit}>
          {/* Using placeholders to match the cleaner design of the reference image */}
          <input
            placeholder="Full name"
            required
            minLength={2}
            autoComplete="name"
            value={f.name}
            onChange={set("name")}
          />

          <input
            placeholder="College email"
            type="email"
            required
            autoComplete="email"
            value={f.email}
            onChange={set("email")}
          />

          <input
            placeholder="Roll / Enrolment no."
            required
            value={f.rollNo}
            onChange={set("rollNo")}
          />

          <input
            placeholder="Password (min 8)"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={f.password}
            onChange={set("password")}
          />

          <label>
            Event code{" "}
            <small style={{ textTransform: "none" }}>
              (shown on screen at venue)
            </small>
            <input
              placeholder="Event code"
              value={f.eventCode}
              onChange={set("eventCode")}
            />
          </label>

          {err && <p className="error">{err}</p>}
          <button className="btn auth-btn" disabled={busy}>
            {busy ? "Sending code…" : "Send verification code"}
          </button>
        </form>

        <p className="muted auth-footer">
          Already registered? <Link to="/login">Log in.</Link>
        </p>
      </main>
    </div>
  );
}
