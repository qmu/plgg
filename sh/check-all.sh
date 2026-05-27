#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

./sh/test-plgg.sh
./sh/test-plgg-kit.sh
./sh/test-plgg-foundry.sh
./sh/test-plgg-web.sh
./sh/test-plgg-view.sh
./sh/tsc-example.sh
./sh/build.sh
# Runs after build.sh: example-view consumes plgg-view's built dist as a real
# package dependency, so the library must be built first.
./sh/test-example-view.sh
