import { PrintRequest } from '../models/PrintRequest';
import { DocumentModel } from '../models/Document';
import { AppError } from '../middleware/errorHandler';
import { ALLOWED_TRANSITIONS, RequestStatus, UserRole } from '../types';
import { Notification } from '../models/Notification';
import { ActivityLog } from '../models/ActivityLog';
import { User } from '../models/User';
import mongoose from 'mongoose';
import crypto from 'crypto';

function generateRequestNumber() {
  const year = new Date().getFullYear();
  const rand = crypto.randomInt(10000, 100000);
  return `PR-${year}-${rand}`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createRequest(teacherId: string, data: any) {
  const doc = await DocumentModel.findById(data.documentId);
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.teacherId.toString() !== teacherId) throw new AppError('Forbidden', 403);
  if (doc.requestId) throw new AppError('Document already attached to a request', 400);

  let requestNumber = generateRequestNumber();
  for (let i = 0; i < 10; i++) {
    const exists = await PrintRequest.findOne({ requestNumber });
    if (!exists) break;
    requestNumber = generateRequestNumber();
  }

  const request = await PrintRequest.create({
    ...data,
    requestNumber,
    teacherId,
    documentId: doc._id,
    status: 'PENDING',
    statusHistory: [{
      previous: 'NONE',
      new: 'PENDING',
      userId: new mongoose.Types.ObjectId(teacherId),
      userRole: 'TEACHER',
      changedAt: new Date(),
      comment: 'Request submitted',
    }],
  });
  doc.requestId = request._id as any;
  await doc.save();

  // notify officers
  const officers = await User.find({ role: 'OFFICER', isActive: true }).select('_id');
  const notifs = officers.map((o) => ({
    userId: o._id,
    type: 'REQUEST_NEW' as const,
    title: 'New print request',
    message: `New request ${requestNumber}: ${request.title}`,
    relatedRequestId: request._id,
    linkUrl: `/requests/${request._id}`,
  }));
  if (notifs.length) await Notification.insertMany(notifs);

  await ActivityLog.create({ userId: teacherId, userRole: 'TEACHER', action: 'REQUEST_CREATED', entityType: 'PrintRequest', entityId: request._id });
  return request;
}

export async function listRequests(user: { id: string; role: UserRole }, query: any) {
  const filter: any = {};
  if (user.role === 'TEACHER') filter.teacherId = user.id;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.teacherId && user.role === 'OFFICER') filter.teacherId = query.teacherId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.search) {
    const safe = escapeRegex(String(query.search).slice(0, 100));
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { requestNumber: { $regex: safe, $options: 'i' } },
    ];
  }
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sort = query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    PrintRequest.find(filter)
      .populate('teacherId', 'fullName department')
      .populate('documentId', 'originalName fileType size')
      .sort(sort as any)
      .skip((page - 1) * limit)
      .limit(limit),
    PrintRequest.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function requestStats(user: { id: string; role: UserRole }) {
  const filter: any = user.role === 'TEACHER' ? { teacherId: user.id } : {};
  const [total, breakdown] = await Promise.all([
    PrintRequest.countDocuments(filter),
    PrintRequest.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const statusBreakdown: Record<string, number> = {};
  breakdown.forEach((s: any) => { statusBreakdown[s._id] = s.count; });
  return { total, statusBreakdown };
}

export async function getRequest(user: { id: string; role: UserRole }, id: string) {
  const req = await PrintRequest.findById(id)
    .populate('teacherId', 'fullName department email phone')
    .populate('documentId');
  if (!req) throw new AppError('Request not found', 404);
  if (user.role === 'TEACHER' && req.teacherId._id.toString() !== user.id) throw new AppError('Forbidden', 403);
  return req;
}

export async function changeStatus(user: { id: string; role: UserRole }, id: string, newStatus: RequestStatus, comment?: string) {
  const req = await PrintRequest.findById(id);
  if (!req) throw new AppError('Request not found', 404);

  const allowed = ALLOWED_TRANSITIONS[req.status as RequestStatus] || [];
  if (!allowed.includes(newStatus)) throw new AppError(`Cannot transition from ${req.status} to ${newStatus}`, 400);

  // role checks
  if (user.role === 'TEACHER') {
    if (!(req.status === 'PENDING' && newStatus === 'CANCELLED') && !(req.status === 'READY_FOR_COLLECTION' && newStatus === 'COLLECTED')) {
      throw new AppError('Not allowed to perform this status change', 403);
    }
    if (req.teacherId.toString() !== user.id) throw new AppError('Forbidden', 403);
  } else {
    // officer - cannot cancel as teacher action; can do all other allowed officer transitions
    if (newStatus === 'CANCELLED') throw new AppError('Only teacher can cancel pending request', 403);
  }

  const previous = req.status;
  req.status = newStatus;
  req.statusHistory.push({
    previous,
    new: newStatus,
    userId: new mongoose.Types.ObjectId(user.id),
    userRole: user.role,
    changedAt: new Date(),
    comment,
  });
  if (newStatus === 'REJECTED') req.rejectionReason = comment;
  if (newStatus === 'COLLECTED') {
    req.collectionConfirmedBy = new mongoose.Types.ObjectId(user.id);
    req.collectionConfirmedAt = new Date();
  }
  await req.save();

  await ActivityLog.create({ userId: user.id, userRole: user.role, action: 'STATUS_CHANGED', entityType: 'PrintRequest', entityId: req._id, details: { previous, new: newStatus } });

  // notify teacher (and officers for certain events)
  const typeMap: Record<string, any> = {
    ACCEPTED: 'REQUEST_ACCEPTED', REJECTED: 'REQUEST_REJECTED', PROCESSING: 'REQUEST_PROCESSING',
    PRINTED: 'REQUEST_PRINTED', READY_FOR_COLLECTION: 'REQUEST_READY', COLLECTED: 'REQUEST_COLLECTED',
    CANCELLED: 'REQUEST_CANCELLED', FAILED: 'REQUEST_FAILED',
  };
  const notifType = typeMap[newStatus];
  if (notifType) {
    const targetUserId = user.role === 'OFFICER' ? req.teacherId.toString() : (await User.findOne({ role: 'OFFICER', isActive: true }))?._id?.toString();
    if (targetUserId) {
      await Notification.create({
        userId: targetUserId,
        type: notifType,
        title: `Request ${newStatus.replace(/_/g, ' ').toLowerCase()}`,
        message: `Request ${req.requestNumber} is now ${newStatus.replace(/_/g, ' ').toLowerCase()}.`,
        relatedRequestId: req._id,
        linkUrl: `/requests/${req._id}`,
      });
    }
  }

  return req;
}
