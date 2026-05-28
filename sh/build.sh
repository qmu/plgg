#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm run build' in src/plgg, src/plgg-kit, src/plgg-view, src/plgg-server, src/plgg-fetch, and src/plgg-sql ==="
cd $REPO_ROOT/src/plgg && npm run build
cd $REPO_ROOT/src/plgg-kit && npm run build
# plgg-view before plgg-server: the router's View feature depends on plgg-view's dist.
cd $REPO_ROOT/src/plgg-view && npm run build
cd $REPO_ROOT/src/plgg-server && npm run build
# plgg-fetch after plgg-server: it consumes the router's dist.
cd $REPO_ROOT/src/plgg-fetch && npm run build
cd $REPO_ROOT/src/plgg-sql && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
