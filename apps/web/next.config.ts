import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

loadEnv({ path: path.join(rootDir, '.env'), quiet: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
  // Isolate the E2E build from the local dev server's .next so both can run
  // side by side. Enabled by the test:e2e script.
  ...(process.env.PAYFLOW_E2E ? { distDir: 'e2e-dist' } : {}),
};

export default nextConfig;
