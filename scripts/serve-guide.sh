#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Launch the plgg family guide (plgg-press) dev container with hot-reload.
# This is a long-running FOREGROUND server, not a task that completes: it holds
# the terminal until you stop it with Ctrl-C (so there is no success-banner tail
# like the build/test scripts have). The dev container runs `plgg-press dev`
# only — it does NOT regenerate the API reference (`npm run docs:api`), so the
# API pages served are whatever is already on disk under packages/guide/api/.
# External access maps to http://localhost:5181 via the cloudflared tunnel.
echo "=== Serving the guide at http://localhost:5181 (Ctrl-C to stop) ==="
exec docker compose -f workloads/guide/compose.yaml up --build
