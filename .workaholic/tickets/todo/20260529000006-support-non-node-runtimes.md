---
created_at: 2026-05-29T00:00:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Support non-Node runtimes (Bun, Deno, Workers) via per-runtime adapter subpaths

## Overview

`plgg-server` is functionally runtime-agnostic — the entire request/response pipeline runs on Web-standard `Request`/`Response` via `toFetch`, and `Fetch = (Request) => Promise<Response>` is the seam — but the public entry currently re-exports `Serving`, which drags `node:http` into the root barrel. As a result, any consumer resolving `plgg-server` from Bun, Deno, or a Cloudflare Workers bundle pulls a `node:http` import its target runtime cannot resolve.

This ticket isolates `node:http` behind a `plgg-server/node` subpath, drops `Serving` from the root export so `.` becomes runtime-neutral, and ships passthrough adapters for Bun (`./bun`) and Deno (`./deno`). Cloudflare Workers / Deno Deploy / browser-fetch are covered by the runtime-neutral `toFetch(app)` value itself — it is already a valid Workers `fetch` handler — so no extra adapter code is needed for those; only documentation.

Sibling packages (`plgg-view`, `plgg-sql`, `plgg-fetch`) and `plgg` core need no changes — they have zero `node:*` imports already.

## Key Files

- `src/plgg-server/src/Serving/usecase/serve.ts` — the only `node:http`-coupled file in any library package. Move to `src/plgg-server/src/node.ts` (or keep under `Serving/usecase/` and re-export only via a new `node.ts` barrel). Imports `createServer`, `IncomingMessage`, `ServerResponse`, `Server` from `node:http`; uses `Buffer.concat`/`Buffer.from` and `req.on('data'|'end'|'error')`. Already self-describes as "the platform seam, confined here."
- `src/plgg-server/src/Serving/usecase/serve.spec.ts` — booted-socket integration test for the Node adapter. Move alongside the relocated source so it still runs under vitest's Node pool.
- `src/plgg-server/src/Serving/index.ts` — barrel that re-exports `usecase`. Either delete (preferred — Serving stops being a public concept) or strip to re-export only runtime-neutral helpers if any remain.
- `src/plgg-server/src/index.ts` — top-level barrel; must stop re-exporting `Serving`. Final shape: `export * from "plgg-server/Http"; export * from "plgg-server/Routing"; export * from "plgg-server/View";`.
- `src/plgg-server/src/node.ts` — NEW barrel for the Node adapter (`export { serve, type ServeOptions } from "plgg-server/Serving/usecase/serve";` or the relocated path).
- `src/plgg-server/src/bun.ts` — NEW: passthrough adapter `(opts: ServeOptions, onListen?) => (handler: Fetch) => Bun.Server`. One file, ~10 lines.
- `src/plgg-server/src/deno.ts` — NEW: passthrough adapter `(opts: ServeOptions, onListen?) => (handler: Fetch) => Deno.HttpServer<Deno.NetAddr>`. One file, ~10 lines.
- `src/plgg-server/package.json` — add `./node`, `./bun`, `./deno` to `exports`; keep `.` and `./client`. No new `dependencies` (zero-runtime-dep rule); Bun/Deno types stay out of `devDependencies` too unless typing requires them — prefer ambient declarations or `// @ts-expect-error`-free typing via narrow per-file globals.
- `src/plgg-server/vite.config.ts` — add `node`, `bun`, `deno` to the multi-entry `build.lib.entry` map. Per-entry `rollupOptions.external`: only the `node` entry externalizes `node:http`/`node:stream`; bun/deno/workers entries externalize nothing runtime-specific.
- `src/plgg-server/src/Routing/usecase/toFetch.ts` — already exports `Fetch` type and `toFetch`. No code change; reference from README as the runtime-neutral handler shape.
- `src/example/src/server.ts` — currently imports `serve` from `plgg-server`. Update to `import { serve } from "plgg-server/node"`.
- `src/plgg-server/README.md` — document the new entry-point matrix and how Workers/Deno-Deploy consume `toFetch(app)` directly (`export default { fetch: toFetch(app) }`).
- `src/plgg-server/README_ja.md` — Japanese counterpart per `.workaholic/constraints/project.md` documentation rule.

## Related History

The seam-isolation pattern this ticket extends is already explicit in the codebase — prior work established the rule "platform types only at the seam" and verified `vite` tree-shakes the Node adapter out of the browser bundle, but no prior ticket has acted on it for non-Node server runtimes.

