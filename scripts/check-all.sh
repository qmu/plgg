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

# plgg-bundle is the in-house build tool every package builds through, so it is
# tested in the same gate.
./scripts/test-plgg-bundle.sh
./scripts/test-plgg.sh
./scripts/test-plgg-test.sh
./scripts/test-plgg-kit.sh
./scripts/test-plgg-foundry.sh
./scripts/test-plgg-http.sh
./scripts/test-plgg-view.sh
./scripts/test-plgg-md.sh
./scripts/test-plgg-parser.sh
./scripts/test-plgg-ir-syntax.sh
./scripts/test-plgg-ir-language.sh
./scripts/test-plgg-ir-manifest.sh
./scripts/test-plgg-highlight.sh
./scripts/test-plgg-router.sh
./scripts/test-plgg-server.sh
./scripts/test-plgg-cli.sh
./scripts/test-plggpress.sh
./scripts/test-plgg-cms.sh
./scripts/test-plgg-fetch.sh
./scripts/test-plgg-sql.sh
./scripts/test-plgg-db-migration.sh
./scripts/test-plgg-auth.sh
./scripts/test-example.sh
./scripts/test-plgg-poc-portal.sh
./scripts/test-plgg-poc1-search.sh
./scripts/test-plgg-poc2-agent.sh
./scripts/test-plgg-poc3-voice.sh
./scripts/test-plgg-poc4-edit.sh
./scripts/test-plgg-poc4b-coedit.sh
./scripts/test-plgg-poc4c-livesite.sh
./scripts/test-plgg-poc5-config.sh
./scripts/test-plgg-poc6-classify.sh

# Record a same-session green stamp. `set -e` means this line is reached only
# when every gate/build/test above passed, so it captures the tracked
# working-tree digest this run just certified. publish-npm.sh auto-skips its
# own gate when this stamp still matches the tree (invalidated by any tracked
# edit), so SKIP_GATE stops being something a human must remember.
node "$REPO_ROOT/scripts/gateStamp.ts" write
