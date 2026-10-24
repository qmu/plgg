#!/bin/sh -eu
# Gate: the TypeScript 6/7 split-version layout stays intact in every manifest.
#
# PR #117 moved the toolchain to TypeScript 7 as a deliberate split: the root
# manifest and every package run `typescript@^7` as a devDependency (the
# toolchain, for the Go-native compiler's speed), while `plgg-bundle` and
# `plgg-test` pin `typescript@^6` under runtime `dependencies` instead — both
# ship to npm, and their transpiler, loader hook, and vendor-boundary analyzer
# are built on `transpileModule` / `preProcessFile`, which TypeScript 7 removed.
# Nothing enforced that split in code; it survived only because nobody had yet
# hand-edited the two manifests back to ^7 (dependabot cannot: PR #162 added an
# `ignore` entry for `typescript` majors). This gate makes that drift fail
# loudly instead of shipping a broken bundler/test-runner to npm:
#   - a `typescript` entry under `dependencies` must be ^6.x
#   - a `typescript` entry under `devDependencies` must be ^7.x
#
# Named as a residual gap in PR #162 ("the durable form would be a `gate-*.sh`
# enforcing the invariant"), deferred there to avoid colliding with PR #160's
# own new gate script.
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

echo "=== Gate: TypeScript 6/7 split-version invariant ==="

fail=0

for manifest in package.json packages/*/package.json; do
  if [ "$manifest" = "package.json" ]; then
    name="root"
  else
    name=$(basename "$(dirname "$manifest")")
  fi

  dep_line=$(sed -n '/"dependencies": {/,/^  }/p' "$manifest" \
    | grep '"typescript"' | head -1 || true)
  if [ -n "$dep_line" ]; then
    major=$(echo "$dep_line" \
      | sed -n 's/.*"typescript":[[:space:]]*"\^\([0-9][0-9]*\).*/\1/p')
    if [ "$major" != "6" ]; then
      echo "gate-typescript-split: $name pins typescript as a runtime dependency but not on ^6.x ($dep_line)" >&2
      fail=1
    fi
  fi

  devdep_line=$(sed -n '/"devDependencies": {/,/^  }/p' "$manifest" \
    | grep '"typescript"' | head -1 || true)
  if [ -n "$devdep_line" ]; then
    major=$(echo "$devdep_line" \
      | sed -n 's/.*"typescript":[[:space:]]*"\^\([0-9][0-9]*\).*/\1/p')
    if [ "$major" != "7" ]; then
      echo "gate-typescript-split: $name pins typescript as a devDependency but not on ^7.x ($devdep_line)" >&2
      fail=1
    fi
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "gate-typescript-split: FAILED — a typescript pin crossed the 6/7 split (see above)." >&2
  exit 1
fi
echo "gate-typescript-split: every typescript pin matches the split (dependencies=^6.x, devDependencies=^7.x)"
