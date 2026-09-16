import type { Types } from 'mongoose';
import { Notification, type INotification } from '../models/Notification.js';

export async function createNotification(input: {
  businessId: Types.ObjectId;
  type: INotification['type'];
  title: string;
  message: string;
  invoiceId?: Types.ObjectId;
  invoiceNumber?: string;
  amount?: number;
}): Promise<INotification> {
  return Notification.create(input);
}