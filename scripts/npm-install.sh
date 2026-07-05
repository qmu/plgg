#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in every package ==="
# plgg-bundle first: it is the build tool every other package builds through,
# and it imports typescript from its OWN path (a `file:` link does not install
# the linked package's deps).
cd $REPO_ROOT/packages/plgg-bundle && npm install
cd $REPO_ROOT/packages/plgg && npm install
cd $REPO_ROOT/packages/plgg-parser && npm install
cd $REPO_ROOT/packages/plgg-test && npm install
cd $REPO_ROOT/packages/plgg-kit && npm install
cd $REPO_ROOT/packages/plgg-foundry && npm install
cd $REPO_ROOT/packages/plgg-http && npm install
cd $REPO_ROOT/packages/plgg-cli && npm install
cd $REPO_ROOT/packages/plgg-router && npm install
cd $REPO_ROOT/packages/plgg-view && npm install
cd $REPO_ROOT/packages/plgg-md && npm install
cd $REPO_ROOT/packages/plgg-highlight && npm install
cd $REPO_ROOT/packages/plgg-server && npm install
# plggmatic before plggpress: plggpress now file:-depends on plggmatic for its
# ported theme, so plggmatic's package is present when plggpress installs.
cd $REPO_ROOT/packages/plggmatic && npm install
# plgg-sql / plgg-db-migration / plgg-content before plggpress: plggpress now
# file:-depends on plgg-content (the /api delivery mount), which itself
# file:-depends on plgg-sql + plgg-db-migration, so all must install first.
cd $REPO_ROOT/packages/plgg-sql && npm install
cd $REPO_ROOT/packages/plgg-db-migration && npm install
cd $REPO_ROOT/packages/plgg-content && npm install
cd $REPO_ROOT/packages/plggpress && npm install
cd $REPO_ROOT/packages/plgg-fetch && npm install
cd $REPO_ROOT/packages/plgg-domain && npm install
cd $REPO_ROOT/packages/plgg-auth && npm install
cd $REPO_ROOT/packages/example && npm install
cd $REPO_ROOT/packages/guide && npm install
cd $REPO_ROOT/packages/plggmatic-example && npm install
cd $REPO_ROOT/packages/site && npm install
echo "\n=== All shell scripts have been executed successfully ==="
