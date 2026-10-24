#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: the REAL public npm tarball for `plgg` (the flagship published
# package; no existing registry-install coverage) installs AND transpiles on
# Node 24 against a CONSUMER's own `typescript@7` devDependency — not this
# workspace's hoisted TypeScript, and not a local `npm pack` of the working
# tree.
#
# Scoped to `plgg`, not `plgg-bundle`: scripts/gate-bundle-npm-consumer.sh
# (PR #165) already covers plgg-bundle's TS6-nested/TS7-consumer resolution
# with a local `npm pack`, run under whatever Node check-all's job uses. This
# checks a different axis — the real published artifact under a pinned
# Node 24 — so the two never overlap.
#
# WHY THIS IS A SHELL GATE, NOT A WORKFLOW MATRIX ROW: issue #171 records
# that a `["22.x","24.x"]` matrix on run-tests.yml's `check-all` job is the
# obvious fix, and that PR #160 and PR #162 both tried and were rejected by
# GitHub on push — "refusing to allow a GitHub App to create or update
# workflow ... without `workflows` permission" — because this is a GitHub
# App token without that scope. The same push was re-verified for this gate
# and rejected identically. So Node 24 is fetched HERE, inside the script,
# rather than via `actions/setup-node`: no `.github/workflows/*` edit is
# needed, and this keeps working (CI token or not) the day the matrix lands.
#
# WHY THIS DOESN'T RUN ON EVERY LOCAL check-all.sh: it needs two live network
# round-trips (the npm registry for the tarball, nodejs.org for the Node 24
# build) plus downloading an entire second Node toolchain — none of which fit
# the fast, offline, deterministic local pre-commit loop every other gate
# here holds to. So it runs for real only under `CI=true` (GitHub Actions
# sets this on every job, so run-tests.yml exercises it on every PR/push with
# NO workflow edit) or when a developer opts in explicitly with
# GATE_PUBLIC_TARBALL=1. Otherwise it prints a skip note and exits 0 — the
# same "optional, skip rather than fail" shape scripts/gate-cross-runtime.sh
# uses for Deno/Bun, just gated on CI/opt-in instead of tool presence.
if [ "${CI:-}" != "true" ] && [ "${GATE_PUBLIC_TARBALL:-0}" != "1" ]; then
  echo "=== Gate: public npm tarball (Node 24 / consumer typescript@7): skipped (not CI, GATE_PUBLIC_TARBALL unset) ==="
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "=== Gate: public npm tarball (Node 24 / consumer typescript@7): skipped (curl not installed) ==="
  exit 0
fi

OS=$(uname -s)
ARCH=$(uname -m)
case "$OS" in
  Linux) NODE_OS=linux ;;
  Darwin) NODE_OS=darwin ;;
  *) NODE_OS="" ;;
esac
case "$ARCH" in
  x86_64 | amd64) NODE_ARCH=x64 ;;
  arm64 | aarch64) NODE_ARCH=arm64 ;;
  *) NODE_ARCH="" ;;
esac
if [ -z "$NODE_OS" ] || [ -z "$NODE_ARCH" ]; then
  echo "=== Gate: public npm tarball (Node 24 / consumer typescript@7): skipped (unsupported platform $OS/$ARCH) ==="
  exit 0
fi

PKG_NAME=plgg
REGISTRY=https://registry.npmjs.org/
TS_RANGE=$(node -e 'process.stdout.write(require("./package.json").devDependencies.typescript)')

SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/gate-public-tarball.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT

echo "=== Gate: public npm tarball ($PKG_NAME) installs + transpiles on Node 24 with consumer typescript@$TS_RANGE ==="

# Resolve + fetch a real Node 24 build from nodejs.org's own release index —
# derived, not hardcoded, so this keeps working as 24.x ships new patches.
NODE24_VERSION=$(
  curl -fsSL https://nodejs.org/dist/index.json |
    grep -o '"version": *"v24\.[0-9]*\.[0-9]*"' |
    head -1 |
    sed 's/.*"\(v24\.[0-9.]*\)".*/\1/'
)
if [ -z "$NODE24_VERSION" ]; then
  echo "!!! could not resolve a Node 24 release from nodejs.org/dist/index.json" >&2
  exit 1
fi
NODE24_DIST="node-${NODE24_VERSION}-${NODE_OS}-${NODE_ARCH}"
echo "--- fetching ${NODE24_DIST} ---"
curl -fsSL "https://nodejs.org/dist/${NODE24_VERSION}/${NODE24_DIST}.tar.gz" \
  -o "$SCRATCH/node24.tar.gz"
tar -xzf "$SCRATCH/node24.tar.gz" -C "$SCRATCH"
NODE24_HOME="$SCRATCH/$NODE24_DIST"
NODE24_BIN="$NODE24_HOME/bin/node"
NODE24_NPM="$NODE24_HOME/bin/npm"
"$NODE24_BIN" -e 'if (!process.versions.node.startsWith("24.")) process.exit(1)'

PKG_VERSION=$(npm view "$PKG_NAME" version --registry "$REGISTRY")
echo "--- registry resolves $PKG_NAME@$PKG_VERSION ---"

CONSUMER="$SCRATCH/consumer"
mkdir -p "$CONSUMER/src"

cat > "$CONSUMER/package.json" <<EOF
{
  "name": "gate-public-tarball-consumer",
  "private": true,
  "version": "0.0.0",
  "devDependencies": {
    "typescript": "$TS_RANGE"
  },
  "dependencies": {
    "$PKG_NAME": "$PKG_VERSION"
  }
}
EOF

# Mirrors packages/plgg/README.md's own "Async Pipelines with proc" quick
# start verbatim, so the gate exercises documented public API rather than an
# invented one.
cat > "$CONSUMER/src/consumer.ts" <<'EOF'
import { proc, isOk } from "plgg";

const main = async (): Promise<void> => {
  const result = await proc(
    5,
    (x: number) => x + 1,
    (x: number) => Promise.resolve(x * 2),
    (x: number) => `Result: ${x}`,
  );
  if (isOk(result)) {
    console.log(result.content);
  }
};

void main();
EOF

cat > "$CONSUMER/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
EOF

echo "--- npm install (public registry; Node ${NODE24_VERSION}) ---"
(
  cd "$CONSUMER" &&
    PATH="$NODE24_HOME/bin:$PATH" "$NODE24_NPM" install \
      --loglevel=error --registry "$REGISTRY"
)

echo "--- transpile with the CONSUMER's own installed typescript@$TS_RANGE ---"
(
  cd "$CONSUMER" && "$NODE24_BIN" node_modules/typescript/bin/tsc -p tsconfig.json
)

if [ ! -f "$CONSUMER/dist/consumer.js" ]; then
  echo "!!! expected $CONSUMER/dist/consumer.js after transpile, found nothing" >&2
  exit 1
fi

echo "public-tarball gate passed ($PKG_NAME@$PKG_VERSION, Node ${NODE24_VERSION}, consumer typescript@$TS_RANGE)"
