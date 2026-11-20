import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, newTokenId } from '../utils/tokens';
import { generateTempPassword } from '../utils/generateTempPassword';
import { maskNationalId } from '../utils/maskNationalId';

const LOCK_TIME_MS = 15 * 60 * 1000;
const MAX_FAILED = 5;

export async function login(nationalId: string, password: string) {
  const user = await User.findOne({ nationalId }).select('+password +refreshTokens');
  if (!user) throw new AppError('Invalid credentials', 401);
  if (!user.isActive) throw new AppError('Account is deactivated', 403);
  if (user.isLocked()) throw new AppError('Account locked. Try again later.', 423);

  const match = await user.comparePassword(password);
  if (!match) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new AppError('Invalid credentials', 401);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();

  const tokenId = newTokenId();
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, nationalId: user.nationalId });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), tokenId });
  user.refreshTokens = [...(user.refreshTokens || []), hashToken(refreshToken)].slice(-10);
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string; tokenId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) throw new AppError('Invalid refresh token', 401);
  const hashed = hashToken(refreshToken);
  const idx = (user.refreshTokens || []).indexOf(hashed);
  if (idx === -1) {
    // reuse detected - revoke all
    user.refreshTokens = [];
    await user.save();
    throw new AppError('Session invalidated', 401);
  }
  const tokenId = newTokenId();
  const newAccess = signAccessToken({ sub: user._id.toString(), role: user.role, nationalId: user.nationalId });
  const newRefresh = signRefreshToken({ sub: user._id.toString(), tokenId });
  user.refreshTokens[idx] = hashToken(newRefresh);
  await user.save();
  return { accessToken: newAccess, refreshToken: newRefresh, user: sanitizeUser(user) };
}

export async function logout(userId: string, refreshToken?: string) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== hashed);
  } else {
    user.refreshTokens = [];
  }
  await user.save();
}

export async function updateProfile(
  userId: string,
  details: { fullName: string; email?: string; phone?: string; department?: string }
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  user.fullName = details.fullName.trim();
  // Only overwrite fields that were actually sent, so a partial update never
  // wipes contact details the user left out of the request.
  if (details.email !== undefined) user.email = details.email.trim() || undefined;
  if (details.phone !== undefined) user.phone = details.phone.trim() || undefined;
  if (details.department !== undefined) user.department = details.department.trim() || undefined;
  await user.save();
  return sanitizeUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId).select('+password +refreshTokens');
  if (!user) throw new AppError('User not found', 404);
  const match = await user.comparePassword(currentPassword);
  if (!match) throw new AppError('Current password is incorrect', 400);
  user.password = newPassword;
  user.isFirstLogin = false;
  user.refreshTokens = [];
  await user.save();
}

export async function forgotPassword(nationalId: string) {
  const user = await User.findOne({ nationalId }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return null; // do not reveal
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  return { token, email: user.email };
}

export async function resetPassword(token: string, newPassword: string) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');
  if (!user) throw new AppError('Invalid or expired reset token', 400);
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.isFirstLogin = false;
  user.refreshTokens = [];
  await user.save();
}

export function sanitizeUser(user: IUser) {
  return {
    id: user._id.toString(),
    nationalIdMasked: maskNationalId(user.nationalId),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    role: user.role,
    isActive: user.isActive,
    isFirstLogin: user.isFirstLogin,
    lastLoginAt: user.lastLoginAt,
  };
}
