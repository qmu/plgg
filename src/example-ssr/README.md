# @plgg/example-ssr

> Isomorphic **SSR + CSR** demo built with **[plgg-web](../plgg-web/)** and
> **[plgg-view](../plgg-view/)**. Part of the [plgg monorepo](../../README.md).

One component tree (`App`, authored in `.tsx` with plgg-view) rendered two ways
by plgg-web:

- **SSR** — the server renders `App` to an HTML document with `renderToString` /
  `pageResponse` and serves it.
- **CSR** — the browser loads the client bundle, which re-renders the same `App`
  into the server-rendered `#root` with `render` (from `plgg-web/client`).

```
App.tsx ──┬─ server.ts  → renderToString → pageResponse        (SSR)
          └─ client.tsx → render(App(), #root)                 (CSR)
```

## Files

| File | Role |
|------|------|
| [`src/App.tsx`](./src/App.tsx) | the shared view (plgg-view JSX) |
| [`src/server.ts`](./src/server.ts) | plgg-web app: `GET /` SSRs the page, `GET /client.js` serves the bundle |
| [`src/client.tsx`](./src/client.tsx) | client entry; bundled to `dist/client.js`; mounts `App` into `#root` |
| [`src/App.spec.tsx`](./src/App.spec.tsx) | renders `App` both ways and asserts they match |

## Run it

```sh
cd src/example-ssr
npm install
npm run build      # bundle the client entry → dist/client.js
npm run serve      # npx tsx src/server.ts → http://localhost:3000
```

Then:

```sh
curl localhost:3000/            # the SSR HTML document (references /client.js)
curl localhost:3000/client.js   # the client bundle
```

Open `http://localhost:3000` in a browser: you see the server-rendered HTML
immediately, and `client.js` then re-renders the same tree (CSR). `npm test`
verifies both renderers produce the same `App`.
