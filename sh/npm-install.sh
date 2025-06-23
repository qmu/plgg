#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running npm install for all packages ==="
cd $REPO_ROOT/src/plgg && npm install
cd $REPO_ROOT/src/example && npm install
echo "\n=== All packages have been installed successfully ==="

