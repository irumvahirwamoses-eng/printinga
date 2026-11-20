import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userRole: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
