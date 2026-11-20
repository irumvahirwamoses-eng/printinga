import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Message } from '../models/Message';
import { PrintRequest } from '../models/PrintRequest';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

async function ensureAccess(user: { id: string; role: string }, requestId: string) {
  const reqDoc = await PrintRequest.findById(requestId);
  if (!reqDoc) throw new AppError('Request not found', 404);
  if (user.role === 'TEACHER' && reqDoc.teacherId.toString() !== user.id) throw new AppError('Forbidden', 403);
  return reqDoc;
}

export const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  await ensureAccess(req.user!, req.params.id);
  const messages = await Message.find({ requestId: req.params.id }).sort({ createdAt: 1 }).populate('senderId', 'fullName role');
  res.json(ok(messages));
});

export const sendMessageSchema = z.object({
  body: z.object({ content: z.string().min(1).max(2000) }),
});

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reqDoc = await ensureAccess(req.user!, req.params.id);
  const msg = await Message.create({
    requestId: req.params.id,
    senderId: req.user!.id,
    senderRole: req.user!.role,
    content: req.body.content.trim(),
    readBy: [{ userId: req.user!.id, readAt: new Date() }],
  });
  const io = req.app.get('io');
  io?.to(`request:${req.params.id}`).emit('new_message', msg);

  // Notify the other participant (teacher <-> officer).
  const recipientId = req.user!.role === 'OFFICER'
    ? reqDoc.teacherId.toString()
    : (await User.findOne({ role: 'OFFICER', isActive: true }).select('_id'))?._id?.toString();
  if (recipientId && recipientId !== req.user!.id) {
    const notif = await Notification.create({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'New message',
      message: 'You have a new message on a print request.',
      relatedRequestId: reqDoc._id,
      linkUrl: `/requests/${reqDoc._id}`,
    });
    io?.to(`user:${recipientId}`).emit('notification', notif);
  }

  res.status(201).json(ok(msg));
});
