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
# plgg-ir-syntax after plgg-parser: the plgg-ir family's S-expression syntax
# layer builds its tokenizer on the combinator core's dist.
cd $REPO_ROOT/packages/plgg-ir-syntax && npm run build
# plgg-ir-language after plgg-ir-syntax: the static language framework
# (forms/operators/scopes/type checker/normalization) consumes its dist.
cd $REPO_ROOT/packages/plgg-ir-language && npm run build
# plgg-ir-manifest after plgg-ir-language: the Domain Manifest dialect is
# defined with the framework's registries and pipeline.
cd $REPO_ROOT/packages/plgg-ir-manifest && npm run build
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
# plgg-sql / plgg-db-migration BEFORE plgg-cms: the CMS now owns the former
# content query/index source internally, and that code depends on SQL +
# migrations (+ plgg-md), so the dependency dists must exist before CMS builds.
cd $REPO_ROOT/packages/plgg-sql && npm run build
# plgg-db-migration after plgg-sql: the migration engine builds on plgg + the
# plgg-sql Db seam (both marked external; built earlier for resolution order).
cd $REPO_ROOT/packages/plgg-db-migration && npm run build
# plgg-auth BEFORE plgg-cms: plgg-cms depends on plgg-auth (the OIDC OP+RP admin
# auth mount). plgg-auth composes plgg + plgg-http/server + plgg-sql +
# plgg-db-migration, all built above.
cd $REPO_ROOT/packages/plgg-auth && npm run build
# plgg-mcp BEFORE plgg-cms: the MCP protocol substrate (re-extracted from
# plgg-cms's internal mcpProtocol by ticket 20260716000445). Depends only on
# plgg; plgg-cms's content tools consume its dist.
cd $REPO_ROOT/packages/plgg-mcp && npm run build
# plgg-search after plgg: the browser-shippable FTS core (PoC 1's proven
# artifact, integration-1). Zero node builtins; plggpress's build step and the
# reader bundle will both consume its dist.
cd $REPO_ROOT/packages/plgg-search && npm run build
# plggpress: the slim STATIC-SITE GENERATOR. It carries its own framework
# internally (the absorbed former app-framework facade) and consumes plgg-cli,
# plgg-server, plgg-md, plgg-highlight, plgg-view, and plgg-http directly —
# all built earlier so it can resolve dists. Its static theme support is local.
# The dynamic content/server surface now lives in plgg-cms, built next.
cd $REPO_ROOT/packages/plggpress && npm run build
# plgg-cms after plggpress: the dynamic content-management surface (admin, /api,
# auth, editing, media, ops, mcp, agent). It owns the former content and MCP
# source trees internally, composes onto plggpress's framework seam
# (published `plggpress/framework` subpath), and file:-depends on plggpress plus
# plgg-sql/plgg-db-migration/plgg-auth/plgg-server — all built above.
cd $REPO_ROOT/packages/plgg-cms && npm run build
# plgg-fetch after plgg-http: it shares the HTTP model (no longer depends on plgg-server).
cd $REPO_ROOT/packages/plgg-fetch && npm run build
# plgg-test's published dist library (depends only on plgg core). Its test
# RUNNER is separate and untouched; this just builds its consumer-facing API.
cd $REPO_ROOT/packages/plgg-test && npm run build
# example: the leaf CSR app bundle (dist/main.js). Built last — it consumes
# plgg + plgg-view + plgg-router (+ plgg-server's view types) and inlines them
# from source via the in-house bundler's app target.
cd $REPO_ROOT/packages/example && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
