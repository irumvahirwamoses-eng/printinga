import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Printer } from '../models/Printer';

export const createPrinterSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    model: z.string().optional(),
    location: z.string().optional(),
    supportedSizes: z.array(z.string()).optional(),
    supportsColour: z.boolean().optional(),
    supportsDuplex: z.boolean().optional(),
  }),
});

export const updatePrinterSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    model: z.string().optional(),
    location: z.string().optional(),
    isActive: z.boolean().optional(),
    supportedSizes: z.array(z.string()).optional(),
    supportsColour: z.boolean().optional(),
    supportsDuplex: z.boolean().optional(),
  }).strict(),
});

export const listPrinters = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const items = await Printer.find().sort({ createdAt: -1 });
  res.json(ok(items));
});

export const createPrinter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const printer = await Printer.create(req.body);
  res.status(201).json(ok(printer));
});

export const updatePrinter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const printer = await Printer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!printer) throw new AppError('Printer not found', 404);
  res.json(ok(printer));
});
