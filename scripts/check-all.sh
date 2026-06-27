#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Gate: no DIRECT vite — the canonical gate, shared verbatim with the
# run-tests CI workflow (scripts/gate-vite.sh) so it can't drift.
./scripts/gate-vite.sh

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
./scripts/test-plgg-router.sh
./scripts/test-plgg-server.sh
./scripts/test-plgg-fetch.sh
./scripts/test-plgg-sql.sh
./scripts/test-plgg-db-migration.sh
./scripts/test-example.sh
