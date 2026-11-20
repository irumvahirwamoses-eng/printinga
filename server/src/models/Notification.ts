import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType =
  | 'REQUEST_NEW'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_PROCESSING'
  | 'REQUEST_PRINTED'
  | 'REQUEST_READY'
  | 'REQUEST_COLLECTED'
  | 'REQUEST_CANCELLED'
  | 'REQUEST_FAILED'
  | 'NEW_MESSAGE';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedRequestId?: Types.ObjectId;
  relatedPrintJobId?: Types.ObjectId;
  readAt?: Date;
  linkUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    relatedRequestId: { type: Schema.Types.ObjectId, ref: 'PrintRequest' },
    relatedPrintJobId: { type: Schema.Types.ObjectId, ref: 'PrintJob' },
    readAt: { type: Date },
    linkUrl: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);