Past tickets that touched similar areas:

- [20260527023827-streaming-binary-bodies.md](.workaholic/tickets/archive/work-20260513-182057/20260527023827-streaming-binary-bodies.md) — Codified `serve.ts` as the "irreducible imperative adapter" and "Keep Request/Response/stream types out of the domain model"; the seam this ticket splits behind a subpath.
- [20260528091347-fullstack-example-combining-view-sql-http-client.md](.workaholic/tickets/archive/work-20260528-011843/20260528091347-fullstack-example-combining-view-sql-http-client.md) — "Seam isolation: `node:sqlite` only in `db/open.ts`, `node:http` only in `serve`, `fetch` only in plgg-http-client's seam." Surfaced that plgg-fetch transitively pulled `node:http` via the router top barrel — the same risk this ticket eliminates.
- [20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md](.workaholic/tickets/archive/work-20260528-143038/20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md) — Verified vite tree-shook `serve`/`toFetch` out of the browser bundle. Useful precedent for verifying Workers/Deno bundles stay clean.
- [20260528193320-rename-plgg-http-router-to-plgg-server.md](.workaholic/tickets/archive/work-20260528-143038/20260528193320-rename-plgg-http-router-to-plgg-server.md) — Current package name. The rename ironically tightened the lexical link between `plgg-server` and Node; this ticket loosens the implementation link.
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) — Established the "native fetch/Request/Response only at one seam" pattern that this ticket mirrors on the server side.

## Implementation Steps

1. **Move the Node adapter behind a subpath barrel.** Create `src/plgg-server/src/node.ts` that re-exports `serve` and `ServeOptions` from the current `Serving/usecase/serve.ts`. Decide whether to physically move `serve.ts` under `src/Node/` (cleaner naming) or leave it at `Serving/usecase/` and just stop re-exporting it from the root barrel (smaller diff). Smaller diff is preferred unless a follow-up ticket renames the directory.
2. **Drop `Serving` from the root barrel.** Edit `src/plgg-server/src/index.ts` to remove `export * from "plgg-server/Serving";`. The `Fetch` type and `toFetch` remain exported via `Routing` and are the runtime-neutral surface.
3. **Add the Bun adapter.** Create `src/plgg-server/src/bun.ts` exporting `serve(options, onListen?)` curried as `(handler: Fetch) => Bun.Server`. Internally calls `Bun.serve({ port: options.port, hostname: options.hostname, fetch: handler })` and invokes `onListen?.()` after construction. Mirror the data-last `(options, onListen?) => (handler) => RuntimeHandle` shape of the Node adapter so `pipe(app, toFetch, serve(...))` still terminates a chain. Types: declare `Bun.serve` via a minimal local interface (no `@types/bun` dependency); use `Option`/`getOr` for nullable `hostname` to match plgg style.
4. **Add the Deno adapter.** Create `src/plgg-server/src/deno.ts` with the same curried shape, internally calling `Deno.serve({ port: options.port, hostname: options.hostname, onListen }, handler)`. Same local minimal type declaration approach.
5. **Workers / Deno Deploy / Fetch:** no adapter file. Document in `README.md` that the runtime-neutral handler is `toFetch(app)` and that Workers consume it as `export default { fetch: toFetch(app) }`. Reuse the existing `Fetch` type doc comment.
6. **Update `package.json` exports.** Add `./node`, `./bun`, `./deno` subpaths mirroring the existing `./client` shape (dual ESM/CJS, `types` + `default` per condition).
7. **Update `vite.config.ts`.** Extend `build.lib.entry` to include `node`, `bun`, `deno`. Configure `rollupOptions.external` per entry so only the Node entry externalizes `node:*`; the bun/deno entries externalize nothing (they only reference host globals).
8. **Migrate the example.** Edit `src/example/src/server.ts` to import `serve` from `plgg-server/node`. Verify `sh/build-plgg-server.sh` (or equivalent) emits four entry bundles and no cross-contamination (the Node bundle is the only one importing `node:*`).
9. **Add spec coverage for Bun/Deno barrels.** Since `Bun.serve` and `Deno.serve` cannot run under the Node vitest pool, the adapter files must be designed so that the only logic outside the platform call is pure (hostname `Option` handling, options destructuring). Cover that pure surface with vitest by injecting a fake `serve`-shaped function into a small `createAdapter(serveImpl)` factory exported from each file. The exported `serve` is the partial application against the real `Bun.serve` / `Deno.serve`. Run the factory tests against a fake to keep ≥90% coverage.
10. **Verify coverage thresholds and tsc.** Run `sh/tsc-plgg.sh` and `sh/test-plgg.sh`. plgg-server's vitest threshold is 91% — confirm the new lines are exercised through the `createAdapter` indirection (step 9). No `as`/`any`/`ts-ignore` anywhere.
11. **Document.** Update `src/plgg-server/README.md` with a runtime matrix table (Node → `plgg-server/node`, Bun → `plgg-server/bun`, Deno → `plgg-server/deno`, Workers / Deno Deploy → `toFetch(app)` directly). Add a `README_ja.md` counterpart per the `.workaholic` documentation rule.

