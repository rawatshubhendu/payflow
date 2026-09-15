import mongoose from 'mongoose';
import type { Logger } from 'pino';

export async function connectDatabase(uri: string, logger: Logger): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 3000,
  });
  logger.info({ host: mongoose.connection.host }, 'mongodb connected');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
