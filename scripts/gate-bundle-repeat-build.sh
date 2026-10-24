#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: plgg-bundle, installed the way a real npm consumer installs it, must
# build the SAME consumer directory twice in a row without error (qmu/plgg
# #155). The published 0.0.6 bin copied the package to a per-version scratch
# dir under $TMPDIR on every run and, before re-linking that copy's
# node_modules, called `rmSync(link, { force: true })` on a symlink that
# pointed at a DIRECTORY. On a platform where plain (non-recursive) `rmSync`
# refuses to remove such a symlink, the first run created the link and the
# SECOND run's attempt to clear it threw `ERR_FS_EISDIR` — so every build
# after the first one failed, which is exactly the shape of a dev server that
# rebuilds on every save.
#
# `bin/relocate.mjs` is gone (5b109cec, "Remove plgg-bundle relocate.mjs, run
# from dist"): a real registry install now runs the compiled `dist/cli.es.js`
# directly from inside node_modules, with no /tmp copy and no re-link step at
# all. Nothing on that path can throw EISDIR on a second run, because nothing
# on that path touches the filesystem beyond reading the consumer's own
# source. This gate proves it by packing the just-built plgg-bundle the same
# way `npm install` would lay it out, building one fixture consumer TWICE in
# the SAME directory, and then asserting no `plgg-relocate-*` scratch
# directory exists anywhere under $TMPDIR — proof the whole copy-and-relink
# mechanism the bug lived in is structurally gone, not just that one rebuild
# happened to succeed.

BUNDLE_DIR="$REPO_ROOT/packages/plgg-bundle"

echo "=== Gate: plgg-bundle repeat build in one consumer dir (issue #155) ==="

if [ ! -f "$BUNDLE_DIR/dist/cli.es.js" ]; then
  echo "plgg-bundle dist missing; run ./scripts/build.sh first" >&2
  exit 1
fi

TMP_BASE="${TMPDIR:-/tmp}"
SCRATCH=$(mktemp -d "$TMP_BASE/plgg-bundle-repeat-build.XXXXXX")
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
export const greeting: string = "hello from the repeat-build fixture";
EOF

RUN=1
while [ "$RUN" -le 2 ]; do
  echo "--- run $RUN: building $CONSUMER in place ---"
  OUTPUT=$(cd "$CONSUMER" && node node_modules/plgg-bundle/bin/plgg-bundle.mjs 2>&1) \
    && STATUS=0 || STATUS=$?
  echo "$OUTPUT"
  if [ "$STATUS" -ne 0 ]; then
    echo "plgg-bundle repeat-build gate FAILED on run $RUN (issue #155 regression)" >&2
    exit 1
  fi
  if [ ! -f "$CONSUMER/dist/main.js" ]; then
    echo "expected $CONSUMER/dist/main.js to exist after run $RUN" >&2
    exit 1
  fi
  RUN=$((RUN + 1))
done

STRAY=$(find "$TMP_BASE" -maxdepth 1 -name 'plgg-relocate-*' 2>/dev/null || true)
if [ -n "$STRAY" ]; then
  echo "found leftover relocate scratch dir(s) under $TMP_BASE; the retired" >&2
  echo "copy-to-/tmp-and-relink mechanism appears to still be running:" >&2
  echo "$STRAY" >&2
  echo "plgg-bundle repeat-build gate FAILED (issue #155 regression)" >&2
  exit 1
fi

echo "plgg-bundle repeat-build gate passed"
