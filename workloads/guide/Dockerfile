# Guide workload — run the plgg family's VitePress guide
# (packages/guide) dev server with hot-reload, so one
# `docker compose up` serves the docs locally while you
# edit the Markdown. This is a *dev* image: it installs
# the guide package and runs `vitepress dev`. Not a
# production artifact (the static build/deploy is T8).
#
# Build context is the repo root (see
# workloads/guide/compose.yaml) so the guide can reach
# sibling packages if later tickets embed built dists.
FROM node:22-slim

WORKDIR /app

# Clean source only — node_modules/dist are excluded by
# the repo-root .dockerignore so nothing host-built
# leaks in.
COPY . .

# The guide is content-only Markdown at this stage, so
# only its own dev deps (VitePress) need installing.
RUN cd packages/guide && npm install

EXPOSE 5173

# vitepress dev serves packages/guide with hot-reload;
# --host binds 0.0.0.0 so the port is reachable from the
# host. The repo is mounted over /app at runtime (see
# compose.yaml) so edits reload live.
WORKDIR /app/packages/guide
CMD ["npx", "vitepress", "dev", "--host", "0.0.0.0", "--port", "5173"]
