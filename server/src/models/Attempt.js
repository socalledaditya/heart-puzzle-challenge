import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    puzzle: { type: mongoose.Schema.Types.ObjectId, ref: 'Puzzle', required: true },
    session: { type: Number, required: true },
    grid: Number,
    order: [Number], // server-issued shuffle: order[position] = tile index
    startedClock: { type: Number, default: 0 }, // game clock (ms) when the puzzle was issued
    solved: { type: Boolean, default: false },
    solvedClock: { type: Number, default: 0 }, // game clock (ms) at solve time (pause-proof)
    swapCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
attemptSchema.index({ user: 1, puzzle: 1, session: 1 }, { unique: true });
attemptSchema.index({ session: 1, solved: 1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
