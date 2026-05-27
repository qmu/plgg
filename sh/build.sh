#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in src/plgg, src/plgg-kit, src/plgg-view, src/plgg-http-router, src/plgg-http-client, and src/plgg-sql ==="
cd $REPO_ROOT/src/plgg && npm run build
cd $REPO_ROOT/src/plgg-kit && npm run build
# plgg-view before plgg-http-router: the router's View feature depends on plgg-view's dist.
cd $REPO_ROOT/src/plgg-view && npm run build
cd $REPO_ROOT/src/plgg-http-router && npm run build
# plgg-http-client after plgg-http-router: it consumes the router's dist.
cd $REPO_ROOT/src/plgg-http-client && npm run build
cd $REPO_ROOT/src/plgg-sql && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
