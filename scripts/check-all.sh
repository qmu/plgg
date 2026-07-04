#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# Gate: no DIRECT vite — the canonical gate, shared verbatim with the
# run-tests CI workflow (scripts/gate-vite.sh) so it can't drift.
./scripts/gate-vite.sh

# Gate: no happy-dom — shed for plgg-test's in-house DOM environment. Same
# shared-with-CI canonical gate (scripts/gate-happy-dom.sh).
./scripts/gate-happy-dom.sh

# Gate: every package is documented and linked top-to-bottom — presence, the
# root README index, back-links, and no dead links (scripts/gate-readme.sh).
./scripts/gate-readme.sh

# Gate: the guide dev container's three provisioning lists (entrypoint installs,
# compose volumes, build.sh) stay consistent and cover plggpress's deps, so they
# can't silently drift (scripts/gate-guide-deps.sh).
./scripts/gate-guide-deps.sh

# Build all dists first (in dependency order) so every package below can resolve
# its `file:` dependencies' built output.
./scripts/build.sh

# plgg-bundle is the in-house build tool every package builds through, so it is
# tested in the same gate.
./scripts/test-plgg-bundle.sh
./scripts/test-plgg.sh
./scripts/test-plgg-test.sh
./scripts/test-plgg-kit.sh
./scripts/test-plgg-foundry.sh
./scripts/test-plgg-http.sh
./scripts/test-plgg-view.sh
./scripts/test-plgg-md.sh
./scripts/test-plgg-highlight.sh
./scripts/test-plgg-router.sh
./scripts/test-plgg-server.sh
./scripts/test-plgg-cli.sh
./scripts/test-plggpress.sh
./scripts/test-plgg-fetch.sh
./scripts/test-plgg-sql.sh
./scripts/test-plgg-db-migration.sh
./scripts/test-plgg-auth.sh
./scripts/test-example.sh
./scripts/test-plggmatic.sh
./scripts/test-plggmatic-example.sh
./scripts/test-site.sh
