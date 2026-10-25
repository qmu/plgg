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
const greeting: string = "hello from the npm-consumer fixture";
console.log(greeting);
EOF

# Resolve "typescript" the way Node would for the file $1, and print
# `<major> <resolved main path>`. The major is read from the resolved
# package's own package.json, so the diagnostic names the compiler that
# was actually picked up rather than the one that was expected.
resolve_ts() {
  node -e '
const { createRequire } = require("node:module");
const { dirname, join } = require("node:path");
const main = createRequire(process.argv[1]).resolve("typescript");
let dir = dirname(main);
while (!require("node:fs").existsSync(join(dir, "package.json"))) {
  dir = dirname(dir);
}
const v = require(join(dir, "package.json")).version;
process.stdout.write(v.split(".")[0] + " " + v + " " + main);
' "$1"
}

# Pinned diagnostic for a bin that resolved the wrong typescript. The
# text is asserted verbatim by the negative fixture below, so a reader of
# a real failure sees which compiler was grabbed and where from.
# $1 = consumer dir. Returns 1 (with the diagnostic on stderr) when the
# bin would not resolve a nested typescript@6.
assert_nested_ts6() {
  RESOLVED=$(resolve_ts "$1/node_modules/plgg-bundle/dist/cli.es.js")
  RESOLVED_MAJOR=${RESOLVED%% *}
  if [ "$RESOLVED_MAJOR" != "6" ]; then
    echo "plgg-bundle resolved typescript@$(echo "$RESOLVED" | cut -d' ' -f2)" >&2
    echo "at $(echo "$RESOLVED" | cut -d' ' -f3-)," >&2
    echo "expected its own nested typescript@6 under" >&2
    echo "$1/node_modules/plgg-bundle/node_modules/typescript" >&2
    echo "(the consumer's top-level typescript@7 must not be used)" >&2
    return 1
  fi
}

echo "--- 1. detection: which typescript does the published bin resolve? ---"
CONSUMER_TS_INFO=$(resolve_ts "$CONSUMER/bundle.config.ts")
if [ "${CONSUMER_TS_INFO%% *}" != "7" ]; then
  echo "fixture invalid: the consumer's own typescript must be 7.x," >&2
  echo "got: $CONSUMER_TS_INFO" >&2
  exit 1
fi
if ! assert_nested_ts6 "$CONSUMER"; then
  echo "plgg-bundle npm-consumer gate FAILED (issue #156 regression)" >&2
  exit 1
fi
RESOLVED_INFO=$(resolve_ts "$CONSUMER/node_modules/plgg-bundle/dist/cli.es.js")
echo "consumer uses typescript@$(echo "$CONSUMER_TS_INFO" | cut -d' ' -f2);" \
  "plgg-bundle resolved typescript@$(echo "$RESOLVED_INFO" | cut -d' ' -f2)" \
  "(nested, as expected)"

echo "--- 1b. diagnostic: a hoisted-only layout is reported by name ---"
# Same consumer, but plgg-bundle has NO nested typescript, so Node walks
# up to the consumer's typescript@7 — the #156 shape. The gate must fail
# with the pinned diagnostic naming typescript@7.
BAD="$SCRATCH/consumer-hoisted"
mkdir -p "$BAD/node_modules"
cp -r "$CONSUMER/node_modules/typescript" "$BAD/node_modules/typescript"
cp -r "$CONSUMER/node_modules/@typescript" "$BAD/node_modules/@typescript"
mkdir -p "$BAD/node_modules/plgg-bundle"
cp -r "$CONSUMER/node_modules/plgg-bundle/dist" \
  "$CONSUMER/node_modules/plgg-bundle/package.json" \
  "$BAD/node_modules/plgg-bundle/"
BAD_DIAG=$(assert_nested_ts6 "$BAD" 2>&1) && BAD_STATUS=0 || BAD_STATUS=$?
if [ "$BAD_STATUS" -eq 0 ]; then
  echo "diagnostic fixture invalid: a hoisted-only layout was accepted" >&2
  exit 1
fi
case "$BAD_DIAG" in
  *"plgg-bundle resolved typescript@7."*"expected its own nested typescript@6"*) : ;;
  *)
    echo "pinned diagnostic text changed; got:" >&2
    echo "$BAD_DIAG" >&2
    exit 1
    ;;
esac
echo "$BAD_DIAG"

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

# Execute the app output too: file existence alone does not prove that
# transpilation preserved the consumer program.
RUNTIME_OUTPUT=$(node "$CONSUMER/dist/main.js")
if [ "$RUNTIME_OUTPUT" != "hello from the npm-consumer fixture" ]; then
  echo "emitted JavaScript produced unexpected output: $RUNTIME_OUTPUT" >&2
  exit 1
fi
echo "emitted JavaScript executed with the expected greeting"

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

echo "--- 5. Node 24: the same consumer, built twice under Node 24 ---"
# Needs a network fetch of a second Node toolchain, so it runs only on CI
# (CI=true) or with GATE_NODE24=1; otherwise it is skipped, like the
# optional runtimes in gate-cross-runtime.sh.
if [ "${CI:-}" != "true" ] && [ "${GATE_NODE24:-}" != "1" ]; then
  echo "skipped (set GATE_NODE24=1 or run under CI=true)"
else
  case "$(uname -m)" in
    x86_64) NODE_ARCH=x64 ;;
    aarch64 | arm64) NODE_ARCH=arm64 ;;
    *) echo "unsupported arch for Node 24 fetch" >&2; exit 1 ;;
  esac
  NODE24_VERSION=$(
    curl -fsS https://nodejs.org/dist/index.json | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const hit = JSON.parse(s).find((r) => r.version.startsWith("v24."));
  process.stdout.write(hit ? hit.version : "");
});
'
  )
  if [ -z "$NODE24_VERSION" ]; then
    echo "could not resolve a Node 24 release" >&2
    exit 1
  fi
  NODE24_DIR="$SCRATCH/node24"
  mkdir -p "$NODE24_DIR"
  curl -fsS "https://nodejs.org/dist/$NODE24_VERSION/node-$NODE24_VERSION-linux-$NODE_ARCH.tar.xz" |
    tar -xJ -C "$NODE24_DIR" --strip-components=1
  NODE24="$NODE24_DIR/bin/node"
  case "$("$NODE24" -v)" in
    v24.*) : ;;
    *) echo "fetched node is not v24: $("$NODE24" -v)" >&2; exit 1 ;;
  esac
  for RUN in 1 2; do
    rm -rf "$CONSUMER/dist"
    N24_OUTPUT=$(
      cd "$CONSUMER" &&
        "$NODE24" node_modules/plgg-bundle/bin/plgg-bundle.mjs 2>&1
    ) && N24_STATUS=0 || N24_STATUS=$?
    echo "$N24_OUTPUT"
    if [ "$N24_STATUS" -ne 0 ] || [ ! -f "$CONSUMER/dist/main.js" ]; then
      echo "plgg-bundle npm-consumer gate FAILED under Node $NODE24_VERSION" >&2
      echo "(build run $RUN of 2)" >&2
      exit 1
    fi
  done
  echo "Node $NODE24_VERSION built the consumer twice"
fi

echo "plgg-bundle npm-consumer gate passed"
