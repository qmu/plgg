#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

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
# plgg-server after plgg-view + plgg-http: its View renders plgg-view's Html and
# its Http layer builds on plgg-http's model.
cd $REPO_ROOT/packages/plgg-server && npm run build
# plgg-fetch after plgg-http: it shares the HTTP model (no longer depends on plgg-server).
cd $REPO_ROOT/packages/plgg-fetch && npm run build
cd $REPO_ROOT/packages/plgg-sql && npm run build
# plgg-test's published dist library (depends only on plgg core). Its test
# RUNNER is separate and untouched; this just builds its consumer-facing API.
cd $REPO_ROOT/packages/plgg-test && npm run build
echo "\n=== All shell scripts have been executed successfully ==="
