#!/bin/sh -eu
# Gate: each dev workload container actually BUILDS and reaches a running,
# request-answering state — not just that `docker build`/`up` exits 0.
#
# Neither workloads/guide nor workloads/development carries a container
# healthcheck, and `docker compose up -d --build` returning 0 proves far
# less than it looks like it does:
#   * guide's image COPYs source only; all the real work (per-package npm
#     installs across 11 sibling packages, scripts/build.sh, then
#     `npm run dev`) runs in dev-entrypoint.sh AFTER compose's bind mount
#     hides the image, so a broken install/build list can leave the
#     container running with the dev server never actually up.
#   * development's image builds everything at `docker build` time; `up`
#     only proves the CMD (`tsx src/server.ts`) was spawned, not that it
#     bound its port and answered a request.
# This gate actually requests each workload's root path and fails unless
# it gets a 200 inside a generous timeout, so a base-image bump or a
# drifted provisioning list fails the build instead of waiting for a human
# to run `docker compose up` by hand before merging.
#
# Docker/podman are OPTIONAL here, the same policy gate-cross-runtime.sh
# uses for Deno/Bun: a machine without either still runs check-all, with
# this gate reported as skipped. The hosted run-tests.yml runner
# (ubuntu-latest) has Docker, so the real build+boot check runs there on
# every PR and push to main.
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

echo "=== Gate: workload containers build and answer a request ==="

if command -v docker >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "gate-workload-startup: no docker or podman on PATH, skipped"
  exit 0
fi

created_env=0
if [ ! -f .env ]; then
  # workloads/guide/compose.yaml declares .env as its env_file; an empty
  # file is enough to start (see .env.example) and this gate never writes
  # real credentials into it.
  : > .env
  created_env=1
fi

fail=0

cleanup() {
  $COMPOSE -f workloads/development/compose.yaml down -v --remove-orphans >/dev/null 2>&1 || true
  $COMPOSE -f workloads/guide/compose.yaml down -v --remove-orphans >/dev/null 2>&1 || true
  if [ "$created_env" -eq 1 ]; then
    rm -f .env
  fi
}
trap cleanup EXIT

# $1 workload name, $2 compose file, $3 probe URL, $4 timeout in ms.
check_workload() {
  echo "--- $1: docker compose up -d --build ---"
  if ! $COMPOSE -f "$2" up -d --build; then
    echo "gate-workload-startup: $1 failed to build/start" >&2
    fail=1
    return
  fi

  echo "--- $1: waiting for $3 (timeout ${4}ms) ---"
  if node "$REPO_ROOT/scripts/pollReady.ts" "$3" "$4"; then
    echo "--- $1: answered a request, ok ---"
  else
    echo "gate-workload-startup: $1 never answered $3 within ${4}ms" >&2
    $COMPOSE -f "$2" logs >&2 || true
    fail=1
  fi
}

# development's build does all the npm install/build work up front, so
# once `up` returns the server starts in seconds; a 2-minute probe timeout
# covers a cold, uncached runner.
check_workload development workloads/development/compose.yaml \
  "http://localhost:3000/" 120000

# guide's build is nearly instant (COPY only); the heavy lifting — 11
# per-package npm installs, scripts/build.sh, then the dev server —
# happens in dev-entrypoint.sh after the container is already "up", so
# this one needs a much longer probe timeout.
check_workload guide workloads/guide/compose.yaml \
  "http://localhost:5181/" 600000

if [ "$fail" -ne 0 ]; then
  echo "gate-workload-startup: FAILED" >&2
  exit 1
fi
echo "gate-workload-startup: both workloads build and answer requests"
