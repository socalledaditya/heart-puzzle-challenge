import mongoose from 'mongoose';

const puzzleSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  title: String,
  image: String, // served from client/public/puzzles
  aspect: { type: Number, default: 1 }, // width / height
  grid: { type: Number, default: 3, min: 2, max: 6 },
  order: Number,
  enabled: { type: Boolean, default: true },
});

export const Puzzle = mongoose.model('Puzzle', puzzleSchema);
