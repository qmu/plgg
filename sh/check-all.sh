#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

./sh/test-plgg.sh
./sh/tsc-example.sh
./sh/build-plgg.sh
