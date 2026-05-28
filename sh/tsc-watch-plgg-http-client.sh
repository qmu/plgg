#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in src/plgg-http-client ==="
cd $REPO_ROOT/src/plgg-http-client && npm run tsc:watch
