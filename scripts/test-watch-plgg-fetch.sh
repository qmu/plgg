#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in packages/plgg-fetch ==="
cd $REPO_ROOT/packages/plgg-fetch && npm run test:watch
