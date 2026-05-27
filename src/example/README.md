# @plgg/example

> The single examples package for the [plgg monorepo](../../README.md). Everything
> that demonstrates how to use the libraries lives here — there are no separate
> `example-*` packages.

It consumes `plgg`, `plgg-view`, and `plgg-http-router` as real dependencies (`file:`),
so the imports below are exactly what an app outside this repo would write.

## What's inside

| # | Example | Where |
|---|---------|-------|
| — | plgg modeling (validation/casting with `cast`) | [`src/modeling/`](./src/modeling/) |
| 3 | **A simple plgg-view example** — components → a pure-data `VNode` tree | [`src/view/`](./src/view/) |
| 1 | **Server-side rendering** — `App` → HTML, served | [`src/ssr/server.ts`](./src/ssr/server.ts) |
| 2 | **Client-side rendering** — `App` → DOM, in the browser | [`src/csr/client.tsx`](./src/csr/client.tsx) |

`src/App.tsx` is the one component tree shared by both SSR and CSR (that is the
whole point — author once, render two ways). `src/view/` is a small gallery of
standalone plgg-view components (props, coercion, children, fragments, lists,
conditionals).

> The in-package `src/plgg-view/example.tsx` (a minimal plgg-view demo that
> prints a `VNode` tree) is separate and still lives alongside the library.

## Imports at a glance

```tsx
import { VNode, Child } from "plgg-view";                 // author components
import { renderToString, pageResponse } from "plgg-http-router";  // SSR
import { render } from "plgg-http-router/client";                 // CSR (browser)
```

JSX (`<p>…</p>`) resolves to `plgg-view/jsx-runtime` via `tsconfig.json`
(`"jsx": "react-jsx"`, `"jsxImportSource": "plgg-view"`).

## Run the isomorphic demo

```sh
cd src/example
npm install
npm run build      # bundle the client entry → dist/client.js
npm run serve      # tsx src/ssr/server.ts → http://localhost:3000
```

Then:

```sh
curl localhost:3000/            # SSR HTML document (references /client.js)
curl localhost:3000/client.js   # the client bundle
```

Open `http://localhost:3000` in a browser: the server-rendered HTML appears
immediately, then `client.js` re-renders the same tree (CSR). `npm test` checks
the plgg-view gallery and that SSR/CSR render the same `App`.
