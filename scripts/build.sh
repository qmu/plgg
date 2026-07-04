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
# plggpress last of the web stack: it now carries its framework internally
# (the absorbed former plggmatic) and consumes plgg-cli, plgg-server, plgg-md,
# plgg-highlight, plgg-view, and plgg-http directly (all built earlier so it
# can resolve their dists).
cd $REPO_ROOT/packages/plggpress && npm run build
# plgg-fetch after plgg-http: it shares the HTTP model (no longer depends on plgg-server).
cd $REPO_ROOT/packages/plgg-fetch && npm run build
cd $REPO_ROOT/packages/plgg-sql && npm run build
# plgg-db-migration after plgg-sql: the migration engine builds on plgg + the
# plgg-sql Db seam (both marked external; built earlier for resolution order).
cd $REPO_ROOT/packages/plgg-db-migration && npm run build
# plgg-auth: the OIDC/JOSE toolkit; depends only on plgg core (WebCrypto is a
# runtime global, not a dependency), so any position after plgg works.
cd $REPO_ROOT/packages/plgg-auth && npm run build
# plgg-test's published dist library (depends only on plgg core). Its test
# RUNNER is separate and untouched; this just builds its consumer-facing API.
cd $REPO_ROOT/packages/plgg-test && npm run build
# example: the leaf CSR app bundle (dist/main.js). Built last — it consumes
# plgg + plgg-view + plgg-router (+ plgg-server's view types) and inlines them
# from source via the in-house bundler's app target.
cd $REPO_ROOT/packages/example && npm run build
# --- plggmatic UI design framework, its docs site, and workbench example ---
# plggmatic (UI design framework: tokens, row/column/pane combinators,
# components) — consumes plgg + plgg-view, both built above.
cd $REPO_ROOT/packages/plggmatic && npm run build
# plggmatic-example: the workbench CSR app; the app bundler inlines
# plgg/plgg-view/plggmatic from source, so it builds after plggmatic.
cd $REPO_ROOT/packages/plggmatic-example && npm run build
# site: the plggpress-built docs for plggmatic; needs plggpress + plggmatic.
cd $REPO_ROOT/packages/site && npm run build
# nest the workbench app under the served docs at /example/.
rm -rf $REPO_ROOT/packages/site/dist/example
mkdir -p $REPO_ROOT/packages/site/dist/example
cp -r $REPO_ROOT/packages/plggmatic-example/dist/. $REPO_ROOT/packages/site/dist/example/
echo "\n=== All shell scripts have been executed successfully ==="
