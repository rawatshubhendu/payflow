import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { InvoiceStatus, TaxType } from '@payflow/types';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IInvoice extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  invoiceNumber: string;
  items: IInvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxType: TaxType;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date | null;
  dueDate: Date | null;
  publicToken: string;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [invoiceLineItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    taxType: {
      type: String,
      enum: ['NONE', 'CGST_SGST', 'IGST'],
      required: true,
      default: 'NONE',
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
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
      enum: ['DRAFT', 'SENT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
      required: true,
      default: 'DRAFT',
    },
    issueDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    publicToken: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

invoiceSchema.index({ businessId: 1, createdAt: -1 });
invoiceSchema.index({ businessId: 1, status: 1 });
invoiceSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
invoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ publicToken: 1 }, { unique: true, sparse: true });

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);