import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IBusiness extends Document {
  ownerId: Types.ObjectId;
  name: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  invoicePrefix: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: undefined,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: undefined,
    },
    phone: {
      type: String,
      trim: true,
      default: undefined,
    },
    address: {
      type: String,
      trim: true,
      default: undefined,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    invoicePrefix: {
      type: String,
      default: 'INV-',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema);
