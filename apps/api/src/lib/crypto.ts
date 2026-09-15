import crypto from 'node:crypto';
import { loadEnv } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const PREFIX = 'gcm:v1';
const DELIMITER = '.';

export function getEncryptionKey(): Buffer {
  const env = loadEnv();
  if (env.ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
  }
  return crypto
    .createHmac('sha256', `payflow-encryption:${env.SESSION_SECRET}`)
    .update('payment-gateway-secrets')
    .digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(DELIMITER);
}

export function decryptSecret(payload: string): string {
  const [prefix, ivB64, tagB64, dataB64] = payload.split(DELIMITER);
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}