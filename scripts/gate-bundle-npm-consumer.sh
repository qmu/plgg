#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: plgg-bundle resolves ITS OWN typescript under a real npm-consumer
# layout (qmu/plgg#156), and rebuilds cleanly on repeated invocations
# (qmu/plgg#155). A consumer with typescript@7 as its own devDependency gets
# plgg-bundle's declared typescript@^6.0.3 NESTED under
# node_modules/plgg-bundle/node_modules (npm's standard conflict-nesting,
# not a quirk of this repo). The published 0.0.6 resolved "typescript" via
# bin/relocate.mjs, which symlinked the relocated copy's node_modules to the
# CONSUMER's top-level node_modules — skipping the nested copy and handing
# transpiler.ts the consumer's typescript@7, whose JS API dropped
# `ts.ModuleKind`/`ts.transpileModule` ("Cannot read properties of undefined
# (reading 'CommonJS')"). That same relocate.mjs also `rmSync`'d its /tmp
# copy's node_modules symlink (a directory symlink) without `recursive`,
# which threw EISDIR on Node v23.9.0 the second time the bin ran (#155).
# `relocate.mjs` is gone (5b109cec): the bin now runs the compiled
# `dist/cli.es.js` in place, so plain Node module resolution — nearest
# `node_modules` first — reaches the nested copy on its own, and there is no
# /tmp copy or symlink left to remove on a second run. This gate proves both
# by constructing the exact on-disk layout from this workspace's OWN
# already-installed copies (no extra registry fetch: the split-version
# policy already pins root `typescript@^7.0.2` and plgg-bundle
# `typescript@^6.0.3`, so both versions this gate needs are already on disk
# after `./scripts/npm-install.sh`) and running the published bin against it.
#
# Four things are pinned, matching the consumer's actual workflow (corpd's
# own words on the issues: build with plgg-bundle, typecheck with
# TypeScript 7, and a dev server that rebuilds on every save):
#   1. DETECTION — the bin's bare `import ts from "typescript"` resolves to
#      plgg-bundle's own nested TS6, never the consumer's top-level TS7.
#   2. TRANSPILE — building the fixture app with that resolved compiler
#      succeeds and emits the expected output.
#   3. TYPECHECK — the consumer's OWN `tsc` (its top-level TypeScript 7,
#      wholly unrelated to plgg-bundle's nested TS6) still typechecks the
#      consumer's source cleanly — the split-version design must never leak
#      plgg-bundle's pinned TS6 into the consumer's own typecheck.
#   4. REPEAT BUILD — running the packed bin a second time against the same
#      consumer directory (the exact #155 repro: "組める。もう一度 → EISDIR")
#      succeeds too, with no leftover /tmp relocation state to collide with.

BUNDLE_DIR="$REPO_ROOT/packages/plgg-bundle"
ROOT_TS="$REPO_ROOT/node_modules/typescript"
ROOT_TS_PLATFORM_SCOPE="$REPO_ROOT/node_modules/@typescript"
NESTED_TS="$BUNDLE_DIR/node_modules/typescript"

echo "=== Gate: plgg-bundle npm-consumer resolution (issues #155, #156) ==="

if [ ! -f "$BUNDLE_DIR/dist/cli.es.js" ]; then
  echo "plgg-bundle dist missing; run ./scripts/build.sh first" >&2
  exit 1
fi
if [ ! -d "$ROOT_TS" ] || [ ! -d "$NESTED_TS" ]; then
  echo "expected the split-version install (root typescript@7 +" >&2
  echo "plgg-bundle's nested typescript@6); run ./scripts/npm-install.sh first" >&2
  exit 1
fi
if [ ! -d "$ROOT_TS_PLATFORM_SCOPE" ]; then
  echo "expected $ROOT_TS_PLATFORM_SCOPE (TS7's native per-platform" >&2
  echo "optional dependency, e.g. @typescript/typescript-linux-x64);" >&2
  echo "run ./scripts/npm-install.sh first" >&2
  exit 1
fi

SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/plgg-bundle-consumer.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT

(cd "$BUNDLE_DIR" && npm pack --silent --pack-destination "$SCRATCH" >/dev/null)
TARBALL_PATH=$(find "$SCRATCH" -maxdepth 1 -name '*.tgz' | head -n 1)
if [ -z "$TARBALL_PATH" ]; then
  echo "npm pack produced no tarball in $SCRATCH" >&2
  exit 1
fi
CONSUMER="$SCRATCH/consumer"
mkdir -p "$CONSUMER/node_modules" "$CONSUMER/src"
tar -xzf "$TARBALL_PATH" -C "$CONSUMER/node_modules"
mv "$CONSUMER/node_modules/package" "$CONSUMER/node_modules/plgg-bundle"

