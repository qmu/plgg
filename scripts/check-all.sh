#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Build all dists first (in dependency order) so every package below can resolve
# its `file:` dependencies' built output.
./scripts/build.sh

./scripts/test-plgg.sh
./scripts/test-plgg-kit.sh
./scripts/test-plgg-foundry.sh
./scripts/test-plgg-view.sh
./scripts/test-plgg-router.sh
./scripts/test-plgg-server.sh
./scripts/test-plgg-fetch.sh
./scripts/test-plgg-sql.sh
./scripts/test-example.sh
