import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { NotificationType } from '@payflow/types';

export interface INotification extends Document {
  businessId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  invoiceId?: Types.ObjectId;
  invoiceNumber?: string;
  amount?: number;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_SENT'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: undefined,
    },
    invoiceNumber: {
      type: String,
      default: undefined,
    },
    amount: {
      type: Number,
      default: undefined,
    },
    read: {
      type: Boolean,
      required: true,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ businessId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);