# The consumer's OWN typescript@7 (top-level), plus the native
# per-platform optional dependency its `bin/tsc` launcher resolves as a
# sibling under the same node_modules (e.g. @typescript/typescript-linux-x64)
# — without it, running tsc throws "Unable to resolve
# @typescript/typescript-<platform>" before it ever reaches a source file.
mkdir -p "$CONSUMER/node_modules/typescript"
cp -r "$ROOT_TS/." "$CONSUMER/node_modules/typescript/"
mkdir -p "$CONSUMER/node_modules/@typescript"
cp -r "$ROOT_TS_PLATFORM_SCOPE/." "$CONSUMER/node_modules/@typescript/"
# ... alongside plgg-bundle's nested typescript@6, exactly as npm would place
# it for a conflicting dependency version.
mkdir -p "$CONSUMER/node_modules/plgg-bundle/node_modules/typescript"
cp -r "$NESTED_TS/." \
  "$CONSUMER/node_modules/plgg-bundle/node_modules/typescript/"

cat >"$CONSUMER/bundle.config.ts" <<'EOF'
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: { prefix: "fixture", srcRoot: "src" },
};
EOF
cat >"$CONSUMER/src/main.ts" <<'EOF'
export const greeting: string = "hello from the npm-consumer fixture";
EOF

echo "--- 1. detection: which typescript does the published bin resolve? ---"
RESOLVED_TS=$(
  node -e '
const { createRequire } = require("node:module");
const req = createRequire(process.argv[1]);
process.stdout.write(req.resolve("typescript"));
' "$CONSUMER/node_modules/plgg-bundle/dist/cli.es.js"
)
NESTED_TS_REALPATH=$(cd "$CONSUMER/node_modules/plgg-bundle/node_modules/typescript" && pwd -P)
case "$RESOLVED_TS" in
  "$NESTED_TS_REALPATH"/*) : ;;
  *)
    echo "expected the published bin to resolve typescript under" >&2
    echo "$NESTED_TS_REALPATH, got $RESOLVED_TS instead" >&2
    echo "plgg-bundle npm-consumer gate FAILED (issue #156 regression)" >&2
    exit 1
    ;;
esac
RESOLVED_VERSION=$(node -e 'process.stdout.write(require(process.argv[1]).version)' \
  "$CONSUMER/node_modules/plgg-bundle/node_modules/typescript/package.json")
echo "resolved typescript@$RESOLVED_VERSION from $RESOLVED_TS (nested, as expected)"

echo "--- 2. transpile: running the packed bin against the fixture consumer ---"
OUTPUT=$(
  cd "$CONSUMER" &&
    node node_modules/plgg-bundle/bin/plgg-bundle.mjs 2>&1
) && STATUS=0 || STATUS=$?
echo "$OUTPUT"

if [ "$STATUS" -ne 0 ]; then
  echo "plgg-bundle npm-consumer gate FAILED (issue #156 regression)" >&2
  exit 1
fi
if [ ! -f "$CONSUMER/dist/main.js" ]; then
  echo "expected $CONSUMER/dist/main.js from the fixture build" >&2
  exit 1
fi

echo "--- 3. typecheck: the consumer's OWN typescript (top-level TS7) ---"
cat >"$CONSUMER/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
EOF
CONSUMER_TS_MAIN=$(
  node -e '
const { createRequire } = require("node:module");
const req = createRequire(process.argv[1]);
process.stdout.write(req.resolve("typescript"));
' "$CONSUMER/bundle.config.ts"
)
CONSUMER_TSC_BIN="$(dirname "$CONSUMER_TS_MAIN")/../bin/tsc"
TYPECHECK_OUTPUT=$(
  node "$CONSUMER_TSC_BIN" -p "$CONSUMER/tsconfig.json" --noEmit --pretty false 2>&1
) && TYPECHECK_STATUS=0 || TYPECHECK_STATUS=$?
echo "$TYPECHECK_OUTPUT"

if [ "$TYPECHECK_STATUS" -ne 0 ] || echo "$TYPECHECK_OUTPUT" | grep -q 'error TS'; then
  echo "plgg-bundle npm-consumer gate FAILED (consumer typecheck regressed, issue #156)" >&2
  exit 1
fi

echo "--- 4. repeat build: running the packed bin a second time (issue #155) ---"
REPEAT_OUTPUT=$(
  cd "$CONSUMER" &&
    node node_modules/plgg-bundle/bin/plgg-bundle.mjs 2>&1
) && REPEAT_STATUS=0 || REPEAT_STATUS=$?
echo "$REPEAT_OUTPUT"

if [ "$REPEAT_STATUS" -ne 0 ]; then
  echo "plgg-bundle npm-consumer gate FAILED (issue #155 regression: second" >&2
  echo "invocation of the bin failed)" >&2
  exit 1
fi
if echo "$REPEAT_OUTPUT" | grep -q 'EISDIR'; then
  echo "plgg-bundle npm-consumer gate FAILED (issue #155 regression: EISDIR" >&2
  echo "on the second invocation)" >&2
  exit 1
fi

echo "plgg-bundle npm-consumer gate passed"
