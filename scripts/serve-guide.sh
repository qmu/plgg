#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Launch the plgg family guide (plggpress) dev container with hot-reload.
# The container runs DETACHED: this script starts it in the background and
# returns, so the terminal is freed immediately. The dev container runs
# `plggpress dev` and serves the guide's Markdown content directly.
# External access maps to http://localhost:5181 via the cloudflared tunnel.
# Stop it later with: <compose> -f workloads/guide/compose.yaml down
echo "=== Serving the guide at http://localhost:5181 (detached) ==="

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
$COMPOSE -f workloads/guide/compose.yaml up --build -d
