#!/bin/sh -eu
# workloads/poc4-edit/dev-entrypoint.sh — the PoC 4 dev
# container's runtime command, on the guide workload's
# recipe: it runs AFTER compose.yaml bind-mounts the host
# repo over /app, so every install/build below lands on
# the mounted tree where Node actually resolves it.
#
# Two processes, one container (the ticket's locked
# architecture):
#
#   1. the INTERNAL plggpress dev server (plgg-bundle
#      dev, :5175) rendering the seeded corpus copy with
#      real hot reload — its HTML carries the
#      location.reload() live-reload script;
#   2. the SHELL server (:5173, mapped to host 5187) —
#      the session-bearing page WITHOUT that script, plus
#      POST /api/session, POST /api/edit, and the
#      /docs/* + /__plgg_reload streaming proxy onto 1.
cd /app

# Install the runtime symlink graph, in dependency order
# (file: links do not cascade — every package needs its
# own node_modules; plgg-highlight's install is what puts
# typescript on its resolution path).
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
  plgg-poc4-edit
do
  echo "=== npm install packages/${pkg} ==="
  (cd "packages/${pkg}" && npm install)
done

# Build every sibling dist with the canonical,
# dependency-ordered builder (it bootstraps plgg-bundle's
# own node_modules first).
echo "=== building sibling dists (scripts/build.sh) ==="
sh scripts/build.sh

cd packages/plgg-poc4-edit

# Seed the agent-editable corpus copy only when absent:
# content/ lives on the mounted host tree, so edits
# survive container restarts; `npm run reset-content`
# is the explicit reset.
if [ ! -d content ]; then
  echo "=== seeding content/ from packages/guide ==="
  npm run seed-content
fi

# Bundle the shell client onto the mounted tree.
echo "=== building the shell bundle ==="
npm run build

# 1. the internal doc server (backgrounded; the shell
#    proxies to it). DOCS_BASE must match the /docs/
#    proxy prefix — it is baked into every rendered href.
echo "=== plgg-bundle dev (internal docs) on :5175 ==="
DOCS_BASE=/docs/ npm run dev:docs &

# 2. the shell server on :5173 (host 5187 →
#    plgg-poc4.qmu.dev). node:http binds all interfaces.
echo "=== PoC 4 shell on :5173 ==="
exec node src/entrypoints/serve.ts
