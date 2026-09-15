import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({ path: resolve(process.cwd(), '../../.env') });
loadDotenv();

import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { connectDatabase, disconnectDatabase } from './db/mongoose.js';
import { createApp } from './app.js';

const env = loadEnv();
const logger = createLogger();
const app = createApp(logger);

const server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT }, 'api listening');
  try {
    await connectDatabase(env.MONGODB_URI, logger);
  } catch (error) {
    logger.error({ err: error }, 'mongodb connection failed — health will report degraded');
  }
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
