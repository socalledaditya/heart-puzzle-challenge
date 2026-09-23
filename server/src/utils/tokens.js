import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const signAccess = (u) =>
  jwt.sign({ sub: String(u._id), role: u.role, tv: u.tokenVersion }, config.jwtAccessSecret, { expiresIn: '30m' });
export const signRefresh = (u) =>
  jwt.sign({ sub: String(u._id), tv: u.tokenVersion }, config.jwtRefreshSecret, { expiresIn: '7d' });
export const verifyAccess = (t) => jwt.verify(t, config.jwtAccessSecret);
export const verifyRefresh = (t) => jwt.verify(t, config.jwtRefreshSecret);

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/api/auth' };
export const setRefreshCookie = (res, token) => res.cookie('rt', token, { ...cookieOpts, maxAge: WEEK });
export const clearRefreshCookie = (res) => res.clearCookie('rt', cookieOpts);
