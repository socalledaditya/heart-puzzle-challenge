import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Puzzle } from '../models/Puzzle.js';
import { getGame } from './game.js';

const PUZZLES = [
  { key: 'unity', title: 'Unity', image: '/puzzles/heart-unity.svg', aspect: 1, grid: 3 },
  { key: 'bloom', title: 'Bloom', image: '/puzzles/heart-bloom.svg', aspect: 1, grid: 3 },
  { key: 'rhythm', title: 'Rhythm', image: '/puzzles/heart-rhythm.svg', aspect: 1, grid: 3 },
  { key: 'round-1', title: 'Anatomy - Round 1', image: '/puzzles/round-1-heart.webp', aspect: 1, grid: 4 },
  { key: 'round-2', title: 'Anatomy - Round 2', image: '/puzzles/round-2-heart.webp', aspect: 820 / 1239, grid: 4 },
];

export async function seed() {
  await getGame();
  if (!(await Puzzle.countDocuments())) {
    await Puzzle.insertMany(PUZZLES.map((p, i) => ({ ...p, order: i + 1 })));
    console.log('Seeded puzzles');
  }
  if (!(await User.findOne({ role: 'admin' }))) {
    if (!config.admin.email || config.admin.password.length < 8) {
      console.warn('!! No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in server/.env and restart.');
      return;
    }
    await User.create({
      name: config.admin.name, email: config.admin.email, rollNo: 'ADMIN', role: 'admin', verified: true,
      passwordHash: await bcrypt.hash(config.admin.password, 12),
    });
    console.log(`Seeded admin: ${config.admin.email}`);
  }
}
