import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

loadEnv({ path: path.join(rootDir, '.env'), quiet: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
  // Proxy browser API calls through the web origin so the session cookie is set
  // on the web hostname and can be read by middleware. Destination is a
  // server-side (non NEXT_PUBLIC) var so it is never sent to the browser.
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
  // Isolate the E2E build from the local dev server's .next so both can run
  // side by side. Enabled by the test:e2e script.
  ...(process.env.PAYFLOW_E2E ? { distDir: 'e2e-dist' } : {}),
};

export default nextConfig;
