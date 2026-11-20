import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Key on both the client IP and the submitted national ID so that rotating
// X-Forwarded-For headers cannot bypass the per-account limit.
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip || req.socket.remoteAddress || 'unknown'}:${String((req.body as any)?.nationalId || '').slice(0, 32)}`,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many refresh attempts. Please try again later.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip || req.socket.remoteAddress || 'unknown'}:${String((req.body as any)?.nationalId || '').slice(0, 32)}`,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
