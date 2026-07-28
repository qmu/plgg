#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Gate: no DIRECT vite — the canonical gate, shared verbatim with the
# run-tests CI workflow (scripts/gate-vite.sh) so it can't drift.
./scripts/gate-vite.sh

# Gate: no happy-dom — shed for plgg-test's in-house DOM environment. Same
# shared-with-CI canonical gate (scripts/gate-happy-dom.sh).
./scripts/gate-happy-dom.sh

# Gate: every package is documented and linked top-to-bottom — presence, the
# root README index, back-links, and no dead links (scripts/gate-readme.sh).
./scripts/gate-readme.sh

# Gate: the guide dev container's three provisioning lists (entrypoint installs,
# compose volumes, build.sh) stay consistent and cover plggpress's deps, so they
# can't silently drift (scripts/gate-guide-deps.sh).
./scripts/gate-guide-deps.sh

# Gate: the vendor-boundary policy — a third-party import (node:*, the tsc API,
# any bare non-plgg specifier) may appear in PRODUCTION code only under a
# package's vendors/ or entrypoints/. Unexempted violations OR stale exemptions
# fail (scripts/gate-vendor-boundary.sh; exemptions in
# scripts/vendor-boundary-exemptions.txt).
./scripts/gate-vendor-boundary.sh

# Gate: the repository's own TS tooling scripts (scripts/*.ts — the publish
# preflight and its pure helpers) typecheck strictly and their unit tests pass.
# They run under Node's native type-stripping; the typecheck uses the build
# tool's own TypeScript (plgg-bundle/node_modules, bootstrapped by the
# vendor-boundary gate above). No `as`/`any` escape hatch survives this.
node "$REPO_ROOT/packages/plgg-bundle/node_modules/typescript/bin/tsc" -p scripts/tsconfig.json
node --test scripts/*.spec.ts

# Build all dists first (in dependency order) so every package below can resolve
# its `file:` dependencies' built output.
./scripts/build.sh

# Gate: the plgg-test scheduler behaves identically on Node, Deno and Bun — the
# constraint that ruled out `worker_threads` in favour of promises and child
# processes. Runs the scheduler for real on every runtime present; Deno and Bun
# are optional (skipped with a note when absent), Node is not
# (scripts/gate-cross-runtime.sh).
#
# MUST run AFTER build.sh, not with the gates above: it executes the scheduler
# from source, which imports `plgg` and therefore resolves
# packages/plgg-test/node_modules/plgg/dist/index.es.js. A developer's tree
# already carries that dist from an earlier run, so placing it with the gates
# passed locally and failed on the clean runner with ERR_MODULE_NOT_FOUND —
# the sibling-dist masking class this repository keeps rediscovering.
./scripts/gate-cross-runtime.sh

# The verification phase: the whole-repo typecheck gate plus every package's
# suite, fanned out across processes through the one canonical runner.
#
# This replaced two things. The `tsc --noEmit &&` prefix on each package's
# `test` script meant 38 cold `tsc` programs (50.9 s measured), each re-parsing
# lib.d.ts and @types/node from scratch; tests RUN via native type-stripping and
# never needed tsc, so typecheck is now ONE gate over one shared type graph
# (scripts/typecheck.ts — each package keeps its own program and options, so a
# node-only package still cannot see DOM). And this block used to be 37
# `./scripts/test-<pkg>.sh` lines run strictly one after another; they are now a
# bounded process pool in scripts/runTests.ts, with the typecheck gate as one
# more job in the same pool so it overlaps the suites instead of leaving three
# cores idle. Measured on this 4-core box: 228.5 s → 33.8 s, and the runner
# prints the phase wall clock on every run.
#
# The per-package `./scripts/test-<pkg>.sh` scripts still exist for running one
# package by hand; check-all just no longer enumerates them.
#
# COVERAGE: pass --coverage to this script to run the phase with the four-metric
# >90% gate. It is NOT on by default — collection plus its fold measured 57% of
# the entire phase, all of it paid on the command developers run before every
# commit. Run `./scripts/check-all.sh --coverage` before a release.
node "$REPO_ROOT/scripts/runTests.ts" --typecheck ${1:+"$1"}

# Record a same-session green stamp. `set -e` means this line is reached only
# when every gate/build/test above passed, so it captures the tracked
# working-tree digest this run just certified. publish-npm.sh auto-skips its
# own gate when this stamp still matches the tree (invalidated by any tracked
# edit), so SKIP_GATE stops being something a human must remember.
node "$REPO_ROOT/scripts/gateStamp.ts" write
