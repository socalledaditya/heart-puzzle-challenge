import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({ message: `${first.path.join('.') || 'input'}: ${first.message}` });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Already exists (duplicate value)' });
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, code: err.code });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
}
