import type { Types } from 'mongoose';
import { Business, type IBusiness } from '../models/Business.js';

function defaultBusinessName(email: string): string {
  return email.split('@')[0] + ' Studio';
}

export async function ensureBusiness(ownerId: Types.ObjectId, email: string): Promise<IBusiness> {
  const existing = await Business.findOne({ ownerId });
  if (existing) {
    return existing;
  }

  return await Business.create({
    ownerId,
    name: defaultBusinessName(email),
    currency: 'INR',
    invoicePrefix: 'INV-',
  });
}
