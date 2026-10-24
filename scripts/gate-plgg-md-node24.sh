#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: the REAL public npm tarball for `plgg-md` installs AND transpiles on
# Node 24 against a CONSUMER's own `typescript@7` devDependency — not this
# workspace's hoisted TypeScript, and not a local `npm pack`.
#
# Scoped to `plgg-md`: a published package with a dual ESM/CJS `exports` map
# and a `plgg` runtime dependency, so a consumer's NodeNext resolution walks
# two published packages. Other packages' registry gates (plgg, plgg-bundle)
# are separate; this one overlaps neither.
#
# Node 24 is fetched inside the script rather than via a run-tests.yml matrix
# row: this repo's push token lacks the `workflows` scope (issue #171), so no
# `.github/workflows/*` edit is possible. The gate runs for real only under
# `CI=true` (set by GitHub Actions, so run-tests.yml exercises it with no
# workflow edit) or with GATE_PLGG_MD=1; otherwise it prints a skip note and
# exits 0 — the same optional shape scripts/gate-cross-runtime.sh uses.
if [ "${CI:-}" != "true" ] && [ "${GATE_PLGG_MD:-0}" != "1" ]; then
  echo "=== Gate: public plgg-md tarball (Node 24 / consumer typescript@7): skipped (not CI, GATE_PLGG_MD unset) ==="
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "=== Gate: public plgg-md tarball (Node 24 / consumer typescript@7): skipped (curl not installed) ==="
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
  echo "=== Gate: public plgg-md tarball (Node 24 / consumer typescript@7): skipped (unsupported platform $OS/$ARCH) ==="
  exit 0
fi

PKG_NAME=plgg-md
REGISTRY=https://registry.npmjs.org/
TS_RANGE=$(node -e 'process.stdout.write(require("./package.json").devDependencies.typescript)')

SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/gate-plgg-md.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT

echo "=== Gate: public $PKG_NAME tarball installs + transpiles on Node 24 with consumer typescript@$TS_RANGE ==="

# Resolve a real Node 24 build from nodejs.org's release index (derived, not
# hardcoded, so it tracks new 24.x patches).
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
  "name": "gate-plgg-md-consumer",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "devDependencies": {
    "typescript": "$TS_RANGE"
  },
  "dependencies": {
    "$PKG_NAME": "$PKG_VERSION"
  }
}
EOF

# Exercises plgg-md's documented public API: parseBlocks over source text.
cat > "$CONSUMER/src/consumer.ts" <<'EOF'
import { parseBlocks } from "plgg-md";

const result = parseBlocks("# Title\n\nHello *world*.\n");
console.log(result.__tag);
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

echo "--- run the transpiled consumer on Node ${NODE24_VERSION} ---"
(
  cd "$CONSUMER" && "$NODE24_BIN" dist/consumer.js
)

echo "plgg-md gate passed ($PKG_NAME@$PKG_VERSION, Node ${NODE24_VERSION}, consumer typescript@$TS_RANGE)"
