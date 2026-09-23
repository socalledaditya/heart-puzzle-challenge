import { Router } from 'express';
import { z } from 'zod';
import { Puzzle } from '../models/Puzzle.js';
import { Attempt } from '../models/Attempt.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { getGame, publicState, elapsedMs, shuffle, replay } from '../utils/game.js';
import { getRanking } from '../utils/ranking.js';
import { scheduleLeaderboard } from '../socket.js';

const r = Router();
r.use(requireAuth);

r.get('/state', async (req, res) => res.json(publicState(await getGame())));

// Everything below is for players only.
r.use(requireRole('user'));

r.get('/me', async (req, res) => {
  const g = await getGame();
  const [ranking, total] = await Promise.all([getRanking(g.session), Puzzle.countDocuments({ enabled: true })]);
  const mine = ranking.find((x) => String(x.userId) === String(req.user._id));
  const out = { solved: mine?.solved || 0, totalMs: mine?.totalMs || 0, rank: mine?.rank || null, total, participants: ranking.length };
  if (g.status === 'ended') {
    out.winners = ranking.filter((x) => x.rank && x.rank <= 3).map((x) => ({ rank: x.rank, name: x.name, solved: x.solved, totalMs: x.totalMs }));
  }
  res.json(out);
});

// Issue (or re-issue) the player's next unsolved puzzle. Puzzles are sequential.
r.get('/puzzle/current', async (req, res) => {
  const g = await getGame();
  if (g.status !== 'running') throw new HttpError(409, 'Game is not running');
  const puzzles = await Puzzle.find({ enabled: true }).sort('order');
  const done = new Set((await Attempt.find({ user: req.user._id, session: g.session, solved: true }).select('puzzle')).map((a) => String(a.puzzle)));
  const next = puzzles.find((p) => !done.has(String(p._id)));
  if (!next) return res.json({ done: true, solved: done.size, total: puzzles.length });

  const attempt = await Attempt.findOneAndUpdate(
    { user: req.user._id, puzzle: next._id, session: g.session },
    { $setOnInsert: { grid: next.grid, order: shuffle(next.grid ** 2), startedClock: elapsedMs(g) } },
    { upsert: true, new: true }
  );
  res.json({
    done: false,
    index: done.size + 1,
    total: puzzles.length,
    attempt: { id: attempt._id, order: attempt.order, grid: attempt.grid },
    puzzle: { title: next.title, image: next.image, aspect: next.aspect },
  });
});

const submitSchema = z.object({
  attemptId: z.string().length(24),
  swaps: z.array(z.tuple([z.number().int(), z.number().int()])).max(1000),
});

r.post('/puzzle/submit', async (req, res) => {
  const { attemptId, swaps } = submitSchema.parse(req.body);
  const g = await getGame();
  if (g.status !== 'running') throw new HttpError(409, 'Game is not running');
  const clock = elapsedMs(g);
  if (clock > g.durationSec * 1000 + 1500) throw new HttpError(409, 'Time is up');

  const attempt = await Attempt.findOne({ _id: attemptId, user: req.user._id, session: g.session });
  if (!attempt || attempt.solved) throw new HttpError(404, 'Puzzle not found');

  const ok = replay(attempt.order, swaps);
  if (ok === null) throw new HttpError(400, 'Invalid moves');
  if (!ok) return res.json({ solved: false });
  if (clock - attempt.startedClock < 1000) throw new HttpError(400, 'Submission rejected');

  attempt.solved = true;
  attempt.solvedClock = Math.min(clock, g.durationSec * 1000);
  attempt.swapCount = swaps.length;
  await attempt.save();
  scheduleLeaderboard();
  res.json({ solved: true });
});

export default r;
