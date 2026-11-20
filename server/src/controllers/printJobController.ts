import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { ALLOWED_TRANSITIONS, AuthRequest, AuthUser, RequestStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { PrintJob } from '../models/PrintJob';
import { PrintRequest } from '../models/PrintRequest';
import { changeStatus } from '../services/requestService';
import { ActivityLog } from '../models/ActivityLog';
import { Notification } from '../models/Notification';

export const createPrintJobSchema = z.object({
  body: z.object({
    requestId: z.string().min(1),
    printerName: z.string().optional(),
    requestedSettings: z.record(z.string(), z.any()).optional(),
    numberOfCopiesPrinted: z.coerce.number().int().min(1),
    outcome: z.enum(['SUCCESS', 'FAILED', 'REPRINT']).default('SUCCESS'),
    failureReason: z.string().optional(),
  }),
});

export const createPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { requestId, printerName, requestedSettings, numberOfCopiesPrinted, outcome, failureReason } = req.body;
  const request = await PrintRequest.findById(requestId);
  if (!request) throw new AppError('Request not found', 404);

  const job = await PrintJob.create({
    requestId,
    officerId: req.user!.id,
    printerName,
    requestedSettings: requestedSettings || {},
    numberOfCopiesPrinted,
    outcome,
    failureReason,
    printedAt: new Date(),
  });

  // Update request status based on outcome
  if (outcome === 'SUCCESS' || outcome === 'REPRINT') {
    const steps: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'PROCESSING', 'PRINTING', 'PRINTED'],
      ACCEPTED: ['PROCESSING', 'PRINTING', 'PRINTED'],
      PROCESSING: ['PRINTING', 'PRINTED'],
      PRINTING: ['PRINTED'],
      PRINTED: [],
      READY_FOR_COLLECTION: [],
      COLLECTED: [],
    };
    const seq = steps[request.status] || [];
    for (const s of seq) {
      await changeStatus(req.user!, requestId, s as any, s === 'PRINTED' ? 'Physical printing confirmed' : 'Auto transition for print job');
    }
  } else if (outcome === 'FAILED') {
    const failSteps: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'PROCESSING', 'FAILED'],
      ACCEPTED: ['PROCESSING', 'FAILED'],
      PROCESSING: ['FAILED'],
      PRINTING: ['FAILED'],
      PRINTED: ['FAILED'],
      READY_FOR_COLLECTION: ['FAILED'],
    };
    const seq = failSteps[request.status] || [];
    for (const s of seq) {
      await changeStatus(req.user!, requestId, s as any, s === 'FAILED' ? (failureReason || 'Print failed') : 'Auto transition for print failure');
    }
  }

  await ActivityLog.create({ userId: req.user!.id, userRole: 'OFFICER', action: 'PRINT_JOB_RECORDED', entityType: 'PrintJob', entityId: job._id, details: { requestId, outcome } });
  res.status(201).json(ok(job, 'Print job recorded'));
});

export const listPrintJobs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.requestId) filter.requestId = req.query.requestId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [items, total] = await Promise.all([
    PrintJob.find(filter).populate('officerId', 'fullName').populate('requestId', 'requestNumber title').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    PrintJob.countDocuments(filter),
  ]);
  res.json(ok({ items, total, page, limit }));
});

export const getPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id).populate('officerId', 'fullName').populate('requestId');
  if (!job) throw new AppError('Print job not found', 404);
  res.json(ok(job));
});

// Only run a transition when the state machine allows it. `createPrintJob`
// usually already advanced the request to PRINTED/FAILED, in which case the
// confirm/fail endpoints only update the job outcome.
async function transitionIfAllowed(user: AuthUser, requestId: string, target: RequestStatus, comment: string) {
  const request = await PrintRequest.findById(requestId);
  if (!request) return;
  const allowed = ALLOWED_TRANSITIONS[request.status as RequestStatus] || [];
  if (allowed.includes(target)) {
    await changeStatus(user, requestId, target, comment);
  }
}

export const confirmPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id);
  if (!job) throw new AppError('Print job not found', 404);
  job.outcome = 'SUCCESS';
  await job.save();
  await transitionIfAllowed(req.user!, job.requestId.toString(), 'PRINTED', 'Printing confirmed');
  res.json(ok(job));
});

export const failPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id);
  if (!job) throw new AppError('Print job not found', 404);
  job.outcome = 'FAILED';
  job.failureReason = req.body?.reason;
  await job.save();
  await transitionIfAllowed(req.user!, job.requestId.toString(), 'FAILED', req.body?.reason || 'Print failed');
  res.json(ok(job));
});
