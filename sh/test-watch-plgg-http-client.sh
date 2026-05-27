#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run test:watch' in src/plgg-http-client ==="
cd $REPO_ROOT/src/plgg-http-client && npm run test:watch
