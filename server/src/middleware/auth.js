import { User } from '../models/User.js';
import { verifyAccess } from '../utils/tokens.js';

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const p = verifyAccess(token);
    const user = await User.findById(p.sub);
    if (!user || user.tokenVersion !== p.tv || user.banned || !user.verified) throw new Error('invalid');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired' });
  }
}

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : res.status(403).json({ message: 'Forbidden' });