## Patches

> Speculative — verify the exact line numbers/structure before applying.

### `src/plgg-server/src/index.ts`

```diff
--- a/src/plgg-server/src/index.ts
+++ b/src/plgg-server/src/index.ts
@@ -1,4 +1,3 @@
 export * from "plgg-server/Http";
 export * from "plgg-server/Routing";
-export * from "plgg-server/Serving";
 export * from "plgg-server/View";
```

### `src/plgg-server/src/node.ts` (new)

```diff
--- /dev/null
+++ b/src/plgg-server/src/node.ts
@@ -0,0 +1,2 @@
+export { serve } from "plgg-server/Serving/usecase/serve";
+export type { ServeOptions } from "plgg-server/Serving/usecase/serve";
```

### `src/plgg-server/src/bun.ts` (new — shape only)

```diff
--- /dev/null
+++ b/src/plgg-server/src/bun.ts
@@ -0,0 +1,32 @@
+import { fromNullable, getOr, pipe } from "plgg";
+import type { Fetch } from "plgg-server/index";
+
+export type ServeOptions = {
+  readonly port: number;
+  readonly hostname?: string;
+};
+
+type BunServeOptions = {
+  port: number;
+  hostname?: string;
+  fetch: Fetch;
+};
+type BunServer = { stop: () => void };
+type BunServeImpl = (opts: BunServeOptions) => BunServer;
+
+declare const Bun: { serve: BunServeImpl };
+
+export const createAdapter =
+  (impl: BunServeImpl) =>
+  (options: ServeOptions, onListen?: () => void) =>
+  (handler: Fetch): BunServer => {
+    const hostname = pipe(fromNullable(options.hostname), getOr(""));
+    const server = impl({ port: options.port, ...(hostname ? { hostname } : {}), fetch: handler });
+    onListen?.();
+    return server;
+  };
+
+export const serve = createAdapter(Bun.serve);
```

### `src/plgg-server/package.json`

```diff
--- a/src/plgg-server/package.json
+++ b/src/plgg-server/package.json
@@ -16,6 +16,36 @@
         "default": "./dist/index.cjs.js"
       }
     },
+    "./node": {
+      "import": {
+        "types": "./dist/node.d.ts",
+        "default": "./dist/node.es.js"
+      },
+      "require": {
+        "types": "./dist/node.d.ts",
+        "default": "./dist/node.cjs.js"
+      }
+    },
+    "./bun": {
+      "import": {
+        "types": "./dist/bun.d.ts",
+        "default": "./dist/bun.es.js"
+      },
+      "require": {
+        "types": "./dist/bun.d.ts",
+        "default": "./dist/bun.cjs.js"
+      }
+    },
+    "./deno": {
+      "import": {
+        "types": "./dist/deno.d.ts",
+        "default": "./dist/deno.es.js"
+      },
+      "require": {
+        "types": "./dist/deno.d.ts",
+        "default": "./dist/deno.cjs.js"
+      }
+    },
     "./client": {
       "import": {
         "types": "./dist/client.d.ts",
```

### `src/example/src/server.ts`

```diff
-import { serve, toFetch } from "plgg-server";
+import { toFetch } from "plgg-server";
+import { serve } from "plgg-server/node";
```

## Considerations

