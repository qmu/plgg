# Guide workload — run the plgg family's guide
# (packages/guide) dev server with hot-reload, so one
# `docker compose up` serves the docs locally while you
# edit the Markdown. This is a *dev* image: it serves the
# guide through `plggpress dev`, NOT a production artifact
# (the static build/deploy is T8).
#
# Build context is the repo root (see
# workloads/guide/compose.yaml) so the in-container build
# can reach every sibling package plggpress imports.
FROM node:22-slim

# git: the canonical build/install scripts the entrypoint
# reuses (scripts/build.sh) resolve the repo root via
# `git rev-parse`, and the bind-mounted tree carries .git.
# node:22-slim ships without it, so add it here.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clean source only — node_modules/dist are excluded by the
# repo-root .dockerignore so nothing host-built leaks in.
# This is a fallback copy: at runtime compose bind-mounts
# the live host repo over /app, so the entrypoint actually
# operates on the mounted tree.
COPY . .

EXPOSE 5173

# The bind mount at runtime HIDES anything built into this
# image, so the seven sibling dists plggpress imports must
# be built AFTER the mount is live. dev-entrypoint.sh does
# that on the mounted tree (install the runtime graph +
# plgg-highlight's typescript, run scripts/build.sh, then
# `plggpress dev` on internal port 5173).
ENTRYPOINT ["sh", "workloads/guide/dev-entrypoint.sh"]
