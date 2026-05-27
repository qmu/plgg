#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

./sh/test-plgg.sh
./sh/test-plgg-kit.sh
./sh/test-plgg-foundry.sh
./sh/test-plgg-view.sh
./sh/build.sh
# Everything below consumes built dist of other packages as real dependencies,
# so it must run after build.sh:
#   - plgg-web's View feature imports plgg-view
#   - plgg-sql's example-web.ts imports plgg-web
#   - the example package imports plgg-view + plgg-web (view, SSR, CSR)
./sh/test-plgg-web.sh
./sh/test-plgg-sql.sh
./sh/test-example.sh
