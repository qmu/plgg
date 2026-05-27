#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

./sh/test-plgg.sh
./sh/test-plgg-kit.sh
./sh/test-plgg-foundry.sh
./sh/test-plgg-view.sh
./sh/tsc-example.sh
./sh/build.sh
# Everything below consumes built dist of plgg-view/plgg-web as real package
# dependencies, so it must run after build.sh:
#   - plgg-web's View feature imports plgg-view
#   - example-view imports plgg-view; example-ssr imports plgg-view + plgg-web
./sh/test-plgg-web.sh
./sh/test-example-view.sh
./sh/test-example-ssr.sh
