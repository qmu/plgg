#!/bin/sh -eu
# Gate: every package that imports `node:sqlite` declares a Node floor that can
# actually load it.
#
# `node:sqlite` was added in Node 22.5.0 BEHIND `--experimental-sqlite`, and
# only stopped requiring that flag in **22.13.0 / 23.4.0** (the version history
# table at https://nodejs.org/docs/latest-v24.x/api/sqlite.html). On 22.5–22.12
# an unflagged `import { DatabaseSync } from "node:sqlite"` throws
# ERR_UNKNOWN_BUILTIN_MODULE at import time — the package installs clean and
# dies on first use.
#
# Nothing in the repository noticed this, because every machine that runs the
# code is well past the floor: the CI runner is on `22.x` (which resolves to the
# newest 22) and the development hosts are on 24+. The only thing that stated a
# floor at all was three hand-written `engines` fields reading `>=22.6` — the
# type-stripping floor, copied onto sqlite packages where it is seven minors too
# low — and `plgg-cms`, whose PRODUCTION `content/vendors/openDb.ts` imports
# `node:sqlite`, stated nothing.
#
# `engines` is the only machine-readable statement of that contract, so this
# gate derives the requirement from the source instead of trusting it: a package
# whose `src` tree or whose `example.ts` imports `node:sqlite` must declare
# `engines.node` as `>=MAJOR[.MINOR]` at or above the real floor.
#
# Two tiers of importer, both covered on purpose:
#   - plgg-cms imports it from PRODUCTION code reachable from its published
#     barrel, so the floor is a hard consumer requirement.
#   - plgg-auth / plgg-db-migration / plgg-sql reach it only from a testkit,
#     spec, or `example.ts` — their dists stay driver-agnostic (the caller
#     supplies the `Db`). The floor still belongs in `engines`, because it is
#     the floor at which the SQLite path each README advertises can be
#     exercised at all, and because that is already what the two existing
#     `engines` fields were FOR (plgg-auth's README cites the node:sqlite test
#     database as the reason for its floor) — they just named the wrong number.
#
# Deliberately NOT asserted: a ceiling, or a floor on packages that merely
# MENTION node:sqlite in prose (plgg-sql's `Db` seam and plgg-db-migration's
# `Dialect` are driver-agnostic by design).
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# The release where `node:sqlite` stopped needing --experimental-sqlite.
FLOOR_MAJOR=22
FLOOR_MINOR=13
FLOOR="$FLOOR_MAJOR.$FLOOR_MINOR"

echo "=== Gate: node:sqlite packages declare a loadable Node floor (>=$FLOOR) ==="

fail=0

for manifest in packages/*/package.json; do
  pkg=$(dirname "$manifest")
  name=$(basename "$pkg")

  # The import sites that bind this package to the built-in driver.
  targets=""
  if [ -d "$pkg/src" ]; then
    targets="$pkg/src"
  fi
  if [ -f "$pkg/example.ts" ]; then
    targets="$targets $pkg/example.ts"
  fi
  if [ -z "$targets" ]; then
    continue
  fi
  # Unquoted on purpose: `targets` is a path LIST (no spaces in any
  # packages/* path) that must word-split into grep's arguments.
  if ! grep -rq 'from "node:sqlite"' $targets; then
    continue
  fi

  declared=$(sed -n \
    's/^[[:space:]]*"node":[[:space:]]*">=\([0-9][0-9.]*\)".*/\1/p' \
    "$manifest" | head -1)
  if [ -z "$declared" ]; then
    echo "gate-node-support: $name imports node:sqlite but declares no engines.node floor (needs >=$FLOOR)" >&2
    fail=1
    continue
  fi

  major=${declared%%.*}
  rest=${declared#*.}
  if [ "$rest" = "$declared" ]; then
    minor=0
  else
    minor=${rest%%.*}
  fi

  if [ "$major" -gt "$FLOOR_MAJOR" ]; then
    continue
  fi
  if [ "$major" -eq "$FLOOR_MAJOR" ] && [ "$minor" -ge "$FLOOR_MINOR" ]; then
    continue
  fi
  echo "gate-node-support: $name imports node:sqlite but declares engines.node >=$declared, below the >=$FLOOR that can load it" >&2
  fail=1
done

if [ "$fail" -ne 0 ]; then
  echo "gate-node-support: FAILED — raise engines.node to >=$FLOOR in the packages above." >&2
  exit 1
fi
echo "gate-node-support: every node:sqlite package declares >=$FLOOR"
