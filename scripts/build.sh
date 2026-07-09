#!/bin/sh -eu
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) && cd "$REPO_ROOT"

# Bootstrap the build TOOL's own deps before any package builds. plgg-bundle is
# the bundler every package's `build` runs through, and it imports `typescript`
# from its OWN path — but a `file:` link does not install the linked package's
# node_modules, so a clean checkout/runner has no plgg-bundle/node_modules and
# the build fails with `Cannot find package 'typescript'`. Installing it here
# (the one canonical bootstrap) makes the local path reproduce CI. Idempotent:
# only when absent, so warm rebuilds stay fast.
if [ ! -d "$REPO_ROOT/packages/plgg-bundle/node_modules/typescript" ]; then
  echo "=== Bootstrapping plgg-bundle deps (the build tool) ==="
  cd "$REPO_ROOT/packages/plgg-bundle" && npm ci && cd "$REPO_ROOT"
fi

echo "=== Building every library dist with the in-house bundler (npm run build), in dependency order ==="
cd $REPO_ROOT/packages/plgg && npm run build
# plgg-parser: the zero-dep parser combinator core; depends only on plgg core.
# Built before plgg-highlight, which will consume its dist for the TS grammar.
cd $REPO_ROOT/packages/plgg-parser && npm run build
cd $REPO_ROOT/packages/plgg-kit && npm run build
# plgg-foundry after plgg-kit: it consumes plgg-kit's dist (and plgg core).
# Now built in-house, so it joins the ordered set (was previously ad-hoc).
cd $REPO_ROOT/packages/plgg-foundry && npm run build
# plgg-http: the shared runtime-neutral HTTP model; depends only on plgg core.
# Built before plgg-server and plgg-fetch, which both consume its dist.
cd $REPO_ROOT/packages/plgg-http && npm run build
# plgg-router: a pure path toolkit depending only on plgg core (no plgg-view).
cd $REPO_ROOT/packages/plgg-router && npm run build
cd $REPO_ROOT/packages/plgg-view && npm run build
# plgg-md after plgg-view: its AST->Html fold emits plgg-view's Html and it takes
# an injected Highlighter seam (filled by plgg-highlight, built next).
cd $REPO_ROOT/packages/plgg-md && npm run build
# plgg-highlight after plgg-md: the zero-dep TS/TSX highlighter that satisfies
# plgg-md's injected Highlighter seam.
cd $REPO_ROOT/packages/plgg-highlight && npm run build
# plgg-server after plgg-view + plgg-http: its View renders plgg-view's Html and
# its Http layer builds on plgg-http's model.
cd $REPO_ROOT/packages/plgg-server && npm run build
# plgg-cli before plggpress: the CLI-wrapper toolkit (depends only on plgg
# core), consumed by plggpress's own framework, so its dist must exist first.
cd $REPO_ROOT/packages/plgg-cli && npm run build
# plgg-ui (the plgg-family UI engine: layout combinators, components, forms,
# the declarative vocabulary, the scheduler, renderers, and the theme surface)
# — the reusable seam extracted from plggmatic (trip plggmatic-extraction-cut,
# ticket A1). Consumes plgg + plgg-view, both built above. Built BEFORE
# plggpress/plgg-cms, which consume the engine directly.
cd $REPO_ROOT/packages/plgg-ui && npm run build
# plgg-sql / plgg-db-migration / plgg-content BEFORE plgg-cms: plgg-cms mounts
# plgg-content's read-only delivery API at /api, and plgg-content depends on
# plgg-sql + plgg-db-migration (+ plgg-md), so the whole chain must have dists
# before plgg-cms builds (it is built just after plggpress, below).
cd $REPO_ROOT/packages/plgg-sql && npm run build
# plgg-db-migration after plgg-sql: the migration engine builds on plgg + the
# plgg-sql Db seam (both marked external; built earlier for resolution order).
cd $REPO_ROOT/packages/plgg-db-migration && npm run build
# plgg-content after plgg-md/plgg-sql/plgg-db-migration: the derived SQLite index
# + delivery/query API + FTS5 search, consumed by plgg-cms's /api mount.
cd $REPO_ROOT/packages/plgg-content && npm run build
# plgg-mcp after plgg-content: the MCP server's read-only tools wrap
# plgg-content's query fns, so its dist must exist first.
cd $REPO_ROOT/packages/plgg-mcp && npm run build
# plgg-auth BEFORE plgg-cms: plgg-cms depends on plgg-auth (the OIDC OP+RP admin
# auth mount). plgg-auth composes plgg + plgg-http/server + plgg-sql +
# plgg-db-migration, all built above.
cd $REPO_ROOT/packages/plgg-auth && npm run build
# plggpress: the slim STATIC-SITE GENERATOR. It carries its own framework
# internally (the absorbed former app-framework facade) and consumes plgg-cli,
# plgg-server, plgg-md, plgg-highlight, plgg-view, plgg-http, and plgg-ui (the
# theme) directly — all built earlier so it can resolve dists. The dynamic
# content/server surface (and its plgg-content/plgg-sql/plgg-auth/plgg-mcp deps)
# now lives in plgg-cms, built next.
cd $REPO_ROOT/packages/plggpress && npm run build
# plgg-cms after plggpress: the dynamic content-management surface (admin, /api,
# auth, editing, media, ops, mcp, agent). It composes onto plggpress's framework
# seam (published `plggpress/framework` subpath) and file:-depends on plggpress
# plus plgg-content/plgg-sql/plgg-auth/plgg-mcp/plgg-server — all built above.
cd $REPO_ROOT/packages/plgg-cms && npm run build
# plgg-fetch after plgg-http: it shares the HTTP model (no longer depends on plgg-server).
cd $REPO_ROOT/packages/plgg-fetch && npm run build
# plgg-domain after plgg-db-migration: the durable-core spine composes plgg +
# the plgg-sql Db/Sql seam + plgg-db-migration's Migration/Version, all built
# above, into a domain-first derivation spine (schema, boot gate, export).
cd $REPO_ROOT/packages/plgg-domain && npm run build
# plgg-test's published dist library (depends only on plgg core). Its test
# RUNNER is separate and untouched; this just builds its consumer-facing API.
cd $REPO_ROOT/packages/plgg-test && npm run build
# example: the leaf CSR app bundle (dist/main.js). Built last — it consumes
# plgg + plgg-view + plgg-router (+ plgg-server's view types) and inlines them
# from source via the in-house bundler's app target.
cd $REPO_ROOT/packages/example && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
