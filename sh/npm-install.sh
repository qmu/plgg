#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running npm install for all packages ==="
cd $PROJECT_ROOT/src/plgg && npm install
cd $PROJECT_ROOT/src/example && npm install
echo "\n=== All packages have been installed successfully ==="

