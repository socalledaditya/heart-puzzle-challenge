import 'dotenv/config';

const list = (v) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/heart-puzzle',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-please-0000',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-please-000',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  admin: {
    name: process.env.ADMIN_NAME || 'Event Admin',
    email: (process.env.ADMIN_EMAIL || '').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  },
  allowedDomains: list(process.env.ALLOWED_EMAIL_DOMAINS),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Heart Puzzle <no-reply@example.com>',
  },
};

if (isProd && (config.jwtAccessSecret.startsWith('dev-') || config.jwtRefreshSecret.startsWith('dev-'))) {
  throw new Error('Set strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in production');
}
