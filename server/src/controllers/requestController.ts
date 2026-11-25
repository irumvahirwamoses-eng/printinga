import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import * as svc from '../services/requestService';

export const createRequestSchema = z.object({
  body: z.object({
    documentId: z.string().min(1),
    title: z.string().min(1),
    numberOfPages: z.coerce.number().int().min(1),
    numberOfCopies: z.coerce.number().int().min(1),
    printingType: z.enum(['BLACK_AND_WHITE', 'COLOUR']),
    paperSize: z.enum(['A4', 'A3', 'A5', 'OTHER']),
    sides: z.enum(['SINGLE', 'DOUBLE']),
    pageSelection: z.enum(['ALL', 'CUSTOM']),
    pageRange: z.string().optional(),
    orientation: z.enum(['PORTRAIT', 'LANDSCAPE']),
    priority: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
    description: z.string().optional(),
    requestedCompletionDate: z.string().optional(),
  }),
});

function emitNotification(io: any, notification: any) {
  if (!io || !notification) return;
  const userId = notification.userId?.toString?.() || notification.userId;
  if (userId) io.to(`user:${userId}`).emit('notification', notification);
}

export const createRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { request, notifications } = await svc.createRequest(req.user!.id, req.body);
  const io = req.app.get('io');
  io?.to('role:OFFICER').emit('request_created', { id: request._id });
  notifications.forEach((n: any) => emitNotification(io, n));
  res.status(201).json(ok(request, 'Request submitted'));
});

export const listRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listRequests(req.user!, req.query as any);
  res.json(ok(result));
});

export const stats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.requestStats(req.user!);
  res.json(ok(result));
});

export const getRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.getRequest(req.user!, req.params.id);
  res.json(ok(result));
});

export const changeStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING','ACCEPTED','PROCESSING','PRINTING','PRINTED','READY_FOR_COLLECTION','COLLECTED','REJECTED','CANCELLED','FAILED']),
    comment: z.string().optional(),
  }),
});

export const changeStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { request, notification } = await svc.changeStatus(req.user!, req.params.id, req.body.status, req.body.comment);
  const io = req.app.get('io');
  io?.to(`request:${req.params.id}`).emit('status_change', { requestId: req.params.id, status: request.status });
  io?.to(`user:${request.teacherId.toString()}`).emit('status_change', { requestId: req.params.id, status: request.status });
  emitNotification(io, notification);
  res.json(ok(request, 'Status updated'));
});

export const cancelRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { request, notification } = await svc.changeStatus(req.user!, req.params.id, 'CANCELLED' as any, req.body?.reason);
  const io = req.app.get('io');
  io?.to(`request:${req.params.id}`).emit('status_change', { requestId: req.params.id, status: request.status });
  emitNotification(io, notification);
  res.json(ok(request, 'Request cancelled'));
});

export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.getRequest(req.user!, req.params.id);
  res.json(ok({ statusHistory: (result as any).statusHistory }));
});
