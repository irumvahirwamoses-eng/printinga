import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IPrinter {
  _id: Types.ObjectId;
  name: string;
  model?: string;
  location?: string;
  isActive: boolean;
  supportedSizes: string[];
  supportsColour: boolean;
  supportsDuplex: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const printerSchema = new Schema<IPrinter>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    model: { type: String, trim: true },
    location: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    supportedSizes: { type: [String], default: ['A4', 'A3', 'A5'] },
    supportsColour: { type: Boolean, default: true },
    supportsDuplex: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Printer: Model<IPrinter> = mongoose.model<IPrinter>('Printer', printerSchema);
