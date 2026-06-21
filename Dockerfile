# syntax=docker/dockerfile:1
#
# Single image, two roles (set per service in docker-compose.yml):
#   • web   → the Next.js app  (next start, :3000)
#   • qvac  → the on-device QVAC sidecar (scripts/qvac-server.mjs, :8787)
#
# Debian bookworm (glibc) is required: @qvac/sdk ships glibc prebuilds for its
# native engines (llama.cpp, onnx) and Bare runtime — musl/alpine won't load them.
# We install deps INSIDE the image so the linux-x64 native binaries resolve
# (@napi-rs/canvas-linux-x64-gnu, bare-runtime-linux, etc.) instead of the host's.
FROM node:22-bookworm

# Runtime libs the native engines / canvas need:
#   fontconfig  → @napi-rs/canvas raster
#   libgomp1    → llama.cpp OpenMP
#   libvulkan1  → the llama.cpp prebuild is a Vulkan build and dlopen's the Vulkan
#                 LOADER at addon-load time even for CPU inference (no GPU needed —
#                 with no ICD it just reports 0 devices and runs on CPU).
# build tools are already present in the full node image (node-gyp safe).
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig libgomp1 libvulkan1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first (cached layer). We use `npm install` (not `npm ci`)
# on purpose: the committed package-lock.json is generated on the host (often
# Windows/mac) and omits this platform's optional native deps — e.g.
# @napi-rs/canvas-linux-x64-gnu and its @emnapi/* runtime — so a strict `npm ci`
# would fail "out of sync". `npm install` reconciles and fetches the linux
# binaries. devDependencies are needed for `next build`, so keep them.
COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund

# App source + production build of the web app.
COPY . .
RUN npm run build

EXPOSE 3000 8787

# Default role is the web app; the qvac service overrides `command`.
CMD ["npm", "run", "start"]
