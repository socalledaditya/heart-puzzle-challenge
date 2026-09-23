import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { getGame } from '../utils/game.js';
import { signAccess, signRefresh, verifyRefresh, setRefreshCookie, clearRefreshCookie } from '../utils/tokens.js';
import { sendOtp } from '../utils/mailer.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
// Generous on purpose: a whole classroom shares one college Wi-Fi IP.
r.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false }));

const email = z.string().trim().toLowerCase().email();
const hashOtp = (mail, otp) => crypto.createHmac('sha256', config.jwtAccessSecret).update(`${mail}:${otp}`).digest('hex');
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, rollNo: u.rollNo, role: u.role });

async function issueOtp(user) {
  const otp = String(crypto.randomInt(100000, 1000000));
  user.otpHash = hashOtp(user.email, otp);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  user.otpSentAt = new Date();
  await user.save();
  const mail = await sendOtp(user.email, user.name, otp);
  return mail.dev ? otp : undefined; // only exposed when SMTP is not configured (dev)
}

function startSession(res, user) {
  setRefreshCookie(res, signRefresh(user));
  return { accessToken: signAccess(user), user: publicUser(user) };
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  rollNo: z.string().trim().min(2).max(30),
  password: z.string().min(8).max(100),
  eventCode: z.string().trim().optional().default(''),
});

r.post('/register', async (req, res) => {
  const d = registerSchema.parse(req.body);
  const g = await getGame();
  if (!g.registrationOpen) throw new HttpError(403, 'Registration is closed');
  if (g.eventCode && d.eventCode.toLowerCase() !== g.eventCode.toLowerCase())
    throw new HttpError(403, 'Invalid event code. Please ask the organisers.');
  if (config.allowedDomains.length && !config.allowedDomains.includes(d.email.split('@')[1]))
    throw new HttpError(400, `Please use your college email (${config.allowedDomains.map((x) => '@' + x).join(', ')})`);

  let user = await User.findOne({ email: d.email });
  if (user?.verified) throw new HttpError(409, 'This email is already registered. Please log in.');

  const rollNo = d.rollNo.toUpperCase();
  const owner = await User.findOne({ rollNo, ...(user ? { _id: { $ne: user._id } } : {}) });
  if (owner?.verified) throw new HttpError(409, 'This roll number is already registered');
  if (owner) await owner.deleteOne(); // stale, never-verified sign-up (e.g. mistyped e-mail)

  if (!user) user = new User({ email: d.email });
  Object.assign(user, { name: d.name, rollNo, passwordHash: await bcrypt.hash(d.password, 10) });
  const devOtp = await issueOtp(user);
  res.status(201).json({ message: 'Verification code sent to your email', email: d.email, devOtp });
});

r.post('/verify-otp', async (req, res) => {
  const { email: mail, otp } = z.object({ email, otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }).parse(req.body);
  const user = await User.findOne({ email: mail }).select('+otpHash');
  if (!user || !user.otpHash) throw new HttpError(400, 'No pending verification. Please register again.');
  if (user.otpExpires < new Date()) throw new HttpError(400, 'Code expired. Request a new one.');
  if (user.otpAttempts >= 5) throw new HttpError(429, 'Too many wrong attempts. Request a new code.');
  const ok = crypto.timingSafeEqual(Buffer.from(user.otpHash), Buffer.from(hashOtp(mail, otp)));
  if (!ok) {
    user.otpAttempts += 1;
    await user.save();
    throw new HttpError(400, 'Incorrect code');
  }
  user.verified = true;
  user.otpHash = undefined;
  user.otpExpires = undefined;
  await user.save();
  res.json(startSession(res, user));
});

r.post('/resend-otp', async (req, res) => {
  const { email: mail } = z.object({ email }).parse(req.body);
  const user = await User.findOne({ email: mail });
  if (!user || user.verified) throw new HttpError(400, 'Nothing to verify for this email');
  if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < 60_000)
    throw new HttpError(429, 'Please wait a minute before requesting another code');
  const devOtp = await issueOtp(user);
  res.json({ message: 'New code sent', devOtp });
});

r.post('/login', async (req, res) => {
  const { email: mail, password } = z.object({ email, password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: mail }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
  if (user.banned) throw new HttpError(403, 'Your account has been disabled by the organisers');
  if (!user.verified) throw new HttpError(403, 'Email not verified', 'UNVERIFIED');
  res.json(startSession(res, user));
});

r.post('/refresh', async (req, res) => {
  try {
    const p = verifyRefresh(req.cookies?.rt);
    const user = await User.findById(p.sub);
    if (!user || user.tokenVersion !== p.tv || user.banned || !user.verified) throw new Error('invalid');
    return res.json(startSession(res, user));
  } catch {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Session expired');
  }
});

r.post('/logout', (req, res) => {
  clearRefreshCookie(res);
  res.json({ ok: true });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default r;
