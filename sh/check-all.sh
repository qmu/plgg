#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Build all dists first (in dependency order) so every package below can resolve
# its `file:` dependencies' built output.
./sh/build.sh

./sh/test-plgg.sh
./sh/test-plgg-kit.sh
./sh/test-plgg-foundry.sh
./sh/test-plgg-view.sh
./sh/test-plgg-server.sh
./sh/test-plgg-http-client.sh
./sh/test-plgg-sql.sh
./sh/test-example.sh
