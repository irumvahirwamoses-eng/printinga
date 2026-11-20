import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import { Notification } from '../models/Notification';
import { AppError } from '../middleware/errorHandler';

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter: any = { userId: req.user!.id };
  if (req.query.unread === 'true') filter.isRead = false;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user!.id, isRead: false }),
  ]);
  res.json(ok({ items, total, unreadCount, page, limit }));
});

export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) throw new AppError('Notification not found', 404);
  res.json(ok(notif));
});

export const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json(ok(null, 'All marked as read'));
});
