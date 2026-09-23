import crypto from 'crypto';
import { Game } from '../models/Game.js';
import { Puzzle } from '../models/Puzzle.js';
import { HttpError } from '../middleware/error.js';

export const getGame = () =>
  Game.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true });

// Game clock only advances while status === 'running' -> pausing is fair to everyone.
export const elapsedMs = (g, now = Date.now()) =>
  g.accumulatedMs + (g.status === 'running' && g.runningSince ? now - g.runningSince.getTime() : 0);

export const publicState = (g) => ({
  status: g.status,
  durationSec: g.durationSec,
  elapsedMs: elapsedMs(g),
  session: g.session,
  registrationOpen: g.registrationOpen,
  certsEnabled: g.certsEnabled,
  eventName: g.eventName,
});

export async function transition(action) {
  const g = await getGame();
  const now = new Date();
  const bank = () => {
    g.accumulatedMs += now - g.runningSince;
    g.runningSince = null;
  };
  switch (action) {
    case 'start':
      if (g.status !== 'idle') throw new HttpError(409, 'Game already started. Reset to start a new round.');
      if (!(await Puzzle.countDocuments({ enabled: true }))) throw new HttpError(409, 'Enable at least one puzzle first');
      Object.assign(g, { status: 'running', accumulatedMs: 0, runningSince: now, certsEnabled: false });
      break;
    case 'pause':
      if (g.status !== 'running') throw new HttpError(409, 'Game is not running');
      bank();
      g.status = 'paused';
      break;
    case 'resume':
      if (g.status !== 'paused') throw new HttpError(409, 'Game is not paused');
      g.runningSince = now;
      g.status = 'running';
      break;
    case 'end':
      if (g.status === 'running') bank();
      else if (g.status !== 'paused') throw new HttpError(409, 'Game is not active');
      g.status = 'ended';
      g.certsEnabled = true;
      break;
    case 'reset':
      Object.assign(g, { status: 'idle', accumulatedMs: 0, runningSince: null, certsEnabled: false });
      g.session += 1; // old results stay in DB, new round starts clean
      break;
    default:
      throw new HttpError(400, 'Unknown action');
  }
  await g.save();
  return g;
}

export function shuffle(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
  } while (a.every((v, i) => v === i));
  return a;
}

// Server-side verification: replay the player's swaps on the issued shuffle.
export function replay(order, swaps) {
  const a = [...order];
  for (const [i, j] of swaps) {
    if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= a.length || j >= a.length) return null;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.every((v, i) => v === i);
}
