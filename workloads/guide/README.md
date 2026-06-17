# workloads/guide

A **development workload**: one container that runs the
[`guide`](../../packages/guide/) VitePress site with
hot-reload — so you can read and edit the official plgg
family guide locally without installing VitePress on the
host.

This is a dev image (it runs the `vitepress dev` server).
The static production build and deploy are T8.

## Run it

From the repo root:

```sh
docker compose -f workloads/guide/compose.yaml up --build
```

Then open <http://localhost:5173>. Editing any Markdown
under `packages/guide/` reloads the page live (the repo
is mounted into the container).

Plain Docker equivalent (also from the repo root, so the
build context is the whole monorepo):

```sh
docker build -f workloads/guide/Dockerfile -t plgg-guide .
docker run --rm -p 5173:5173 \
  -v "$PWD":/app -v /app/packages/guide/node_modules \
  plgg-guide
```

## What you should see

The guide's landing page, with the full nav and sidebar
information architecture (Guide / Packages / API /
Contributing) navigable end to end. Most package and
concept pages are **stubs** at this stage — they note
which content ticket (T2–T8) fills them in. The
structure is the point: later tickets author content
against this stable tree.

## Coexists with the example demo

This workload uses port **5173**, while
[`workloads/development`](../development/) runs the
`example` demo on **3000**, so both can run at once.
