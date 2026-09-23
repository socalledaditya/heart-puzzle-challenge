import { Router } from 'express';
import archiver from 'archiver';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Puzzle } from '../models/Puzzle.js';
import { Attempt } from '../models/Attempt.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { getGame, publicState, transition } from '../utils/game.js';
import { getRanking, leaderboardPayload } from '../utils/ranking.js';
import { makeCertificate, certId, fmtTime } from '../utils/certificate.js';
import { broadcastState, kickUser, onlineCount, scheduleLeaderboard } from '../socket.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));

const settingsOf = (g) => ({
  status: g.status, durationSec: g.durationSec, session: g.session, registrationOpen: g.registrationOpen,
  eventCode: g.eventCode, certsEnabled: g.certsEnabled, eventName: g.eventName, collegeName: g.collegeName,
  eventDate: g.eventDate, signatory: g.signatory, signatoryTitle: g.signatoryTitle,
});
const eventOf = (g) => ({ eventName: g.eventName, collegeName: g.collegeName, eventDate: g.eventDate, signatory: g.signatory, signatoryTitle: g.signatoryTitle });

r.get('/overview', async (req, res) => {
  const g = await getGame();
  const [lb, puzzles] = await Promise.all([leaderboardPayload(), Puzzle.find().sort('order')]);
  res.json({ settings: settingsOf(g), state: publicState(g), puzzles, online: onlineCount(), ...lb });
});

// --- real-time game control -------------------------------------------------
r.post('/game/:action', async (req, res) => {
  const g = await transition(req.params.action);
  await broadcastState();
  scheduleLeaderboard();
  res.json(publicState(g));
});

const settingsSchema = z.object({
  durationSec: z.number().int().min(30).max(6 * 3600),
  registrationOpen: z.boolean(),
  eventCode: z.string().trim().max(30),
  certsEnabled: z.boolean(),
  eventName: z.string().trim().min(1).max(120),
  collegeName: z.string().trim().max(160),
  eventDate: z.string().trim().max(40),
  signatory: z.string().trim().max(80),
  signatoryTitle: z.string().trim().max(80),
}).partial();

r.put('/settings', async (req, res) => {
  const g = await getGame();
  Object.assign(g, settingsSchema.parse(req.body));
  await g.save();
  await broadcastState();
  res.json(settingsOf(g));
});

// --- players ----------------------------------------------------------------
r.get('/users', async (req, res) => {
  const g = await getGame();
  const search = String(req.query.search || '').trim();
  const q = { role: 'user', verified: true };
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ name: rx }, { email: rx }, { rollNo: rx }];
  }
  const [users, ranking] = await Promise.all([User.find(q).sort('-createdAt').limit(500), getRanking(g.session)]);
  const byId = new Map(ranking.map((x) => [String(x.userId), x]));
  res.json(users.map((u) => ({
    id: u._id, name: u.name, email: u.email, rollNo: u.rollNo, banned: u.banned,
    solved: byId.get(String(u._id))?.solved || 0, totalMs: byId.get(String(u._id))?.totalMs || 0, rank: byId.get(String(u._id))?.rank || null,
  })));
});

r.post('/users/:id/ban', async (req, res) => {
  const { banned } = z.object({ banned: z.boolean() }).parse(req.body);
  const u = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!u) throw new HttpError(404, 'User not found');
  u.banned = banned;
  u.tokenVersion += 1; // kills all their tokens instantly
  await u.save();
  if (banned) kickUser(u._id);
  res.json({ ok: true });
});

r.delete('/users/:id', async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!u) throw new HttpError(404, 'User not found');
  kickUser(u._id);
  await Promise.all([Attempt.deleteMany({ user: u._id }), u.deleteOne()]);
  res.json({ ok: true });
});

// --- puzzles ------------------------------------------------------------------
r.put('/puzzles/:id', async (req, res) => {
  const d = z.object({ enabled: z.boolean().optional(), grid: z.number().int().min(2).max(6).optional(), order: z.number().int().optional() }).parse(req.body);
  const p = await Puzzle.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!p) throw new HttpError(404, 'Puzzle not found');
  res.json(p);
});

// --- results & certificates ---------------------------------------------------
r.get('/export.csv', async (req, res) => {
  const g = await getGame();
  const rows = await getRanking(g.session);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Rank,Name,Roll No,Email,Puzzles Solved,Total Time'].concat(
    rows.map((x) => [x.rank ?? '', x.name, x.rollNo, x.email, x.solved, x.solved ? fmtTime(x.totalMs) : ''].map(esc).join(','))
  );
  res.type('text/csv').attachment('results.csv').send(csv.join('\n'));
});

r.get('/certificates.zip', async (req, res) => {
  const g = await getGame();
  const [ranking, totalPuzzles] = await Promise.all([getRanking(g.session), Puzzle.countDocuments({ enabled: true })]);
  if (!ranking.length) throw new HttpError(404, 'No participants yet');
  res.attachment('certificates.zip');
  const zip = archiver('zip', { zlib: { level: 6 } });
  zip.on('error', (e) => { console.error(e); res.destroy(e); });
  zip.pipe(res);
  for (const p of ranking) {
    const pdf = await makeCertificate({
      name: p.name, rollNo: p.rollNo, rank: p.rank && p.rank <= 3 ? p.rank : 0, solved: p.solved,
      totalPuzzles, totalMs: p.totalMs, certId: certId(g.session, p.userId), event: eventOf(g),
    });
    const prefix = p.rank && p.rank <= 3 ? `TOP${p.rank}` : 'PARTICIPANT';
    zip.append(pdf, { name: `${prefix}_${p.rollNo}_${p.name.replace(/[^\w]+/g, '_')}.pdf` });
  }
  await zip.finalize();
});

r.get('/certificates/sample.pdf', async (req, res) => {
  const g = await getGame();
  const rank = Math.min(3, Math.max(0, Number(req.query.rank) || 0));
  const pdf = await makeCertificate({ name: 'Sample Student Name', rollNo: 'BSC-CARD-001', rank, solved: 5, totalPuzzles: 5, totalMs: 372000, certId: 'SAMPLE', event: eventOf(g) });
  res.type('application/pdf').send(pdf);
});

export default r;
