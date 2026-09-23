import { useCallback, useEffect, useState } from 'react';
import { api, download, errMsg, fmt } from '../api';
import { useAuth } from '../auth';
import { useGame } from '../useGame';
import { getSocket } from '../socket';
import Clock from '../components/Clock';
import Puzzle from '../components/Puzzle';

export default function Play() {
  const { user, logout } = useAuth();
  const { state, getElapsed } = useGame();
  const [cur, setCur] = useState(null);
  const [me, setMe] = useState(null);
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const status = state?.status;

  const load = useCallback(async () => {
    try { setCur((await api.get('/game/puzzle/current')).data); } catch { setCur(null); }
  }, []);
  const loadMe = useCallback(async () => { try { setMe((await api.get('/game/me')).data); } catch { /* ignore */ } }, []);

  useEffect(() => { if (status === 'running') load(); }, [status, state?.session, load]);
  useEffect(() => { if (status === 'ended' || cur?.done) loadMe(); }, [status, cur?.done, loadMe]);
  useEffect(() => {
    const s = getSocket();
    const off = () => logout();
    s.on('banned', off);
    return () => s.off('banned', off);
  }, [logout]);

  async function onSolved(swaps) {
    setBusy(true);
    try {
      const { data } = await api.post('/game/puzzle/submit', { attemptId: cur.attempt.id, swaps });
      if (data.solved) { setFlash('Solved! 🎉'); setTimeout(() => { setFlash(''); load(); }, 900); }
    } catch (e) { setFlash(errMsg(e)); } finally { setBusy(false); }
  }

  let body;
  if (!state) body = <p className="center muted">Connecting…</p>;
  else if (status === 'idle') body = <Wait title="Waiting for the host to start" sub="Keep this screen open — the game begins automatically." />;
  else if (status === 'paused') body = <Wait title="Game paused" sub="The clock is stopped. Please wait for the host." />;
  else if (status === 'ended') body = <Results me={me} certs={state.certsEnabled} />;
  else if (cur?.done) body = <div className="card center"><h2>🎉 You finished every puzzle!</h2><p>Solved {me?.solved ?? cur.solved} in {fmt(me?.totalMs)}. Results appear when the timer ends.</p></div>;
  else if (cur) body = (
    <>
      <div className="row between"><b>{cur.puzzle.title}</b><span className="muted">Puzzle {cur.index}/{cur.total}</span></div>
      <Puzzle key={cur.attempt.id} image={cur.puzzle.image} aspect={cur.puzzle.aspect} grid={cur.attempt.grid} initial={cur.attempt.order} disabled={busy || !!flash} onSolved={onSolved} />
      {flash && <div className="flash">{flash}</div>}
    </>
  );
  else body = <p className="center muted">Loading puzzle…</p>;

  return (
    <div className="page">
      <header className="bar">
        <b>❤️ {user.name.split(' ')[0]}</b>
        <Clock state={state} getElapsed={getElapsed} />
        <button className="link" onClick={logout}>Log out</button>
      </header>
      {body}
    </div>
  );
}

const Wait = ({ title, sub }) => (
  <div className="card center"><div className="pulse">❤️</div><h2>{title}</h2><p className="muted">{sub}</p></div>
);

function Results({ me, certs }) {
  const [err, setErr] = useState('');
  async function cert() {
    try { await download('/certificates/me', 'certificate.pdf'); } catch (e) { setErr('Certificate not available yet'); }
  }
  if (!me) return <p className="center muted">Loading results…</p>;
  return (
    <div className="card center">
      <h2>Time's up!</h2>
      <p className="big-num">{me.solved}<small> / {me.total} solved</small></p>
      {me.solved > 0 && <p>Time: <b>{fmt(me.totalMs)}</b> · Rank: <b>#{me.rank}</b> of {me.participants}</p>}
      {me.winners?.length > 0 && (
        <div className="winners">{me.winners.map((w) => <div key={w.rank}>{['🥇', '🥈', '🥉'][w.rank - 1]} {w.name} — {w.solved} in {fmt(w.totalMs)}</div>)}</div>
      )}
      {certs ? <button className="btn" onClick={cert}>Download certificate</button> : <p className="muted">Certificate will be available shortly.</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
