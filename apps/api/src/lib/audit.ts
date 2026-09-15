import type { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';

export async function writeAuditLog(input: {
  businessId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await AuditLog.create(input);
}