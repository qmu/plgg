#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT
# --------- (End of Boilerplate) ---------

echo "=== Running 'npm run coverage' in src/plgg ==="
cd $REPO_ROOT/src/plgg && npm run coverage
echo "\n=== All shell scripts have been executed successfully ==="
