import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pinned explicitly: the workspace lockfile sits beside a `contract/` package, and serverless
  // function tracing must resolve from this root rather than whatever Next infers.
  outputFileTracingRoot: path.resolve(process.cwd()),
  transpilePackages: ['nova-contract'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
