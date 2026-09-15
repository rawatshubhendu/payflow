import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { PaymentStatus } from '@payflow/types';

export interface IPayment extends Document {
  businessId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  gatewayEventId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      required: true,
    },
    gatewayOrderId: {
      type: String,
      required: true,
    },
    gatewayPaymentId: {
      type: String,
      default: undefined,
    },
    gatewayEventId: {
      type: String,
      default: undefined,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'],
      required: true,
      default: 'CREATED',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ gatewayOrderId: 1 }, { unique: true });
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ gatewayEventId: 1 }, { unique: true, sparse: true });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);