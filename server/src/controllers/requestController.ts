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

export const createRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.createRequest(req.user!.id, req.body);
  const io = req.app.get('io');
  io?.to('role:OFFICER').emit('request_created', { id: result._id });
  res.status(201).json(ok(result, 'Request submitted'));
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
  const result = await svc.changeStatus(req.user!, req.params.id, req.body.status, req.body.comment);
  const io = req.app.get('io');
  io?.to(`request:${req.params.id}`).emit('status_change', { requestId: req.params.id, status: result.status });
  io?.to(`user:${result.teacherId.toString()}`).emit('status_change', { requestId: req.params.id, status: result.status });
  res.json(ok(result, 'Status updated'));
});

export const cancelRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.changeStatus(req.user!, req.params.id, 'CANCELLED' as any, req.body?.reason);
  res.json(ok(result, 'Request cancelled'));
});

export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.getRequest(req.user!, req.params.id);
  res.json(ok({ statusHistory: (result as any).statusHistory }));
});
