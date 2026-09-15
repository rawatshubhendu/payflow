import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  failedVerificationAttempts?: number;
  lastVerificationAttemptAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    verificationCodeHash: {
      type: String,
      default: null,
    },
    verificationCodeExpiresAt: {
      type: Date,
      default: null,
    },
    failedVerificationAttempts: {
      type: Number,
      default: 0,
    },
    lastVerificationAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
