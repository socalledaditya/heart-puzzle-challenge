import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, download, errMsg, fmt } from '../api';
import { useAuth } from '../auth';
import { useGame } from '../useGame';
import { getSocket } from '../socket';
import Clock from '../components/Clock';
import Leaderboard from '../components/Leaderboard';

export default function Admin() {
  const { logout } = useAuth();
  const { state, getElapsed } = useGame();
  const [ov, setOv] = useState(null);
  const [top, setTop] = useState([]);
  const [stats, setStats] = useState({});
  const [online, setOnline] = useState(0);
  const [tab, setTab] = useState('live');
  const [err, setErr] = useState('');

  const load = useCallback(() => api.get('/admin/overview').then((r) => {
    setOv(r.data); setTop(r.data.top10); setStats(r.data.stats); setOnline(r.data.online);
  }).catch((e) => setErr(errMsg(e))), []);

  useEffect(() => {
    load();
    const s = getSocket();
    const lb = (p) => { setTop(p.top10); setStats(p.stats); };
    const pr = (p) => setOnline(p.online);
    s.on('leaderboard:update', lb); s.on('presence', pr);
    return () => { s.off('leaderboard:update', lb); s.off('presence', pr); };
  }, [load]);

  async function act(a) {
    const warn = { end: 'End the game now for everyone?', reset: 'Reset? A new round starts and the current leaderboard is cleared.' }[a];
    if (warn && !confirm(warn)) return;
    setErr('');
    try { await api.post(`/admin/game/${a}`); if (a === 'reset') load(); } catch (e) { setErr(errMsg(e)); }
  }
  async function addMinute() {
    try { await api.put('/admin/settings', { durationSec: state.durationSec + 60 }); } catch (e) { setErr(errMsg(e)); }
  }

  const st = state?.status;
  return (
    <div className="page wide">
      <header className="bar">
        <b>❤️ Admin</b>
        <span className={`badge ${st}`}>{st || '…'}</span>
        <Clock state={state} getElapsed={getElapsed} />
        <span><Link to="/admin/screen" target="_blank" className="link">Projector ↗</Link> · <button className="link" onClick={logout}>Log out</button></span>
      </header>

      <div className="controls">
        <button className="btn go" disabled={st !== 'idle'} onClick={() => act('start')}>▶ Start</button>
        <button className="btn" disabled={st !== 'running'} onClick={() => act('pause')}>⏸ Pause</button>
        <button className="btn" disabled={st !== 'paused'} onClick={() => act('resume')}>⏯ Resume</button>
        <button className="btn ghost" disabled={st !== 'running' && st !== 'paused'} onClick={addMinute}>+1 min</button>
        <button className="btn danger" disabled={st !== 'running' && st !== 'paused'} onClick={() => act('end')}>⏹ End</button>
        <button className="btn ghost" onClick={() => act('reset')}>↺ Reset</button>
      </div>
      {err && <p className="error">{err}</p>}

      <nav className="tabs">
        {['live', 'players', 'puzzles', 'settings'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </nav>

      {tab === 'live' && (
        <>
          <div className="stats">
            <Stat n={stats.registered} l="Registered" /><Stat n={online} l="Online now" /><Stat n={stats.participants} l="Playing" /><Stat n={stats.finished} l="Finished all" />
          </div>
          <h3>Top 10 players</h3>
          <Leaderboard rows={top} />
        </>
      )}
      {tab === 'players' && <Players />}
      {tab === 'puzzles' && ov && <Puzzles initial={ov.puzzles} />}
      {tab === 'settings' && ov && <Settings initial={ov.settings} onSaved={load} />}
    </div>
  );
}

const Stat = ({ n, l }) => <div className="stat"><b>{n ?? 0}</b><span>{l}</span></div>;

function Players() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const load = useCallback(() => api.get('/admin/users', { params: { search: q } }).then((r) => setRows(r.data)), [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const ban = async (u) => { await api.post(`/admin/users/${u.id}/ban`, { banned: !u.banned }); load(); };
  const del = async (u) => { if (confirm(`Delete ${u.name}?`)) { await api.delete(`/admin/users/${u.id}`); load(); } };
  return (
    <>
      <input placeholder="Search name / roll no / email" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Name</th><th>Roll No</th><th>Solved</th><th>Time</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={u.banned ? 'banned' : ''}>
                <td>{u.name}<br /><small className="muted">{u.email}</small></td>
                <td>{u.rollNo}</td><td>{u.solved}</td><td>{u.solved ? fmt(u.totalMs) : '-'}</td>
                <td className="nowrap"><button className="link" onClick={() => ban(u)}>{u.banned ? 'Unban' : 'Ban'}</button> · <button className="link red" onClick={() => del(u)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">{rows.length} players</p>
    </>
  );
}

function Puzzles({ initial }) {
  const [rows, setRows] = useState(initial);
  const save = async (p, patch) => {
    const { data } = await api.put(`/admin/puzzles/${p._id}`, patch);
    setRows(rows.map((x) => (x._id === p._id ? data : x)));
  };
  return (
    <div className="grid-cards">
      {rows.map((p) => (
        <div className="card mini" key={p._id}>
          <img src={p.image} alt={p.title} />
          <b>{p.order}. {p.title}</b>
          <label className="row"><input type="checkbox" checked={p.enabled} onChange={(e) => save(p, { enabled: e.target.checked })} /> Enabled</label>
          <label className="row">Grid <select value={p.grid} onChange={(e) => save(p, { grid: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}×{n}</option>)}</select></label>
        </div>
      ))}
      <p className="muted">Changes apply to puzzles issued from now on; players mid-puzzle keep their current one.</p>
    </div>
  );
}

function Settings({ initial, onSaved }) {
  const [f, setF] = useState({ ...initial, minutes: Math.round(initial.durationSec / 60) });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save(e) {
    e.preventDefault();
    const { minutes, status, session, ...rest } = f;
    try { await api.put('/admin/settings', { ...rest, durationSec: Math.round(Number(minutes) * 60) }); setMsg('Saved ✔'); onSaved(); } catch (ex) { setMsg(errMsg(ex)); }
  }
  const dl = (u, n) => download(u, n).catch(() => setMsg('Nothing to download yet'));
  return (
    <form onSubmit={save} className="card">
      <label>Event name<input value={f.eventName} onChange={set('eventName')} /></label>
      <label>College / department<input value={f.collegeName} onChange={set('collegeName')} /></label>
      <label>Event date (printed on certificates)<input value={f.eventDate} onChange={set('eventDate')} placeholder="25 September 2026" /></label>
      <label>Signatory name<input value={f.signatory} onChange={set('signatory')} /></label>
      <label>Signatory title<input value={f.signatoryTitle} onChange={set('signatoryTitle')} /></label>
      <label>Game duration (minutes)<input type="number" min="1" max="360" value={f.minutes} onChange={set('minutes')} /></label>
      <label>Event code (players must enter it to register; blank = none)<input value={f.eventCode} onChange={set('eventCode')} /></label>
      <label className="row"><input type="checkbox" checked={f.registrationOpen} onChange={set('registrationOpen')} /> Registration open</label>
      <label className="row"><input type="checkbox" checked={f.certsEnabled} onChange={set('certsEnabled')} /> Certificates downloadable by players</label>
      <button className="btn">Save settings</button> {msg && <span className="ok">{msg}</span>}
      <hr />
      <h3>Results &amp; certificates</h3>
      <div className="row gap wrap">
        <button type="button" className="btn ghost" onClick={() => dl('/admin/certificates.zip', 'certificates.zip')}>All certificates (ZIP)</button>
        <button type="button" className="btn ghost" onClick={() => dl('/admin/export.csv', 'results.csv')}>Results CSV</button>
        <button type="button" className="btn ghost" onClick={() => dl('/admin/certificates/sample.pdf?rank=0', 'sample-participant.pdf')}>Sample: participant</button>
        <button type="button" className="btn ghost" onClick={() => dl('/admin/certificates/sample.pdf?rank=1', 'sample-winner.pdf')}>Sample: winner</button>
      </div>
    </form>
  );
}
