# PoC 4c workload — run BOTH halves of the real-rendered-
# site edit PoC (packages/plgg-poc4c-livesite) in one dev
# container:
#
#   * the INTERNAL plggpress dev server (`plgg-bundle dev`,
#     container-internal :5175) rendering the seeded,
#     agent-editable copy of the guide corpus with real hot
#     reload;
#   * the SHELL server (:5173 → host 5198) carrying the
#     session page, the mint + edit seams, and the
#     INJECTING /docs/* + /__plgg_reload proxy onto the
#     internal server.
#
# This is a *dev* image on the guide workload's recipe:
# build context is the repo root (see compose.yaml) so the
# in-container build can reach every sibling package
# plggpress imports.
FROM node:22-slim

WORKDIR /app

# Clean source only — node_modules/dist are excluded by the
# repo-root .dockerignore. Fallback copy: at runtime
# compose bind-mounts the live host repo over /app, so the
# entrypoint actually operates on the mounted tree.
COPY . .

EXPOSE 5173

# The bind mount at runtime HIDES anything built into this
# image, so installs/builds happen in dev-entrypoint.sh
# AFTER the mount is live.
ENTRYPOINT ["sh", "workloads/poc4c-livesite/dev-entrypoint.sh"]
