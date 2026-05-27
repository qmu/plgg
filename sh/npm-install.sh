#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in src/plgg, src/plgg-kit, src/plgg-foundry, src/plgg-view, src/plgg-web, and src/example ==="
cd $REPO_ROOT/src/plgg && npm install
cd $REPO_ROOT/src/plgg-kit && npm install
cd $REPO_ROOT/src/plgg-foundry && npm install
cd $REPO_ROOT/src/plgg-view && npm install
cd $REPO_ROOT/src/plgg-web && npm install
cd $REPO_ROOT/src/example && npm install
echo "\n=== All shell scripts have been executed successfully ==="

