import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { SubscriptionPlan } from '@payflow/types';

export interface ISubscription extends Document {
  businessId: Types.ObjectId;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'TRIALING' | 'INACTIVE';
  periodStart: Date;
  periodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'BUSINESS'],
      required: true,
      default: 'FREE',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIALING', 'INACTIVE'],
      required: true,
      default: 'ACTIVE',
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Subscription: Model<ISubscription> =
  mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema);