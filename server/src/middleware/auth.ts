import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { User } from '../models/User';
import { AuthRequest, UserRole } from '../types';
import { AppError } from './errorHandler';

interface JwtPayload {
  sub: string;
  role: UserRole;
  nationalId: string;
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return next(new AppError('Authentication required', 401));
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await User.findById(decoded.sub).select('nationalId role isActive');
    if (!user || !user.isActive) return next(new AppError('Account not available', 401));
    req.user = { id: user._id.toString(), role: user.role, nationalId: user.nationalId };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Forbidden', 403));
    next();
  };
}
