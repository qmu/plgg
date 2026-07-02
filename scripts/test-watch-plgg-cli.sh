#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in packages/plgg-cli ==="
cd $REPO_ROOT/packages/plgg-cli && npm run test:watch
