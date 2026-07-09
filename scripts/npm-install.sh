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
# plgg-ui is the retained UI engine from the plggmatic extraction. It stays in
# this monorepo and is consumed directly by plggpress and plgg-cms.
cd $REPO_ROOT/packages/plgg-ui && npm install
# plgg-sql / plgg-db-migration / plgg-content before plgg-cms: plgg-cms mounts
# plgg-content's read-only delivery API and that package depends on the SQL and
# migration packages.
cd $REPO_ROOT/packages/plgg-sql && npm install
cd $REPO_ROOT/packages/plgg-db-migration && npm install
cd $REPO_ROOT/packages/plgg-content && npm install
cd $REPO_ROOT/packages/plgg-mcp && npm install
# plgg-auth before plgg-cms: the CMS owns the auth/admin dynamic mounts.
cd $REPO_ROOT/packages/plgg-auth && npm install
cd $REPO_ROOT/packages/plggpress && npm install
# plgg-cms after plggpress: it file:-depends on plggpress (the SSG framework
# seam) plus plgg-content/plgg-sql/plgg-auth/plgg-mcp/plgg-server, all installed
# above.
cd $REPO_ROOT/packages/plgg-cms && npm install
cd $REPO_ROOT/packages/plgg-fetch && npm install
cd $REPO_ROOT/packages/plgg-domain && npm install
cd $REPO_ROOT/packages/example && npm install
cd $REPO_ROOT/packages/guide && npm install
echo "\n=== All shell scripts have been executed successfully ==="
