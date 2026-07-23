#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# The canonical per-package npm publisher (Local CI/CD Execution policy:
# releases are repository scripts run from /ship, bracketed by online
# verification against the registry — the registry IS production here).
#
# npm publishing is a DEVELOPER-DRIVEN step: at /ship the agent runs the
# read-only preflight to detect a pending publish and asks the developer to run
# this script themselves — it never publishes on the developer's behalf.
#
#   PREFLIGHT=1 ./scripts/publish-npm.sh  # report the publish set only; NO gate,
#                                         # NO publish (what /ship runs to decide
#                                         # whether to prompt the developer)
#   ./scripts/publish-npm.sh              # preflight -> gate (check-all.sh) ->
#                                         # publish the bumped set -> verify
#   SKIP_GATE=1 ./scripts/publish-npm.sh  # skip the gate when one just ran green
#   ONLY=plgg-cms ./scripts/publish-npm.sh # publish only the named package(s),
#                                         # comma- or space-separated, still via
#                                         # the same gate/stage/verify path
#
# Efficiency: the preflight computes the publish set (local > registry) up front
# and prints it, so a run with nothing bumped is a no-op that NEVER builds/gates,
# and a real run stages/publishes ONLY the bumped packages (in build.sh's
# dependency order — a dependency must be on the registry before its dependents'
# rewritten ranges can resolve).
#
# Per published package:
#   stage copy (files allowlist; the working tree is NEVER mutated) ->
#   file:-dep rewrite to ^<local version> -> npm publish ->
#   verify: npm view resolves, then a scratch-dir install + import/bin smoke.
# Re-running immediately is an all-skip no-op.
#
# Auth: the ambient ~/.npmrc of the executing host only — never committed,
# never echoed. No --provenance (it requires hosted-CI OIDC; declined per the
# local-first stance, the same trade-off the GitHub Release contract makes).

# The publish order IS build.sh's topology — derived, never forked (the
# deploy-guide.yml PR #51 drift incident is why). plgg-bundle is prepended:
# it sits outside that list and has no file: runtime deps.
ORDER="plgg-bundle $(sed -n 's|^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$|\1|p' scripts/build.sh | tr '\n' ' ')"
ONLY_PACKAGES=$(printf '%s' "${ONLY:-}" | tr ',' ' ')

contains_word() {
  WORD="$1"
  LIST="$2"
  case " $LIST " in
    *" $WORD "*) return 0 ;;
    *) return 1 ;;
  esac
}

if [ -n "$ONLY_PACKAGES" ]; then
  for REQUESTED in $ONLY_PACKAGES; do
    if ! contains_word "$REQUESTED" "$ORDER"; then
      echo "!!! ONLY requested unknown package directory: $REQUESTED"
      echo "    Choose one of: $ORDER"
      exit 1
    fi
  done
fi

# === Preflight: compute the publish set (local version > registry) up front ===
# Delegated to scripts/publish.ts: ONE Node process that reads every
# package.json in-process and issues the registry-version queries
# CONCURRENTLY (was: a serial per-package `npm view` + ~3 `node -p` fork storm,
# tens of seconds of banner spew). It prints the structured PUBLISH/SKIP/private
# summary and writes the publish-set dirs (build.sh's topology, in order) to
# $SET_FILE for the staging loop below. Read-only: no build, no publish. This is
# the source of truth for what the real run publishes and — via PREFLIGHT=1 —
# what /ship inspects to decide whether to ask the developer.
echo "=== Preflight: comparing local vs registry versions ==="
if [ -n "$ONLY_PACKAGES" ]; then
  echo "=== Publish filter: ONLY=$ONLY_PACKAGES ==="
fi
SET_FILE=$(mktemp "$REPO_ROOT/.publish-set.XXXXXX")
if [ -n "$ONLY_PACKAGES" ]; then
  node scripts/publish.ts --preflight --set-out "$SET_FILE" --only "$ONLY_PACKAGES"
else
  node scripts/publish.ts --preflight --set-out "$SET_FILE"
fi
PUBLISH_SET=$(cat "$SET_FILE")
rm -f "$SET_FILE"

# PREFLIGHT mode: report only — never gate, never publish. This is what /ship
# runs to decide whether to prompt the developer (a non-empty publish set means
# "pause and ask the developer to publish"; empty means "nothing to publish").
if [ "${PREFLIGHT:-0}" = "1" ]; then
  echo ""
  if [ -n "$PUBLISH_SET" ]; then
    echo "=== Preflight: $(echo $PUBLISH_SET | wc -w | tr -d ' ') package(s) ready to publish ==="
  else
    echo "=== Preflight: nothing to publish ==="
  fi
  echo "\n=== All shell scripts have been executed successfully ==="
  exit 0
fi

# Gate/build de-dup: nothing bumped => no publish => skip the gate entirely
# (no point rebuilding + running the whole test suite for a no-op release).
if [ -z "$PUBLISH_SET" ]; then
  echo ""
  echo "=== Nothing to publish (no version bumped past the registry) — done. ==="
  echo "\n=== All shell scripts have been executed successfully ==="
  exit 0
fi

if ! NPM_USER=$(npm whoami 2>/dev/null); then
  echo "!!! npm publish requires an authenticated npm session."
  echo "    Run npm login, then retry this script."
  exit 1
fi
echo "=== npm auth: publishing as $NPM_USER ==="

# Gate: a fresh green check-all before publishing anything. Skipped without a
# human having to remember anything when a same-session check-all already went
# green and its stamp still matches the current tree (any tracked edit since
# invalidates it). SKIP_GATE=1 remains an explicit unconditional override.
if [ "${SKIP_GATE:-0}" = "1" ]; then
  echo ""
  echo "=== Gate: skipped (SKIP_GATE=1 override) ==="
elif STAMP=$(node "$REPO_ROOT/scripts/gateStamp.ts" check 2>/dev/null); then
  echo ""
  echo "=== Gate: skipped (same-session green $STAMP) ==="
else
  echo ""
  echo "=== Gate: running check-all.sh ==="
  ./scripts/check-all.sh
fi

# Stage -> publish -> verify the bumped set, in build.sh's dependency order.
# The whole per-package orchestration now lives in ONE canonical Node process
# (scripts/publish.ts --publish): staging (files allowlist copy + file:->caret
# rewrite, the working tree never mutated), a quiet `npm publish --tag latest
# --ignore-scripts`, the registry resolve-poll, and the scratch-install
# import/bin smoke — emitting one compact status line per phase instead of the
# `===` banner walls + raw `npm notice` spew the inline shell loop produced.
# PUBLISH_SET is the preflight's already-resolved dir set (local > registry),
# passed as --only so publish.ts publishes exactly it, in order.
node scripts/publish.ts --publish --only "$PUBLISH_SET"

echo "\n=== All shell scripts have been executed successfully ==="
