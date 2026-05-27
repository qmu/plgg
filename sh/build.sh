#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in src/plgg, src/plgg-kit, src/plgg-http-router, and src/plgg-http-client ==="
cd $REPO_ROOT/src/plgg && npm run build
cd $REPO_ROOT/src/plgg-kit && npm run build
cd $REPO_ROOT/src/plgg-http-router && npm run build
cd $REPO_ROOT/src/plgg-http-client && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
