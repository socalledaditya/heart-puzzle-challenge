import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';

export default function Verify() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState(state?.devOtp ? `Dev mode (no SMTP): your code is ${state.devOtp}` : '');
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(60);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!state?.email) return <Navigate to="/login" replace />;

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/auth/verify-otp', { email: state.email, otp });
      signIn(data); nav('/');
    } catch (ex) { setErr(errMsg(ex)); }
  }
  async function resend() {
    setErr('');
    try {
      const { data } = await api.post('/auth/resend-otp', { email: state.email });
      setMsg(data.devOtp ? `Dev mode: new code ${data.devOtp}` : 'New code sent'); setWait(60);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  return (
    <main className="card narrow">
      <h1>Verify your email</h1>
      <p className="muted">Enter the 6-digit code sent to <b>{state.email}</b></p>
      <form onSubmit={submit}>
        <input className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
        {msg && <p className="ok">{msg}</p>}
        {err && <p className="error">{err}</p>}
        <button className="btn">Verify &amp; continue</button>
      </form>
      <button className="link" disabled={wait > 0} onClick={resend}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
    </main>
  );
}
