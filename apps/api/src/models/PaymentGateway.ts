import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IPaymentGateway extends Document {
  businessId: Types.ObjectId;
  provider: string;
  mode: 'test' | 'live';
  keyId: string;
  keySecretEnc: string;
  webhookSecretEnc: string;
  connectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentGatewaySchema = new Schema<IPaymentGateway>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'razorpay',
    },
    mode: {
      type: String,
      enum: ['test', 'live'],
      required: true,
      default: 'test',
    },
    keyId: {
      type: String,
      required: true,
      trim: true,
    },
    keySecretEnc: {
      type: String,
      required: true,
    },
    webhookSecretEnc: {
      type: String,
      required: true,
    },
    connectedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  },
);

export const PaymentGateway: Model<IPaymentGateway> =
  mongoose.models.PaymentGateway || mongoose.model<IPaymentGateway>('PaymentGateway', paymentGatewaySchema);