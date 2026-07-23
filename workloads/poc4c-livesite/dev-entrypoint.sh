#!/bin/sh -eu
# workloads/poc4c-livesite/dev-entrypoint.sh — the PoC 4c
# dev container's runtime command, on the guide/PoC-4
# recipe: it runs AFTER compose.yaml bind-mounts the host
# repo over /app, so every install/build below lands on the
# mounted tree where Node actually resolves it.
#
# Two processes, one container (PoC 4's architecture, kept):
#
#   1. the INTERNAL plggpress dev server (plgg-bundle dev,
#      :5175) rendering the seeded corpus copy with real
#      hot reload — its HTML carries the location.reload()
#      live-reload script;
#   2. the SHELL server (:5173, mapped to host 5198) — the
#      session-bearing page WITHOUT that script, plus
#      POST /api/session, POST /api/edit, and the
#      INJECTING /docs/* + /__plgg_reload proxy onto 1.
#
# What 4c adds to the recipe: the proxy rewrites each
# proxied page, swapping the dev server's reload script for
# dist/patch.js — so `npm run build` here must produce BOTH
# bundles (main.js, the shell client; patch.js, the
# injected one).
cd /app

# Install the runtime symlink graph, in dependency order
# (file: links do not cascade — every package needs its own
# node_modules; plgg-highlight's install is what puts
# typescript on its resolution path). plgg-poc4b-coedit is
# here because 4c reuses its proven edit core by relative
# source import (src/poc4b.ts).
for pkg in \
  plgg \
  plgg-cli \
  plgg-http \
  plgg-view \
  plgg-md \
  plgg-highlight \
  plgg-server \
  plggpress \
  plgg-kit \
  plgg-poc1-search \
  plgg-poc4b-coedit \
  plgg-poc4c-livesite
do
  echo "=== npm install packages/${pkg} ==="
  (cd "packages/${pkg}" && npm install)
done

# Build every sibling dist with the canonical,
# dependency-ordered builder (it bootstraps plgg-bundle's
# own node_modules first).
echo "=== building sibling dists (scripts/build.sh) ==="
sh scripts/build.sh

cd packages/plgg-poc4c-livesite

# Seed the agent-editable corpus copy only when absent:
# content/ lives on the mounted host tree, so edits survive
# container restarts; `npm run reset-content` is the
# explicit reset.
if [ ! -d content ]; then
  echo "=== seeding content/ from packages/guide ==="
  npm run seed-content
fi

# Bundle BOTH clients onto the mounted tree: dist/main.js
# (the shell) and dist/patch.js (the one injected into the
# real rendered page).
echo "=== building the shell + patch bundles ==="
npm run build

# 1. the internal doc server (backgrounded; the shell
#    proxies to it). DOCS_BASE must match the /docs/ proxy
#    prefix — it is baked into every rendered href.
echo "=== plgg-bundle dev (internal docs) on :5175 ==="
DOCS_BASE=/docs/ npm run dev:docs &

# 2. the shell server on :5173 (host 5198 →
#    plgg-poc4c.qmu.dev). node:http binds all interfaces.
echo "=== PoC 4c shell on :5173 ==="
exec node src/entrypoints/serve.ts
