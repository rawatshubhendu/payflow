import pino from 'pino';
import { loadEnv } from '../config/env.js';

export function createLogger() {
  const env = loadEnv();
  return pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}
