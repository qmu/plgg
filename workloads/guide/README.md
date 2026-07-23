# workloads/guide

A **development workload**: one container that serves the
[`guide`](../../packages/guide/) site through
[`plggpress`](../../packages/plggpress/) with hot-reload —
so you can read and edit the official plgg family guide
locally without installing the toolchain on the host.

This is a dev image (it runs the guide package's
`npm run dev`, which invokes `plgg-bundle dev
bundle.config.ts`).
The static production build and deploy are T8.

## Run it

From the repo root:

```sh
bash scripts/serve-guide.sh
```

Then open <http://localhost:5181>. Editing any Markdown
under `packages/guide/` reloads the page live (the repo is
mounted into the container and `plgg-bundle dev` watches
the content tree, pushing reloads over SSE).

The script is a thin wrapper over the underlying compose
command (also runnable directly from the repo root):

```sh
docker compose -f workloads/guide/compose.yaml up --build
```

Either engine works: `scripts/serve-guide.sh` auto-detects
`docker` or `podman` (a `docker`→`podman` shell alias is
interactive-only, so the script resolves a real binary).
The compose file is engine-agnostic; on a podman host run
`podman compose -f workloads/guide/compose.yaml up --build`.

## How the container resolves plggpress's siblings

`plggpress` is not a single self-contained package: the
guide dev server resolves a runtime graph across the plgg
family packages. The old single-package VitePress install
never needed those sibling dists, so the container has to
provide them now.

The crux is mount ordering. `compose.yaml` bind-mounts the
host repo over `/app`, and that mount **hides anything
built into the image at build time**. So the container
builds the dists *after* the mount is live, on the mounted
tree, where Node actually resolves them. That work lives in
[`dev-entrypoint.sh`](dev-entrypoint.sh), which on startup:

1. **Installs the runtime symlink graph** — `npm install`
   in each package in plggpress's runtime graph, in
   dependency order. `file:` deps do not cascade, so every
   package needs its own `node_modules`; in particular
   each package gets its own dependency tree for the
   source-run dev server.
2. **Builds every sibling dist** via the canonical
   [`scripts/build.sh`](../../scripts/build.sh) — the
   dependency-ordered, in-house bundler build. Because this
   runs after the mount, the dists are written onto the
   mounted tree and survive it.
3. **Serves the guide** with `npm run dev` from
   `packages/guide`, i.e. `plgg-bundle dev
   bundle.config.ts`, on the container's internal port
   **5173**.

Each `node_modules` the entrypoint installs into is an
anonymous volume (see `compose.yaml`), so the container's
deps stay isolated from the host repo and the dev image is
reproducible regardless of the host's install state.

## Ports and the tunnel

The container serves on **5173**; compose maps host
**5181 → 5173**. Host port 5181 matches the cloudflared
tunnel route for `plgg-guide.qmu.dev`, and the guide's
`site.config.ts` lists that host in `dev.allowedHosts`, so
the dev server accepts requests arriving through the
tunnel (and rejects unknown Hosts with a 403).

## What you should see

The guide's landing page, with the full nav and sidebar
information architecture (Guide / Packages /
Contributing) navigable end to end. The dev container runs
the guide package's `npm run dev` and serves the guide's
Markdown content directly.

## Coexists with the example demo

This workload publishes host port **5181** (matching the
cloudflared tunnel route for `plgg-guide.qmu.dev`; the
container itself serves 5173), while
[`workloads/development`](../development/) runs the
`example` demo on **3000**, so both can run at once.
