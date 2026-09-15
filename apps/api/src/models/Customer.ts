import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ICustomer extends Document {
  businessId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
    company: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ businessId: 1, createdAt: -1 });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);