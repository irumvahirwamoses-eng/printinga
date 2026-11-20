import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPrintJob extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  officerId: Types.ObjectId;
  printerName?: string;
  requestedSettings: Record<string, unknown>;
  numberOfCopiesPrinted: number;
  outcome: 'SUCCESS' | 'FAILED' | 'REPRINT';
  failureReason?: string;
  printedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const printJobSchema = new Schema<IPrintJob>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'PrintRequest', required: true, index: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    printerName: { type: String },
    requestedSettings: { type: Schema.Types.Mixed, default: {} },
    numberOfCopiesPrinted: { type: Number, required: true, min: 1 },
    outcome: { type: String, enum: ['SUCCESS', 'FAILED', 'REPRINT'], required: true },
    failureReason: { type: String },
    printedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

printJobSchema.index({ requestId: 1, createdAt: -1 });

export const PrintJob: Model<IPrintJob> = mongoose.model<IPrintJob>('PrintJob', printJobSchema);
