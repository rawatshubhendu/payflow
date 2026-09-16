import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { TaxType } from '@payflow/types';

export interface IBusiness extends Document {
  ownerId: Types.ObjectId;
  name: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  invoicePrefix: string;
  defaultTaxRate?: number;
  defaultTaxType?: TaxType;
  defaultDueDays?: number;
  invoiceNotes?: string;
  thankYouNote?: string;
  notifyInvoiceSent?: boolean;
  notifyPaymentReceived?: boolean;
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
    defaultTaxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    defaultTaxType: {
      type: String,
      enum: ['NONE', 'CGST_SGST', 'IGST'],
      default: 'NONE',
    },
    defaultDueDays: {
      type: Number,
      default: 14,
      min: 0,
      max: 365,
    },
    invoiceNotes: {
      type: String,
      default: undefined,
    },
    thankYouNote: {
      type: String,
      default: undefined,
    },
    notifyInvoiceSent: {
      type: Boolean,
      default: true,
    },
    notifyPaymentReceived: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema);
