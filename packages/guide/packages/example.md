# example (tutorial)

`example` is the plgg family's capstone demo: **one
Elm-Architecture program** (`Model` / `update` / `view`)
rendered three ways from a single source — client-side
(CSR), server-side (SSR), and as a static build (SSG). It
ties together [plgg-view](/packages/plgg-view),
[plgg-server](/packages/plgg-server), and
[plgg-router](/packages/plgg-router).

## One program, in `app.ts`

The whole app is pure plgg data and pure functions:

- **`Model`** — an immutable record (the to-do list, the
  current filter, transient toasts).
- **`Msg`** — a tagged union of everything that can
  happen.
- **`update(msg, model): Model`** — folds each `Msg` into
  the next model.
- **`view(model): Html<Msg>`** — renders the model with
  the [typed element builders](/packages/plgg-view#the-view-tree-—-html-msg-t);
  event handlers produce `Msg`.

The URL filter (`?filter=all|active|completed`) is part
of the model, reflected to the query string with
plgg-router's codecs — so navigation is just data flowing
through `update`. Adding or deleting a todo also returns a
`Cmd` (an auto-dismiss timer for its toast), so the app
exercises plgg-view's effects too.

## Three render targets

The same `view` and `init` are imported by each entry:

| Target | Entry | How |
|--------|-------|-----|
| **CSR** | `main.ts` | plgg-view's `application` runtime mounts over `#root` and diff/patches on every `Msg` |
| **SSR** | `server.ts` | plgg-server's `pageResponse` folds `Html<Msg>` through `renderToString`, ships `<script src="/main.js">` to boot the client |
| **SSG** | `build.ts` | `generateStatic` renders the same route to a static `index.html` at build time |

```typescript
// build.ts — the SSG entry, abbreviated
import { web, get, pageResponse } from "plgg-server";
import { generateStatic } from "plgg-server/ssg";
import { pipe, ok, matchResult } from "plgg";
import { view, init } from "./app";

const app = pipe(
  web(),
  get("/", async () =>
    ok(pageResponse({
      title: "plgg To-Do — SSG",
      root: view(init),
      clientEntry: "/main.js",
    })),
  ),
);

await generateStatic(app)({ paths: ["/"], outDir: "dist/site" })
  .then(matchResult(
    (e) => console.error("build failed", e),
    (files) => console.log("wrote", files),
  ));
```

::: tip First paint, not hydration
SSR and SSG produce a full first paint; on mount the
client re-renders from `view(init)` rather than adopting
the server DOM (plgg-view does not hydrate yet — see
[the caveat](/packages/plgg-view#ssr-—-rendertostring)).
Subsequent re-renders diff/patch in place.
:::

## Run it

The containerized dev workload runs the SSR + CSR demo in
one command:

```sh
docker compose -f workloads/development/compose.yaml up --build
# then open http://localhost:3000
```

Or directly: `npm run build` (bundles the client to
`dist/main.js`) then `npx tsx src/server.ts`. The static
build is `npx tsx src/build.ts` → `dist/site/index.html`.
