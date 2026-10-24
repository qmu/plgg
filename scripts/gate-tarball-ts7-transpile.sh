#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: a downstream consumer whose OWN build tool is TypeScript 7 (not
# plgg-bundle) can actually TRANSPILE — emit JS, not just typecheck — source
# that imports the published `plgg` tarball (qmu/plgg#156, qmu/plgg#165).
#
# #156/#165 proved and fixed a nested-typescript resolution bug in
# plgg-bundle's OWN build step: it must keep resolving ITS nested
# typescript@6, never the consumer's top-level typescript@7. That left a
# separate claim unverified — `plgg` itself, the package every consumer
# actually imports and which carries no runtime `typescript` dependency at
# all, stays consumable when a consumer's own tsc (their top-level
# TypeScript 7, wholly outside plgg-bundle) builds real source against it.
# Every existing typecheck gate (scripts/tsc-plgg.sh, scripts/typecheck.ts,
# and #165's own consumer-side check) runs with `--noEmit`, or runs against
# the MONOREPO SOURCE via a `file:` link — exactly the shape #156 found to be
# a false positive, since a `file:` link never carries a real registry
# tarball's resolution quirks. This gate packs the just-built `plgg` for
# real, installs it under a scratch consumer, and runs the consumer's OWN
# root TypeScript 7 with emission ON over a fixture that imports it — a true
# transpile.
#
# MUST run after build.sh: it packs packages/plgg's just-built dist.

PLGG_DIR="$REPO_ROOT/packages/plgg"
ROOT_TS_PLATFORM_SCOPE="$REPO_ROOT/node_modules/@typescript"

echo "=== Gate: plgg tarball transpiles under a consumer's TypeScript 7 (qmu/plgg#156) ==="

if [ ! -f "$PLGG_DIR/dist/index.d.ts" ]; then
  echo "plgg dist missing; run ./scripts/build.sh first" >&2
  exit 1
fi
if [ ! -d "$REPO_ROOT/node_modules/typescript" ]; then
  echo "expected the root typescript@7 install; run ./scripts/npm-install.sh first" >&2
  exit 1
fi
if [ ! -d "$ROOT_TS_PLATFORM_SCOPE" ]; then
  echo "expected $ROOT_TS_PLATFORM_SCOPE (TypeScript 7's native per-platform" >&2
  echo "optional dependency, e.g. @typescript/typescript-linux-x64); run" >&2
  echo "./scripts/npm-install.sh first" >&2
  exit 1
fi

SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/plgg-tarball-ts7.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT

(cd "$PLGG_DIR" && npm pack --silent --pack-destination "$SCRATCH" >/dev/null)
TARBALL_PATH=$(find "$SCRATCH" -maxdepth 1 -name '*.tgz' | head -n 1)
if [ -z "$TARBALL_PATH" ]; then
  echo "npm pack produced no tarball in $SCRATCH" >&2
  exit 1
fi

CONSUMER="$SCRATCH/consumer"
mkdir -p "$CONSUMER/node_modules" "$CONSUMER/src"
tar -xzf "$TARBALL_PATH" -C "$CONSUMER/node_modules"
mv "$CONSUMER/node_modules/package" "$CONSUMER/node_modules/plgg"

# The consumer's OWN typescript@7 (top-level), plus the native per-platform
# optional dependency its `bin/tsc` launcher resolves as a sibling under the
# same node_modules — without it, running tsc throws "Unable to resolve
# @typescript/typescript-<platform>" before it ever reaches a source file.
mkdir -p "$CONSUMER/node_modules/typescript"
cp -r "$REPO_ROOT/node_modules/typescript/." "$CONSUMER/node_modules/typescript/"
mkdir -p "$CONSUMER/node_modules/@typescript"
cp -r "$ROOT_TS_PLATFORM_SCOPE/." "$CONSUMER/node_modules/@typescript/"

cat >"$CONSUMER/src/main.ts" <<'EOF'
import { ok, err, isOk, isErr } from "plgg";

const result = ok(42);
export const checked: boolean = isOk(result) && !isErr(result);
EOF

cat >"$CONSUMER/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
EOF

CONSUMER_TS_MAIN=$(
  node -e '
const { createRequire } = require("node:module");
const req = createRequire(process.argv[1]);
process.stdout.write(req.resolve("typescript"));
' "$CONSUMER/tsconfig.json"
)
CONSUMER_TSC_BIN="$(dirname "$CONSUMER_TS_MAIN")/../bin/tsc"

echo "--- transpiling the fixture (emit ON, no --noEmit) against the packed plgg tarball ---"
TRANSPILE_OUTPUT=$(
  node "$CONSUMER_TSC_BIN" -p "$CONSUMER/tsconfig.json" --pretty false 2>&1
) && TRANSPILE_STATUS=0 || TRANSPILE_STATUS=$?
echo "$TRANSPILE_OUTPUT"

if [ "$TRANSPILE_STATUS" -ne 0 ] || echo "$TRANSPILE_OUTPUT" | grep -q 'error TS'; then
  echo "plgg tarball ts7-transpile gate FAILED (consumer-side TypeScript 7 could not transpile against the published plgg tarball, issue #156)" >&2
  exit 1
fi
if [ ! -s "$CONSUMER/dist/main.js" ]; then
  echo "expected a non-empty $CONSUMER/dist/main.js from the transpile" >&2
  exit 1
fi

echo "plgg tarball ts7-transpile gate passed"
