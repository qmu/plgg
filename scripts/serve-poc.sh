#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Launch one PoC-fleet workload (workloads/<name>/compose.yaml) DETACHED —
# the single canonical runner for every plggpress PoC container, so the fleet
# never accumulates one bespoke serve script per PoC (command-scripts policy).
#
#   scripts/serve-poc.sh poc-portal     # → http://localhost:5183
#
# Stop it later with: <compose> -f workloads/<name>/compose.yaml down
#
# Credentials come from ONE git-ignored .env at the repo root (developer
# convention, 2026-07-13; see .env.example): its KEY=value lines are exported
# here so every workload's ${VAR:-} compose interpolation picks them up with
# no per-workload wiring. Precedence: a variable ALREADY SET in the caller's
# environment wins — `OPENAI_API_KEY=… scripts/serve-poc.sh …` still
# overrides the file. Lines must be plain KEY=value (no quoting/expansion);
# malformed names are skipped with a warning, never eval'd.
if [ -f "$REPO_ROOT/.env" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    name=${line%%=*}
    value=${line#*=}
    case "$name" in
      '' | *[!A-Za-z0-9_]*)
        echo "warning: skipping malformed .env line (${name})" >&2
        continue
        ;;
    esac
    if eval "[ -z \"\${${name}+x}\" ]"; then
      export "${name}=${value}"
    fi
  done <"$REPO_ROOT/.env"
fi
NAME=${1:-}
if [ -z "$NAME" ]; then
  echo "usage: scripts/serve-poc.sh <workload-name>" >&2
  echo "PoC workloads available:" >&2
  for d in workloads/*/; do
    case "$d" in
      workloads/poc-*) echo "  ${d#workloads/}" | tr -d '/' >&2 ;;
    esac
  done
  exit 2
fi
COMPOSE_FILE="workloads/$NAME/compose.yaml"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "No compose file at $COMPOSE_FILE" >&2
  exit 2
fi

# Resolve a real compose engine. A `docker`->`podman` shell alias is
# interactive-only and does NOT exist in this non-interactive script, so we
# must find an actual binary: prefer docker, else podman (this host aliases
# docker to podman).
if command -v docker >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Need docker or podman to serve $NAME" >&2
  exit 1
fi

echo "=== Serving workload '$NAME' (detached) ==="
$COMPOSE -f "$COMPOSE_FILE" up --build -d
