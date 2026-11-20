import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDocument extends Document {
  _id: Types.ObjectId;
  requestId?: Types.ObjectId;
  teacherId: Types.ObjectId;
  originalName: string;
  mimeType: string;
  size: number;
  storageUrl: string;
  storagePublicId: string;
  fileType: 'PDF' | 'DOCX';
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'PrintRequest' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageUrl: { type: String, required: true },
    storagePublicId: { type: String, required: true },
    fileType: { type: String, enum: ['PDF', 'DOCX'], required: true },
  },
  { timestamps: true }
);

export const DocumentModel: Model<IDocument> = mongoose.model<IDocument>('Document', documentSchema);
