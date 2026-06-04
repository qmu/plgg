# Development workload — build the plgg packages the `example` demo needs, bundle
# its client, and run the SSR + CSR To-Do server on :3000. This is a *dev* image:
# it builds every package from source and runs the dev server (`tsx`), so one
# `docker compose up` is enough to open the demo in a browser. Not a production
# artifact (no multi-stage slimming, no pinned lockfile install).
#
# Build context is the repo root (see workloads/development/compose.yaml).
FROM node:22-slim

WORKDIR /app

# Clean source only — node_modules/dist are excluded by the repo-root
# .dockerignore so nothing host-built leaks in.
COPY . .

# Install + build the example's dependency chain, in order. Each plgg-* package
# is a `file:` dependency symlinked to its built dist, so it must be built before
# the server starts: plgg -> plgg-http -> plgg-view -> plgg-router -> plgg-server,
# then the example client bundle. (plgg-server's build bundles plgg-http +
# plgg-view, so they must exist first; plgg-router is independent (only needs
# plgg) but the example's client bundle AND its server.ts -> app.ts both import
# it, so it must be built too; at runtime the server resolves plgg / plgg-view /
# plgg-router / plgg-server.)
RUN cd packages/plgg        && npm install && npm run build \
 && cd ../plgg-http         && npm install && npm run build \
 && cd ../plgg-view         && npm install && npm run build \
 && cd ../plgg-router       && npm install && npm run build \
 && cd ../plgg-server       && npm install && npm run build \
 && cd ../example           && npm install && npm run build

EXPOSE 3000

# server.ts reads dist/main.js from process.cwd(), so the server must run from
# the example package root.
WORKDIR /app/packages/example
CMD ["npx", "tsx", "src/server.ts"]
