import { Request } from 'express';

export type UserRole = 'TEACHER' | 'OFFICER';

export interface AuthUser {
  id: string;
  role: UserRole;
  nationalId: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export type RequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'PRINTING'
  | 'PRINTED'
  | 'READY_FOR_COLLECTION'
  | 'COLLECTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['PRINTING', 'FAILED'],
  PRINTING: ['PRINTED', 'FAILED'],
  PRINTED: ['READY_FOR_COLLECTION', 'FAILED'],
  READY_FOR_COLLECTION: ['COLLECTED', 'FAILED'],
  COLLECTED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: ['PROCESSING', 'REJECTED'],
};
