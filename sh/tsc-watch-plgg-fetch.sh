#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run tsc:watch' in src/plgg-fetch ==="
cd $REPO_ROOT/src/plgg-fetch && npm run tsc:watch
