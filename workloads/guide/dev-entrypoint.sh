#!/bin/sh -eu
# workloads/guide/dev-entrypoint.sh — the guide dev
# container's runtime command. It runs AFTER compose.yaml
# bind-mounts the host repo over /app, and that ordering is
# the whole point of this file: anything built into the
# image at build time is HIDDEN the moment the mount goes
# live, so the sibling dists plggpress imports
# (plgg, plgg-cli, plgg-view, plgg-server, plgg-http,
# plgg-md, plgg-highlight, plggmatic, plggpress) have to be
# (re)built HERE, on the mounted tree, where Node will
# actually resolve them.
#
# Two install facts this script encodes:
#
#   * `file:` deps do NOT install the linked package's own
#     node_modules, so every package in plggpress's runtime
#     graph needs its OWN `npm install` (the per-package
#     model scripts/npm-install.sh uses). A single install
#     in packages/guide only symlinks plggpress; it never
#     populates the siblings it depends on.
#
#   * packages that run from source resolve their own
#     dev-time dependencies from their own node_modules —
#     the clean-runner masking. Installing each package here
#     keeps that resolution path available in the container.
cd /app

# 1. Install the runtime symlink graph, in dependency order,
#    for the packages plggpress resolves when it serves the
#    guide. Each `file:` package needs its own node_modules
#    because file: links do not cascade; plgg-highlight's
#    install is what puts typescript on its resolution path.
for pkg in \
  plgg \
  plgg-cli \
  plgg-http \
  plgg-view \
  plgg-md \
  plgg-highlight \
  plgg-server \
  plggmatic \
  plgg-sql \
  plgg-db-migration \
  plgg-content \
  plgg-auth \
  plgg-kit \
  plgg-mcp \
  plggpress \
  guide
do
  echo "=== npm install packages/${pkg} ==="
  (cd "packages/${pkg}" && npm install)
done

# 2. Build every sibling dist with the canonical,
#    dependency-ordered builder. It bootstraps plgg-bundle
#    (the build tool, which imports typescript from its own
#    path) and writes each dist onto the mounted tree, where
#    plggpress resolves it — so the dists survive the mount.
echo "=== building sibling dists (scripts/build.sh) ==="
sh scripts/build.sh

# 3. Serve the guide with the TOOLCHAIN dev server
#    (`plgg-bundle dev`) on the container's internal port
#    5173 (compose maps host 5181 -> 5173, the cloudflared
#    tunnel route for plgg-guide.qmu.dev). The port, the
#    allowedHosts (localhost + plgg-guide.qmu.dev), the
#    watched roots (guide content + plggpress theme source),
#    and the `plggpress` source alias all come from
#    bundle.config.ts — so a theme `.ts` edit hot-reloads in
#    the browser with NO restart, not just Markdown. Runs
#    from source, so plgg-bundle's own node_modules (built by
#    scripts/build.sh's npm ci above) and plggpress's must
#    be present — both are. node:http binds all interfaces,
#    so the port is reachable from the host.
echo "=== plgg-bundle dev on :5173 ==="
cd packages/guide
exec npm run dev
