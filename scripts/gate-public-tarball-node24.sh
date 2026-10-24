#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: the REAL public npm tarball for `plgg` (the flagship published
# package, no existing registry-install coverage) installs AND transpiles on
# Node 24 against a CONSUMER's own `typescript@7` devDependency — not this
# workspace's hoisted TypeScript, and not a local `npm pack` of the working
# tree.
#
# Node 24 and the live registry artifact are both inputs a local pre-commit
# run cannot hold constant (a future-major toolchain, a network fetch), so
# this gate is hosted-CI-only: wired into
# .github/workflows/gate-public-tarball-node24.yml on its own Node-24 runner,
# deliberately never into check-all.sh or run-tests.yml's Node-22.x job.
#
# Scoped to `plgg`, not `plgg-bundle`: scripts/gate-bundle-npm-consumer.sh
# (PR #165) already covers plgg-bundle's TS6-nested/TS7-consumer resolution
# with a local `npm pack` under whatever Node check-all's job uses. This
# checks a different axis — the real published artifact under a pinned
# FUTURE Node major — on a package that gate doesn't touch, so the two never
# overlap.

NODE_MAJOR=$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "!!! gate-public-tarball-node24 requires Node 24+, found Node $(node -v)" >&2
  echo "    This gate is hosted-CI-only; see .github/workflows/gate-public-tarball-node24.yml" >&2
  exit 1
fi

PKG_NAME=plgg
REGISTRY=https://registry.npmjs.org/
TS_RANGE=$(node -e 'process.stdout.write(require("./package.json").devDependencies.typescript)')

SCRATCH=$(mktemp -d "${TMPDIR:-/tmp}/gate-public-tarball.XXXXXX")
trap 'rm -rf "$SCRATCH"' EXIT

echo "=== Gate: public npm tarball ($PKG_NAME) installs + transpiles on Node $(node -v) with consumer typescript@$TS_RANGE ==="

PKG_VERSION=$(npm view "$PKG_NAME" version --registry "$REGISTRY")
echo "--- registry resolves $PKG_NAME@$PKG_VERSION ---"

cat > "$SCRATCH/package.json" <<EOF
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

mkdir -p "$SCRATCH/src"

# Mirrors packages/plgg/README.md's own "Async Pipelines with proc" quick
# start verbatim, so the gate exercises documented public API rather than an
# invented one.
cat > "$SCRATCH/src/consumer.ts" <<'EOF'
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

cat > "$SCRATCH/tsconfig.json" <<'EOF'
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

echo "--- npm install (public registry; Node $(node -v)) ---"
(
  cd "$SCRATCH" && npm install --loglevel=error --registry "$REGISTRY"
)

echo "--- transpile with the CONSUMER's own installed typescript@$TS_RANGE ---"
(
  cd "$SCRATCH" && node node_modules/typescript/bin/tsc -p tsconfig.json
)

if [ ! -f "$SCRATCH/dist/consumer.js" ]; then
  echo "!!! expected $SCRATCH/dist/consumer.js after transpile, found nothing" >&2
  exit 1
fi

echo "public-tarball gate passed ($PKG_NAME@$PKG_VERSION, Node $(node -v), consumer typescript@$TS_RANGE)"
