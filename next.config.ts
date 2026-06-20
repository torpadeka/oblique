import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Terminal 3 SDK loads a WASM session via a worker thread. Let Node load
  // it directly from node_modules instead of re-bundling it (which emits the
  // worker as ESM but runs it as CJS → "Cannot use import statement outside a
  // module" → uncaughtException). Externalizing fixes dev stability and prod.
  serverExternalPackages: ["@terminal3/t3n-sdk"],
};

export default nextConfig;
