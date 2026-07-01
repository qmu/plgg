#!/bin/sh -eu
# workloads/guide/dev-entrypoint.sh — the guide dev
# container's runtime command. It runs AFTER compose.yaml
# bind-mounts the host repo over /app, and that ordering is
# the whole point of this file: anything built into the
# image at build time is HIDDEN the moment the mount goes
# live, so the seven sibling dists plgg-press imports
# (plgg, plgg-view, plgg-server, plgg-http, plgg-md,
# plgg-highlight, plgg-press) have to be (re)built HERE, on
# the mounted tree, where Node will actually resolve them.
#
# Two install facts this script encodes:
#
#   * `file:` deps do NOT install the linked package's own
#     node_modules, so every package in plgg-press's runtime
#     graph needs its OWN `npm install` (the per-package
#     model scripts/npm-install.sh uses). A single install
#     in packages/guide only symlinks plgg-press; it never
#     populates the siblings it depends on.
#
#   * plgg-highlight imports `typescript` from its OWN
#     resolution path, so typescript must land in
#     packages/plgg-highlight/node_modules — the clean-runner
#     masking. Installing plgg-highlight here does exactly
#     that (typescript is its dev/peer dep).
cd /app

# 1. Install the runtime symlink graph, in dependency order,
#    for the packages plgg-press resolves when it serves the
#    guide. Each `file:` package needs its own node_modules
#    because file: links do not cascade; plgg-highlight's
#    install is what puts typescript on its resolution path.
for pkg in \
  plgg \
  plgg-http \
  plgg-view \
  plgg-md \
  plgg-highlight \
  plgg-server \
  plgg-press \
  guide
do
  echo "=== npm install packages/${pkg} ==="
  (cd "packages/${pkg}" && npm install)
done

# 2. Build every sibling dist with the canonical,
#    dependency-ordered builder. It bootstraps plgg-bundle
#    (the build tool, which imports typescript from its own
#    path) and writes each dist onto the mounted tree, where
#    plgg-press resolves it — so the dists survive the mount.
echo "=== building sibling dists (scripts/build.sh) ==="
sh scripts/build.sh

# 3. Serve the guide with plgg-press dev on the container's
#    internal port 5173 (compose maps host 5181 -> 5173, the
#    cloudflared tunnel route for plgg-guide.qmu.dev). PORT
#    overrides plgg-press's 5181 default; allowedHosts
#    (localhost + plgg-guide.qmu.dev) come from site.config.ts
#    so the tunnel Host header is accepted. node:http binds
#    all interfaces, so the port is reachable from the host.
echo "=== plgg-press dev on :5173 ==="
cd packages/guide
exec env PORT=5173 npm run dev
