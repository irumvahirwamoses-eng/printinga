import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import * as authService from '../services/authService';
import { User } from '../models/User';
import { cookieSameSite, env, isProduction } from '../config';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService';

const cookieOpts = {
  httpOnly: true,
  // Render (and every real host) uses HTTPS, so keep cookies Secure in
  // production even with SameSite=Lax. Local development stays HTTP-friendly.
  secure: isProduction || cookieSameSite === 'none',
  sameSite: cookieSameSite,
  path: '/',
};

export const loginSchema = z.object({
  body: z.object({
    nationalId: z.string().regex(/^\d{16}$/, 'National ID must be 16 digits'),
    password: z.string().min(1),
    rememberMe: z.boolean().optional(),
  }),
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nationalId, password } = req.body;
  const result = await authService.login(nationalId, password);
  const refreshMaxAge = (req.body.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
  res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: refreshMaxAge });
  res.json(ok({ user: result.user }));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (req.user) await authService.logout(req.user.id, refreshToken);
  res.clearCookie('accessToken', cookieOpts);
  res.clearCookie('refreshToken', cookieOpts);
  res.json(ok(null, 'Logged out'));
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ success: false, message: 'No refresh token' });
    return;
  }
  const result = await authService.refresh(token);
  res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json(ok({ user: result.user }));
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json(ok({ user: authService.sanitizeUser(user) }));
});

/**
 * Only these fields may be changed from the profile screen. Role, activation
 * state, national ID and password all require their own protected flows.
 */
export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.union([z.string().email(), z.literal('')]).optional(),
    phone: z.string().trim().max(30).optional(),
    department: z.string().trim().max(120).optional(),
  }),
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  res.json(ok({ user }, 'Profile updated'));
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.clearCookie('accessToken', cookieOpts);
  res.clearCookie('refreshToken', cookieOpts);
  res.json(ok(null, 'Password changed. Please log in again.'));
});

export const forgotPasswordSchema = z.object({
  body: z.object({ nationalId: z.string().regex(/^\d{16}$/) }),
});

export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.forgotPassword(req.body.nationalId);
  if (result?.token) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(result.token)}`;
    if (result.email && isEmailConfigured()) {
      await sendPasswordResetEmail(result.email, resetUrl);
    } else if (!isProduction) {
      // Development convenience only: the token goes to the SERVER CONSOLE,
      // never to the API response (returning it would allow account takeover).
      console.info(`[dev] Password reset link: ${resetUrl}`);
    }
  }
  // Always return the same generic message, whether or not the account exists.
  res.json(ok({ resetRequested: true }, 'If the account exists, reset instructions have been sent.'));
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.json(ok(null, 'Password reset successful'));
});
