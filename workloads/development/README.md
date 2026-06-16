# workloads/development

A **development workload**: one container that builds the `plgg` packages the
[`example`](../../packages/example/) demo depends on, bundles the example client,
and runs its **SSR + CSR To-Do** server — so you can *see plgg-view (and the
plgg-server SSR path) actually work* without bootstrapping the monorepo by hand.

This is a dev image (it builds from source and runs the `tsx` dev server), not a
production artifact.

## Run it

From the repo root:

```sh
docker compose -f workloads/development/compose.yaml up --build
```

Then open <http://localhost:3000>.

Plain Docker equivalent (also from the repo root, so the build context is the
whole monorepo):

```sh
docker build -f workloads/development/Dockerfile -t plgg-example .
docker run --rm -p 3000:3000 plgg-example
```

## What you should see

- **`GET /`** — the To-Do page rendered **server-side** (plgg-server's
  `pageResponse` folds the shared `view(init)` through plgg-view's
  `renderToString`), with a `<script src="/main.js">` that boots the client.
- **`GET /main.js`** — the client bundle; on load, plgg-view's `sandbox` mounts
  over the server markup and the app becomes interactive (add / toggle / delete
  todos), now diff/patching the DOM in place.

One pure `Model`/`update`/`view` program, two render targets.

## How it builds (and why this order)

The example's `file:` dependencies are symlinked to each package's **built
`dist`**, so the image builds them in dependency order before starting the
server:

```
plgg → plgg-http → plgg-view → plgg-server → example (client bundle)
```

`plgg-server`'s build bundles `plgg-http` and `plgg-view`, so they must exist
first; at **runtime** the server (`tsx src/server.ts`) only resolves `plgg`,
`plgg-view`, and `plgg-server`. The final image runs from
`/app/packages/example` because `server.ts` reads `dist/main.js` relative to the
working directory.
