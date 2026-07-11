#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running 'npm install' in every package ==="
# plgg-bundle first: it is the build tool every other package builds through,
# and it imports typescript from its OWN path (a `file:` link does not install
# the linked package's deps).
cd $REPO_ROOT/packages/plgg-bundle && npm install
cd $REPO_ROOT/packages/plgg && npm install
cd $REPO_ROOT/packages/plgg-parser && npm install
# plgg-ir-syntax after plgg-parser: the plgg-ir family's syntax layer
# file:-depends on plgg + plgg-parser.
cd $REPO_ROOT/packages/plgg-ir-syntax && npm install
# plgg-ir-language after plgg-ir-syntax: the language framework
# file:-depends on plgg + plgg-ir-syntax.
cd $REPO_ROOT/packages/plgg-ir-language && npm install
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
# plgg-sql / plgg-db-migration before plgg-cms: the CMS now owns the former
# content query/index source internally, and that code depends on the SQL and
# migration packages.
cd $REPO_ROOT/packages/plgg-sql && npm install
cd $REPO_ROOT/packages/plgg-db-migration && npm install
# plgg-auth before plgg-cms: the CMS owns the auth/admin dynamic mounts.
cd $REPO_ROOT/packages/plgg-auth && npm install
cd $REPO_ROOT/packages/plggpress && npm install
# plgg-cms after plggpress: it file:-depends on plggpress (the SSG framework
# seam) plus plgg-sql/plgg-db-migration/plgg-auth/plgg-server, all installed
# above; former content and MCP code is package-internal.
cd $REPO_ROOT/packages/plgg-cms && npm install
cd $REPO_ROOT/packages/plgg-fetch && npm install
cd $REPO_ROOT/packages/example && npm install
# private PoC-fleet apps: they only file:-depend on packages installed above
# (plgg, plgg-view, plgg-server/plgg-router, plgg-bundle, plgg-test), so they
# must join the clean-clone install loop or CI fails to resolve @types/node.
cd $REPO_ROOT/packages/plgg-poc-portal && npm install
cd $REPO_ROOT/packages/plgg-poc1-search && npm install
cd $REPO_ROOT/packages/guide && npm install
echo "\n=== All shell scripts have been executed successfully ==="
