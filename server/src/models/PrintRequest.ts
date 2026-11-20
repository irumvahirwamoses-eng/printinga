import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IStatusHistory {
  previous: string;
  new: string;
  userId: Types.ObjectId;
  userRole: 'TEACHER' | 'OFFICER';
  changedAt: Date;
  comment?: string;
}

export interface IPrintRequest extends Document {
  _id: Types.ObjectId;
  requestNumber: string;
  teacherId: Types.ObjectId;
  documentId: Types.ObjectId;
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
  requestedCompletionDate?: Date;
  status: string;
  rejectionReason?: string;
  statusHistory: IStatusHistory[];
  collectionConfirmedBy?: Types.ObjectId;
  collectionConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    previous: { type: String, required: true },
    new: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['TEACHER', 'OFFICER'], required: true },
    changedAt: { type: Date, default: Date.now },
    comment: { type: String },
  },
  { _id: false }
);

const printRequestSchema = new Schema<IPrintRequest>(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    title: { type: String, required: true, trim: true },
    numberOfPages: { type: Number, required: true, min: 1 },
    numberOfCopies: { type: Number, required: true, min: 1 },
    printingType: { type: String, enum: ['BLACK_AND_WHITE', 'COLOUR'], required: true },
    paperSize: { type: String, enum: ['A4', 'A3', 'A5', 'OTHER'], required: true },
    sides: { type: String, enum: ['SINGLE', 'DOUBLE'], required: true },
    pageSelection: { type: String, enum: ['ALL', 'CUSTOM'], required: true },
    pageRange: { type: String },
    orientation: { type: String, enum: ['PORTRAIT', 'LANDSCAPE'], required: true },
    priority: { type: String, enum: ['NORMAL', 'URGENT'], default: 'NORMAL', index: true },
    description: { type: String },
    requestedCompletionDate: { type: Date },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'PROCESSING', 'PRINTING', 'PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED', 'REJECTED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String },
    statusHistory: { type: [statusHistorySchema], default: [] },
    collectionConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    collectionConfirmedAt: { type: Date },
  },
  { timestamps: true }
);

printRequestSchema.index({ teacherId: 1, createdAt: -1 });
printRequestSchema.index({ status: 1, createdAt: -1 });

export const PrintRequest: Model<IPrintRequest> = mongoose.model<IPrintRequest>('PrintRequest', printRequestSchema);
