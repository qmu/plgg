---
created_at: 2026-05-31T13:40:31+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash: 011151f
category: Added
depends_on:
---

# Add a `workloads/development` Docker workload that runs the `example` so you can see it work

## Overview

There is no one-command way to *run and see* the `example` To-Do demo —
contributors must hand-bootstrap the monorepo (`npm install` per package, build
the `plgg-*` dist chain, `vite build` the client, then `tsx src/server.ts`).
Add a **`workloads/development/`** directory with a **Dockerfile** (plus a
Compose file and README) that does all of that in one image and serves the SSR +
CSR demo on **port 3000**, so `docker compose up` (or `docker run`) is enough to
open it in a browser.

This is a **development/operation** convenience, not a production image: it
builds the packages from source inside the container and runs the dev server
(`tsx src/server.ts`). Scope is deliberately small — make the existing example
reproducibly runnable; do not add CI, multi-stage prod hardening, or a published
artifact.

## Key Files

- `packages/example/src/server.ts` — the run target: `tsx src/server.ts` listens
  on `:3000`, serves `/` (SSR page via plgg-server `pageResponse`) and `/main.js`
  (reads `<cwd>/dist/main.js`). **cwd must be the example package root.**
- `packages/example/vite.config.ts` — `vite build` emits the client bundle to
  `dist/main.js` (lib entry `src/main.ts`, ES).
- `packages/example/package.json` — scripts `build` (client bundle) and
  `serve:ssr` (`tsx src/server.ts`); `file:` deps `plgg`, `plgg-view`,
  `plgg-server`.
- `scripts/build.sh`, `scripts/npm-install.sh` — the canonical bootstrap order
  (note: `npm-install.sh` currently omits `plgg-http`/`plgg-router`; the image
  installs what it needs explicitly rather than relying on it).
- Runtime dependency chain for the example: `plgg` → `plgg-http` → `plgg-view` →
  `plgg-server` (built dist, via `file:` symlinks), then the example client
  bundle. `plgg-server`'s dist bundles `plgg-http`/`plgg-view`, so at *runtime*
  the server only resolves `plgg`, `plgg-view`, `plgg-server`; `plgg-http` is a
  *build-time* dep of `plgg-server`.

## Implementation Steps

1. Add a repo-root `.dockerignore` excluding `**/node_modules`, `**/dist`,
   `**/coverage`, `.git`, `.workaholic` so the build context is small and the
   image builds from clean source.
2. Add `workloads/development/Dockerfile` (build context = repo root):
   - `FROM node:22-slim`, `WORKDIR /app`, copy the repo.
   - Install + build the minimal chain in dependency order: `plgg` →
     `plgg-http` → `plgg-view` → `plgg-server` (each `npm install` then
     `npm run build`), so every `file:` symlink resolves to a built dist.
   - In `packages/example`: `npm install` then `npm run build` (client bundle).
   - `EXPOSE 3000`, `WORKDIR /app/packages/example`,
     `CMD ["npx","tsx","src/server.ts"]`.
3. Add `workloads/development/compose.yaml` mapping `3000:3000`, build context
   `../..`, dockerfile `workloads/development/Dockerfile`.
4. Add `workloads/development/README.md`: what it is, `docker compose up --build`,
   open `http://localhost:3000`, and the plain `docker build`/`run` equivalent.
5. **Verify it actually works**: build the image, run it, and confirm
   `GET /` returns the SSR To-Do markup and `GET /main.js` returns the client
   bundle (the demo's whole point is "see it work").

## Considerations

- **Run from the example package dir.** `server.ts` resolves `dist/main.js` from
  `process.cwd()`, so the image's final `WORKDIR` must be
  `/app/packages/example` (or set cwd in CMD).
- **`file:` deps are symlinks to dist.** Each package must be built before the
  server starts; build in dependency order or the symlinked dist is empty.
- **Dev image, not prod.** Builds from source and runs `tsx`; no multi-stage
  slimming. Keep it that way unless a separate prod workload is later requested.
- **Node version.** Pin `node:22-slim` (LTS) — Vite 8 / tsx need Node ≥ 20.19 /
  22.12; avoids surprises vs the host's Node 24.
- **Don't depend on `npm-install.sh`** for the build (it omits
  `plgg-http`/`plgg-router`); the Dockerfile installs the packages it builds.

## Considerations (policy lens — Operation)

Delivery/runtime convenience: a single reproducible path to run the system, with
a graceful-degradation note already in `server.ts` (a missing client build
returns a 404 for `/main.js` rather than crashing). Keep the workload's surface
small and its README the single source of "how to run it locally."

## Final Report

Completed and **verified by actually building and running the image**. Added:

- `workloads/development/Dockerfile` — `node:22-slim`, builds the chain
  `plgg → plgg-http → plgg-view → plgg-server`, then the example client bundle;
  final `WORKDIR /app/packages/example`, `CMD npx tsx src/server.ts`, `EXPOSE 3000`.
- `workloads/development/compose.yaml` — context `../..`, maps `3000:3000`.
- `workloads/development/README.md` — `docker compose ... up --build` + the plain
  `docker build`/`run` equivalent, and what to expect at `/` and `/main.js`.
- `.dockerignore` (repo root) — excludes `node_modules`/`dist`/`coverage`/`.git`/
  `.workaholic` so the image builds from clean source (host native binaries never
  leak in).

Verification (real, not asserted):

- `docker build` succeeded; the example client bundle built to `dist/main.js`
  (27.18 kB / 6.82 kB gzip).
- `docker run -p 3000:3000`; the server logged `listening on
  http://localhost:3000` within ~4s.
- `GET /` returned the full **server-rendered** To-Do document (the
  `view(init)` markup + `<script type="module" src="/main.js">`).
- `GET /main.js` returned the 27,186-byte client bundle (begins with the bundled
  `plgg` dist). Test container torn down; image `plgg-example:latest` kept.

### Discovered Insights

- **Insight**: `scripts/npm-install.sh` installs plgg, plgg-kit, plgg-foundry,
  plgg-view, plgg-server, plgg-fetch, plgg-sql, example — but **omits
  `plgg-http` and `plgg-router`**, which `scripts/build.sh` nonetheless builds.
  A clean checkout that relies on `npm-install.sh` then `build.sh` would fail to
  build `plgg-http`/`plgg-router` (no toolchain installed). The Dockerfile sidesteps
  this by installing each package it builds.
  **Context**: Worth fixing `npm-install.sh` to include the two packages (small,
  separate ticket) so the canonical bootstrap and the build order agree.
- **Insight**: At **runtime** the example server only resolves `plgg`,
  `plgg-view`, `plgg-server` — `plgg-server`'s dist already bundles `plgg-http`
  and `plgg-view`, so `plgg-http` is purely a *build-time* dependency. The image
  builds it but does not need it present for `tsx src/server.ts`.
  **Context**: Lets a future slimmed/prod image drop build-only packages from the
  runtime layer.
