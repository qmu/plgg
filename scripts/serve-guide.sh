#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Launch the plgg family guide (plggpress) dev container with hot-reload.
# This is a long-running FOREGROUND server, not a task that completes: it holds
# the terminal until you stop it with Ctrl-C (so there is no success-banner tail
# like the build/test scripts have). The dev container runs `plggpress dev`
# and serves the guide's Markdown content directly.
# External access maps to http://localhost:5181 via the cloudflared tunnel.
echo "=== Serving the guide at http://localhost:5181 (Ctrl-C to stop) ==="

# Resolve a real compose engine. A `docker`->`podman` shell alias is
# interactive-only and does NOT exist in this non-interactive script, so we must
# find an actual binary: prefer docker (CI/docker hosts, unchanged behaviour),
# else fall back to podman (this host aliases docker to podman).
if command -v docker >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Need docker or podman to serve the guide" >&2
  exit 1
fi
exec $COMPOSE -f workloads/guide/compose.yaml up --build
