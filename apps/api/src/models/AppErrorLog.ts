import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IAppErrorLog extends Document {
  businessId?: Types.ObjectId;
  requestId?: string;
  method: string;
  path: string;
  status: number;
  code: string;
  message: string;
  detail?: string;
  createdAt: Date;
}

const appErrorLogSchema = new Schema<IAppErrorLog>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: undefined,
      index: true,
    },
    requestId: {
      type: String,
      default: undefined,
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    detail: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

appErrorLogSchema.index({ createdAt: -1 });

export const AppErrorLog: Model<IAppErrorLog> =
  mongoose.models.AppErrorLog || mongoose.model<IAppErrorLog>('AppErrorLog', appErrorLogSchema);