- **Public-API breakage at the root entry.** Dropping `Serving` from `src/plgg-server/src/index.ts` removes `serve` / `ServeOptions` from the root export. Existing consumers (today only `src/example/`) must migrate to `plgg-server/node`. Acceptable because plgg-server is at 0.0.1 and pre-release; document in the release note.
- **Type-only references to runtime globals.** `Bun` and `Deno` are global namespaces in their host runtimes but undefined under Node. Use `declare const Bun: …` / `declare const Deno: …` inside the adapter file scope rather than depending on `@types/bun` / `@types/deno` (zero-runtime-dep policy extends to devDependencies where avoidable; ambient declarations are cleaner). No `as`/`any`/`ts-ignore` — model `Bun.serve` / `Deno.serve` with the minimum interface the adapter needs (`src/plgg-server/src/bun.ts`, `src/plgg-server/src/deno.ts`).
- **Coverage strategy for runtimes vitest can't host.** Bun/Deno adapter spec files cannot boot a real `Bun.serve` / `Deno.serve` under Node. Factor each adapter as `createAdapter(impl)` (pure) + a thin `export const serve = createAdapter(realImpl)` line; cover the pure factory with a fake `impl` in `bun.spec.ts` / `deno.spec.ts`. The `realImpl` partial-application line is one statement and the threshold can absorb it. (`src/plgg-server/src/bun.ts`, `src/plgg-server/src/deno.ts`).
- **Bundle hygiene.** After step 7 the Workers/Deno/Bun bundles must contain zero `node:*` imports. Add a guard (a shell grep over `dist/{bun,deno}.es.js` for `node:` after build) to the test script, or document the manual check. Mirrors the precedent set in `20260528213109-rewrite-example-as-todo-app-with-mvc-layout.md`.
- **`Fetch` is the runtime-neutral handler — do not duplicate it.** `Routing/usecase/toFetch.ts` already exports the `Fetch` type and the `toFetch` value. Workers / Deno Deploy / browser-fetch users consume `toFetch(app)` directly — no adapter wrapper. Resist adding `workers.ts` / `web.ts` files; that creates lookalike code where there is no code to write.
- **Curried adapter shape consistency.** Keep `(options, onListen?) => (handler) => RuntimeHandle` across all adapters so `pipe(app, toFetch, serve(...))` reads identically regardless of runtime (`src/plgg-server/src/Serving/usecase/serve.ts` shape governs).
- **Vendor neutrality / zero new runtime deps.** No `@cloudflare/workers-types`, `@deno/types`, `@types/bun` in `dependencies`. Per the architecture constraint and `standards:leading-availability` lens, types live as local ambient declarations or stay out entirely (`src/plgg-server/package.json`).
- **plgg-fetch is already runtime-neutral.** Its `Http/usecase/seam.ts` and `request.ts` only use Web globals; no changes needed. Worth a one-line confirmation in the release note rather than a separate ticket (`src/plgg-fetch/src/`).
- **`plgg` core's `process.env` access (`src/plgg/src/Functionals/env.ts`).** Already self-guards via `typeof process === 'undefined'` and returns `Err`, so Workers compatibility is preserved without change. No work required, but worth noting in the README's portability matrix.
- **Documentation language rule.** `.workaholic/constraints/project.md` requires `_ja.md` counterparts for documents created/updated. The README change in step 11 must come with a `README_ja.md` update (`src/plgg-server/README_ja.md`).
- **Bun's `hostname: ""` vs. `undefined`.** Some `Bun.serve` versions reject empty strings. The patch above conditionally spreads `hostname`; verify against the current Bun stable behavior before merging.
- **No new third-party runtime imports allowed.** Per `standards:leading-availability` Vendor Neutrality + `.workaholic/specs/infrastructure.md` (`The only runtime dependency is plgg`), every adapter must rely solely on the host runtime's built-ins. Pre-merge check: `git diff src/plgg-server/package.json` must show no additions under `dependencies`.

## Open Questions (verify before / during implementation)

- Should `serve` keep its name across `plgg-server/{node,bun,deno}` (consistent verb) or be runtime-suffixed (`serveNode`, `serveBun`, `serveDeno`) so a single file can import multiple for testing? Recommend: keep `serve` per subpath — matches the `./client` precedent, where the local name is the verb and the subpath is the qualifier.
- Should `node:http` move from `Serving/usecase/serve.ts` into a new `src/Node/` directory (and `bun.ts` / `deno.ts` into `src/Bun/` / `src/Deno/`)? Recommend: stay flat (`src/node.ts` / `src/bun.ts` / `src/deno.ts`) until there is more than one file per runtime — simpler diff, mirrors `src/client.ts`.
