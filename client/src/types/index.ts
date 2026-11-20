export type UserRole = 'TEACHER' | 'OFFICER';

export interface User {
  id: string;
  nationalIdMasked: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  role: UserRole;
  isActive: boolean;
  isFirstLogin: boolean;
  lastLoginAt?: string;
}

export type RequestStatus =
  | 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'PRINTING' | 'PRINTED'
  | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'REJECTED' | 'CANCELLED' | 'FAILED';

export interface PrintRequest {
  _id: string;
  requestNumber: string;
  teacherId: any;
  documentId: any;
  title: string;
  numberOfPages: number;
  numberOfCopies: number;
  printingType: 'BLACK_AND_WHITE' | 'COLOUR';
  paperSize: 'A4' | 'A3' | 'A5' | 'OTHER';
  sides: 'SINGLE' | 'DOUBLE';
  pageSelection: 'ALL' | 'CUSTOM';
  pageRange?: string;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  priority: 'NORMAL' | 'URGENT';
  description?: string;
  requestedCompletionDate?: string;
  status: RequestStatus;
  rejectionReason?: string;
  statusHistory: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  requestId: string;
  senderId: any;
  senderRole: UserRole;
  content: string;
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedRequestId?: string;
  linkUrl?: string;
  createdAt: string;
}
