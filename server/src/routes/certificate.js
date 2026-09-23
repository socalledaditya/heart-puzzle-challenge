import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { getGame } from '../utils/game.js';
import { getRanking } from '../utils/ranking.js';
import { Puzzle } from '../models/Puzzle.js';
import { makeCertificate, certId } from '../utils/certificate.js';

const r = Router();

// A participant downloads their own certificate once the admin ends the game / enables certificates.
r.get('/me', requireAuth, requireRole('user'), async (req, res) => {
  const g = await getGame();
  if (!g.certsEnabled) throw new HttpError(403, 'Certificates are not available yet');
  const [ranking, totalPuzzles] = await Promise.all([getRanking(g.session), Puzzle.countDocuments({ enabled: true })]);
  const me = ranking.find((x) => String(x.userId) === String(req.user._id));
  if (!me) throw new HttpError(404, 'No participation found for this round');
  const pdf = await makeCertificate({
    name: me.name, rollNo: me.rollNo, rank: me.rank && me.rank <= 3 ? me.rank : 0, solved: me.solved, totalPuzzles,
    totalMs: me.totalMs, certId: certId(g.session, me.userId),
    event: { eventName: g.eventName, collegeName: g.collegeName, eventDate: g.eventDate, signatory: g.signatory, signatoryTitle: g.signatoryTitle },
  });
  res.type('application/pdf').attachment(`Certificate_${me.rollNo}.pdf`).send(pdf);
});

export default r;
