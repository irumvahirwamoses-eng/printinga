import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import * as svc from '../services/teacherService';
import { maskNationalId } from '../utils/maskNationalId';

export const createTeacherSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    nationalId: z.string().regex(/^\d{16}$/),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    department: z.string().optional(),
  }),
});

export const updateTeacherSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    department: z.string().optional(),
  }).strict(),
});

export const setTeacherStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const teacherIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.createTeacher(req.body);
  res.status(201).json(ok({ id: result.teacher._id, tempPassword: result.tempPassword }, 'Teacher registered'));
});

export const listTeachers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listTeachers(req.query as any);
  res.json(ok(result));
});

export const getTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.getTeacher(req.params.id);
  res.json(ok(result));
});

export const updateTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.updateTeacher(req.params.id, req.body);
  res.json(ok({ id: result._id }, 'Teacher updated'));
});

export const setTeacherStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.setTeacherStatus(req.params.id, req.body.isActive);
  res.json(ok({ id: result._id, isActive: result.isActive }, 'Status updated'));
});

export const resetTeacherPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.resetTeacherPassword(req.params.id);
  res.json(ok(result, 'Password reset'));
});

export const deleteTeacher = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteTeacher(req.params.id);
  res.json(ok(result, 'Teacher deleted'));
});

export const previewBulkImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'File required' });
    return;
  }
  const result = await svc.previewBulkImport(req.file.buffer, req.file.originalname);
  res.json(ok({
    ...result,
    rows: result.rows.map((r: any) => ({ ...r, nationalId: r.nationalId ? maskNationalId(r.nationalId) : '' })),
  }));
});

export const confirmBulkImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'File required' });
    return;
  }
  const result = await svc.confirmBulkImport(req.file.buffer, req.file.originalname);
  res.json(ok(result));
});
