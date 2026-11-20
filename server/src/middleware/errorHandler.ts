import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { fail } from '../utils/apiResponse';
import { isProduction } from '../config';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message, err.details));
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json(fail('Validation error', err.errors));
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json(fail('Invalid identifier'));
  }
  if ((err as any)?.code === 11000) {
    return res.status(409).json(fail('Duplicate record', (err as any).keyValue));
  }
  // body-parser / multer and other client errors carry an HTTP status.
  const clientStatus = (err as any)?.status || (err as any)?.statusCode;
  if (typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
    return res.status(clientStatus).json(fail((err as Error)?.message || 'Bad request'));
  }
  console.error(err);
  const message = isProduction ? 'Internal server error' : (err as Error)?.message || 'Internal server error';
  return res.status(500).json(fail(message));
}
