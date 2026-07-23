#!/bin/sh -eu
# Gate: the guide dev container's package provisioning is consistent and
# complete, so the three hand-maintained lists cannot silently drift apart —
# the failure mode that once left plgg-cli unbuilt in-container and broke
# `serve-guide.sh` from a worktree.
#
# The three lists this gate reconciles:
#   install — workloads/guide/dev-entrypoint.sh's `for pkg in … do` npm-install
#             loop (each `file:` package gets its OWN node_modules in-container).
#   volume  — workloads/guide/compose.yaml's `/app/packages/<pkg>/node_modules`
#             anonymous volumes (keep the container's arch-specific installs off
#             the host mount; every installed package needs one).
#   built   — the packages scripts/build.sh builds (dependency-ordered).
#
# Invariant, asserted below:
#   1. volumes == installs + the build tool (plgg-bundle), exactly.
#   2. every installed library (bar the `guide` content app) is built by
#      build.sh — an installed-but-unbuilt package resolves to no dist.
#   3. every `file:` dependency plggpress declares is installed — a declared-
#      but-unprovisioned dep is the plgg-cli breakage, reproduced.
# Git-independent root resolution (runs on the host AND could run in-container).
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) && cd "$REPO_ROOT"

install_set=$(sed -n '/^for pkg in/,/^do$/p' \
  workloads/guide/dev-entrypoint.sh \
  | grep -oE '^  [a-z0-9-]+' | tr -d ' ' | sort -u)
volume_set=$(grep -oE '/app/packages/[a-z0-9-]+/node_modules' \
  workloads/guide/compose.yaml \
  | sed -E 's#/app/packages/([a-z0-9-]+)/node_modules#\1#' | sort -u)
built_set=$(sed -n \
  's#^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$#\1#p' \
  scripts/build.sh | sort -u)
# Only runtime `dependencies` (not devDependencies like plgg-test, which the
# container does not need to serve): the `dependencies` block precedes
# `devDependencies`, so the first `}` after it bounds the range.
plggpress_deps=$(sed -n '/"dependencies"/,/}/p' \
  packages/plggpress/package.json \
  | sed -n 's#.*"\(plgg[a-z-]*\)": *"file:.*#\1#p' | sort -u)
# The container provisions packages two ways, and BOTH count as provisioned:
# the entrypoint's install loop, and build.sh's `npm ci` bootstrap of the build
# TOOL. plgg-bundle is the tool: it runs from SOURCE (no dist, so it is
# deliberately absent from built_set) and is bootstrapped before any build, so
# it needs a volume but no install-loop entry. It became a plggpress RUNTIME
# dependency when `plggpress dev` shipped — plggpress reaches its dev loop
# through a dynamic import behind framework/Dev/node/devSeam, so `build` and
# `serve` never load it, but `dev` does and it must be present.
bootstrapped_set="plgg-bundle"
provisioned_set=$(printf '%s\n%s\n' "$install_set" "$bootstrapped_set" | sort -u)

fail=0
have() { printf '%s\n' "$1" | grep -qx "$2"; }

# 1. volumes must equal installs plus the build tool.
expected_volumes=$(printf '%s\nplgg-bundle\n' "$install_set" | sort -u)
if [ "$volume_set" != "$expected_volumes" ]; then
  echo "gate-guide-deps: compose volumes != entrypoint installs + plgg-bundle" >&2
  echo "  volumes : $(echo $volume_set)" >&2
  echo "  expected: $(echo $expected_volumes)" >&2
  fail=1
fi

# 2. every installed library (not the guide app) must be built by build.sh.
for pkg in $install_set; do
  [ "$pkg" = "guide" ] && continue
  have "$built_set" "$pkg" || {
    echo "gate-guide-deps: '$pkg' is installed by the container but not built by build.sh" >&2
    fail=1
  }
done

# 3. every file: dep plggpress declares must be PROVISIONED by the container —
#    installed by the entrypoint, or bootstrapped by build.sh (the build tool).
for dep in $plggpress_deps; do
  have "$provisioned_set" "$dep" || {
    echo "gate-guide-deps: plggpress depends on '$dep' but the guide container never provisions it" >&2
    fail=1
  }
done

if [ "$fail" -ne 0 ]; then
  echo "gate-guide-deps: FAILED — reconcile dev-entrypoint.sh, compose.yaml, and build.sh." >&2
  exit 1
fi
echo "gate-guide-deps: guide container install/volume/build lists are consistent"
