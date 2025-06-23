#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running npm runt tsc for plgg package ==="
cd $REPO_ROOT/src/plgg && npm run tsc
echo "\n=== All packages have been installed successfully ==="
