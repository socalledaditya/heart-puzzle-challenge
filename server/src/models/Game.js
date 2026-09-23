import mongoose from 'mongoose';

// Singleton document holding the live game state + event settings.
const gameSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  status: { type: String, enum: ['idle', 'running', 'paused', 'ended'], default: 'idle' },
  durationSec: { type: Number, default: 1200 },
  accumulatedMs: { type: Number, default: 0 }, // running time banked before the current run
  runningSince: { type: Date, default: null },
  session: { type: Number, default: 1 }, // increments on reset; scopes attempts/leaderboard
  registrationOpen: { type: Boolean, default: true },
  eventCode: { type: String, default: '' },
  certsEnabled: { type: Boolean, default: false },
  eventName: { type: String, default: 'Heart Puzzle Challenge' },
  collegeName: { type: String, default: '' },
  eventDate: { type: String, default: '' },
  signatory: { type: String, default: '' },
  signatoryTitle: { type: String, default: '' },
});

export const Game = mongoose.model('Game', gameSchema);
