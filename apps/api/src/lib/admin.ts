import { loadEnv } from '../config/env.js';

export function isAdminEmail(email: string): boolean {
  const admins = loadEnv()
    .ADMIN_EMAILS.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}