import { Attempt } from '../models/Attempt.js';
import { Puzzle } from '../models/Puzzle.js';
import { User } from '../models/User.js';
import { getGame } from './game.js';

// Rank = most puzzles solved, then lowest total time (game-clock at last solve).
export async function getRanking(session) {
  const rows = await Attempt.aggregate([
    { $match: { session } },
    {
      $group: {
        _id: '$user',
        solved: { $sum: { $cond: ['$solved', 1, 0] } },
        totalMs: { $max: { $cond: ['$solved', '$solvedClock', 0] } },
        swaps: { $sum: '$swapCount' },
      },
    },
    { $sort: { solved: -1, totalMs: 1, _id: 1 } },
    { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $match: { 'u.banned': false } },
    { $project: { _id: 0, userId: '$_id', name: '$u.name', email: '$u.email', rollNo: '$u.rollNo', solved: 1, totalMs: 1, swaps: 1 } },
  ]);
  let pos = 0;
  return rows.map((r) => ({ ...r, rank: r.solved > 0 ? ++pos : null }));
}

export async function leaderboardPayload() {
  const g = await getGame();
  const [ranking, totalPuzzles, registered] = await Promise.all([
    getRanking(g.session),
    Puzzle.countDocuments({ enabled: true }),
    User.countDocuments({ role: 'user', verified: true }),
  ]);
  return {
    top10: ranking.filter((r) => r.solved > 0).slice(0, 10),
    stats: {
      registered,
      participants: ranking.length,
      finished: ranking.filter((r) => r.solved >= totalPuzzles && totalPuzzles > 0).length,
      totalPuzzles,
    },
  };
}
