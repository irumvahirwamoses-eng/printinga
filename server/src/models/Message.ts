import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: 'TEACHER' | 'OFFICER';
  content: string;
  readBy: IReadReceipt[];
  createdAt: Date;
  updatedAt: Date;
}

const readReceiptSchema = new Schema<IReadReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'PrintRequest', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['TEACHER', 'OFFICER'], required: true },
    content: { type: String, required: true, trim: true },
    readBy: { type: [readReceiptSchema], default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ requestId: 1, createdAt: 1 });

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
