#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in src/plgg, src/plgg-kit, src/plgg-foundry, src/plgg-view, src/plgg-server, src/plgg-fetch, src/plgg-sql, and src/example ==="
cd $REPO_ROOT/src/plgg && npm install
cd $REPO_ROOT/src/plgg-kit && npm install
cd $REPO_ROOT/src/plgg-foundry && npm install
cd $REPO_ROOT/src/plgg-view && npm install
cd $REPO_ROOT/src/plgg-server && npm install
cd $REPO_ROOT/src/plgg-fetch && npm install
cd $REPO_ROOT/src/plgg-sql && npm install
cd $REPO_ROOT/src/example && npm install
echo "\n=== All shell scripts have been executed successfully ==="
