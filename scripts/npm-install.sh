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
# poc2 after poc1: it file:-depends on plgg-poc1-search (the reuse seam onto
# the proven FTS arm) and on plgg-kit (the server-side answer engine).
cd $REPO_ROOT/packages/plgg-poc2-agent && npm install
# poc3 after poc1 for the same reuse seam (its GA realtime mint is a direct
# fetch in its own entrypoint — plgg-kit's minter targets the retired pre-GA
# endpoint; see the plgg-kit GA-migration ticket).
cd $REPO_ROOT/packages/plgg-poc3-voice && npm install
cd $REPO_ROOT/packages/guide && npm install
echo "\n=== All shell scripts have been executed successfully ==="
