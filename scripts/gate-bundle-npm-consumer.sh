#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: plgg-bundle resolves ITS OWN typescript under a real npm-consumer
# layout (qmu/plgg#156). A consumer with typescript@7 as its own
# devDependency gets plgg-bundle's declared typescript@^6.0.3 NESTED under
# node_modules/plgg-bundle/node_modules (npm's standard conflict-nesting,
# not a quirk of this repo). The published 0.0.6 resolved "typescript" via
# bin/relocate.mjs, which symlinked the relocated copy's node_modules to the
# CONSUMER's top-level node_modules — skipping the nested copy and handing
# transpiler.ts the consumer's typescript@7, whose JS API dropped
# `ts.ModuleKind`/`ts.transpileModule` ("Cannot read properties of undefined
# (reading 'CommonJS')"). `relocate.mjs` is gone (5b109cec): the bin now runs
# the compiled `dist/cli.es.js` in place, so plain Node module resolution —
# nearest `node_modules` first — reaches the nested copy on its own. This
# gate proves that by constructing the exact on-disk layout from this
# workspace's OWN already-installed copies (no extra registry fetch: the
# split-version policy already pins root `typescript@^7.0.2` and plgg-bundle
# `typescript@^6.0.3`, so both versions this gate needs are already on disk
# after `./scripts/npm-install.sh`) and running the published bin against it.

BUNDLE_DIR="$REPO_ROOT/packages/plgg-bundle"
ROOT_TS="$REPO_ROOT/node_modules/typescript"
NESTED_TS="$BUNDLE_DIR/node_modules/typescript"

echo "=== Gate: plgg-bundle npm-consumer resolution (issue #156) ==="

if [ ! -f "$BUNDLE_DIR/dist/cli.es.js" ]; then
  echo "plgg-bundle dist missing; run ./scripts/build.sh first" >&2
  exit 1
fi
if [ ! -d "$ROOT_TS" ] || [ ! -d "$NESTED_TS" ]; then
  echo "expected the split-version install (root typescript@7 +" >&2
  echo "plgg-bundle's nested typescript@6); run ./scripts/npm-install.sh first" >&2
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

# The consumer's OWN typescript@7 (top-level) ...
mkdir -p "$CONSUMER/node_modules/typescript"
cp -r "$ROOT_TS/." "$CONSUMER/node_modules/typescript/"
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

echo "--- running the packed bin against the fixture consumer ---"
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

echo "plgg-bundle npm-consumer gate passed"
