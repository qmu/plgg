---
created_at: 2026-06-17T00:19:53+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260617081221-proc-error-union-and-collapse.md]
---

# SSG (static site generation) for plgg-server + plgg-view

## Overview

Add a build-time **static site generator** to `plgg-server` that renders a set
of routes to static HTML files, reusing the existing render path
(`plgg-view` `renderToString`/`collectCss` → `plgg-server` `htmlDocument`) and
the real router (`handle`). It is a new *consumer* of already-shipped
primitives, not new rendering machinery.

**The design is decided** (these are not open questions — they are the only
shape consistent with the stack and the house style):

1. **Crawl via `handle`.** For each path, synthesize a bare GET `HttpRequest`
   and run `handle(app, req)`, then take the `HttpResponse` body string. This
   exercises **both** packages the way they actually deploy — routing +
   middleware run, and the handlers you already wrote call
   `pageResponse → htmlDocument → renderToString/collectCss`. Output is
   byte-identical to live SSR, with the handlers as the single source of truth.
   **Not** `toFetch`/`toNativeResponse`: `handle` already returns a plgg
   `HttpResponse` whose body is a `string`; going native would force a
   `Request`/`Response` encode→decode round-trip and a second failure surface.
2. **Explicit `paths` list.** The compiled route table has **no `params→paths`
   inverse** — a `:id`/`*rest` segment stores only the param *name*
   (`Routing/model/Segment.ts`), and `matchSegments`/`lookupRoute` only go
   *path → params*. So concrete paths (including expanded dynamic ones) are the
   only honest v1 input. No static-route auto-discovery in v1 (it can be a
   later `staticPaths(app)` helper).
3. **Strict failure.** A non-2xx status, a non-string (`Bytes`/`Stream`) body,
   an `HttpError`, or a failed fs write folds to a typed `SsgError` `Box` union
   and the whole `generateStatic` `Result` is `err`. Errors are **values**,
   never `throw`; CI catches a broken route immediately.
4. **Directory-index output.** `/` → `outDir/index.html`; `/about` →
   `outDir/about/index.html`. `splitPath` normalizes (`/about/` and `/about`
   collapse to one file).
5. **`node:fs` confined to one seam.** The pure render core lives in
   `src/Ssg/{model,usecase}/` (re-exported by the runtime-neutral
   `src/index.ts`); `node:fs`/`node:path` live only in `writeStatic.ts`,
   surfaced through a **new** node-only entry `src/ssg.ts` (a new `./ssg`
   `package.json` export) — exactly as `serve.ts` confines `node:http` behind
   `node.ts`. The root stays Workers/Deno-portable.
6. **HTML only.** The generator emits HTML; it does **not** build/copy the
   client JS bundle, images, or fonts (that stays with the existing Vite build).

**Caveat to document, not a feature:** plgg-view does **not** hydrate
(`render.ts` first paint does `container.replaceChildren(createNode(next))`;
README: "no hydration"). SSG output is correct for first paint / SEO / no-JS,
but when a `clientEntry` runs the browser discards the SSR DOM and re-renders
from `init(url)`. If progressive hydration is wanted, that is a separate
prerequisite ticket.

## Key Files

- `packages/plgg-server/src/View/usecase/htmlDocument.ts` - the route→full-HTML
  fold SSG reuses verbatim (inlines `collectCss(root)` into `<head>`, mounts
  `renderToString(root)` in `<div id="root">`).
- `packages/plgg-server/src/View/usecase/response.ts` - `pageResponse` =
  `htmlResponse(htmlDocument(opts))`; the SSR seam SSG's handlers already use.
- `packages/plgg-server/src/Routing/usecase/handle.ts` - `handle(app, request):
  PromisedResult<HttpResponse, HttpError>`; the crawl entry point.
- `packages/plgg-server/src/Routing/usecase/dispatch.ts` - confirms the handler
  body equals what a real request produces (so SSG output == live SSR), and
  that the middleware onion (auth guards) runs during a crawl.
- `packages/plgg-server/src/Routing/usecase/compilePattern.ts` - `splitPath`,
  reused for output-path normalization and the per-segment traversal guard.
- `packages/plgg-server/src/Serving/usecase/serve.ts` + `src/node.ts` - the
  platform-seam precedent to copy: `node:http` isolated in one usecase file,
  surfaced via a host-specific entry.
- `packages/plgg-http/src/Http/model/HttpRequest.ts` / `HttpResponse.ts` -
  exact shapes SSG synthesizes (`HttpRequest`) and reads (`HttpResponse.body:
  ResponseBody = SoftStr | Box<"Bytes"> | Box<"Stream">`; `status: HttpStatus =
  Box<"HttpStatus", number>`).
- `packages/plgg-http/src/Http/model/HttpError.ts` - the `Box`-union +
  `X$`-matcher convention `SsgError` copies.
- `packages/plgg-view/src/Html/usecase/{renderToString,collectCss}.ts` - the
  pure renderers SSG composes through `htmlDocument`; need **no** changes.
- `packages/example/src/server.ts` - live SSR usage and `node:fs` confinement
  pattern; `build.ts` (new) is its SSG counterpart.

## Related History

The SSG primitives all shipped on the archived `work-20260531-003055` branch;
SSG is the build-time consumer that walks routes and writes the rendered
documents to disk. No prior ticket does static generation (todo empty, no
icebox).

Past tickets that built the foundation SSG composes:

- [20260604182843-ssr-css-head-injection-and-demo.md](.workaholic/tickets/archive/work-20260531-003055/20260604182843-ssr-css-head-injection-and-demo.md) - shipped `htmlDocument`/`pageResponse` inlining `collectCss(root)` into `<head>` and `renderToString(root)` for the body — the exact per-route render-to-document path SSG invokes.
- [20260604182842-plgg-view-atomic-css-extraction.md](.workaholic/tickets/archive/work-20260531-003055/20260604182842-plgg-view-atomic-css-extraction.md) - added the pure, SSR-safe `collectCss` fold and `renderToString` markup arm; SSG relies on these having no DOM/runtime dependency so they run at build time.

## Implementation Steps

1. **Model** — `src/Ssg/model/Ssg.ts` + `model/index.ts`. Define `SsgPage`
   (`{ path, html }`), the `SsgError` `Box` union (`RenderFailed` / `NonOkStatus`
   / `NonHtmlBody` / `WriteFailed`) with one constructor + one `X$` matcher per
   variant (the `HttpError` convention), and `SsgConfig` (`{ paths, outDir }`).
   See Patches.
2. **Pure render core** — `src/Ssg/usecase/renderRoutes.ts` + `usecase/index.ts`.
   `getRequest(path)` builds the bare GET `HttpRequest` (`bytes: none()`);
   `toPage(path)(response)` folds status + body into `Result<SsgPage, SsgError>`
   (2xx range-check on `response.status.content`, `isSoftStr(response.body)` to
   narrow the string arm — **no cast**); `renderPath(app)(path)` awaits
   `handle`, lifts `HttpError → SsgError` via `mapErr`, then `chainResult`s into
   `toPage`; `renderRoutes(app)(paths)` reduces over a
   `PromisedResult<…, SsgError>` accumulator, short-circuiting via `isOk` to the
   first error (STRICT). **No `node:fs` in this file.**
3. **fs seam** — `src/Ssg/usecase/writeStatic.ts`. The **only** file touching
   `node:fs`/`node:path`. `writeStatic(outDir)(pages)` reduces over the pages,
   per page: `safeTarget` (reject `.`/`..`/separator parts via `splitPath`,
   resolve the absolute target and assert it stays under `resolve(outDir)`) →
   `mkdir -p` → `writeFile`, each fs call lifted into an `SsgError`-typed
   `Result` with `tryCatch(fn, (e) => writeFailed(path, String(e)))`. Mirror
   `serve.ts` style.
4. **Pure barrel** — `src/Ssg/index.ts` re-exports `model` + the pure usecases
   only (no `node:fs`), and add `export * from "plgg-server/Ssg"` to
   `src/index.ts` so the core stays runtime-neutral.
5. **Node entry** — `src/ssg.ts`. Re-exports the seam (`writeStatic`) and the
   `generateStatic(app)(config)` driver (`isOk(await renderRoutes…) ?
   writeStatic(outDir)(content) : rendered` — **not** `proc`, whose error
   channel is fixed to `Error` and cannot carry `SsgError`). Type-only
   re-exports use `export type { … }` (`erasableSyntaxOnly`/`isolatedModules`).
6. **Build wiring** — add the `./ssg` block to `package.json` `exports`, the
   `ssg` entry + `node:fs`/`node:path` externals + coverage-exclude to
   `vite.config.ts` (mirror `./node`/`node.ts`). See Patches.
7. **Spec coverage (>90%)** — colocated `renderRoutes.spec.ts` (args-in →
   values-out over a tiny in-memory `Web`: a 2xx page, a `notFound` route →
   `NonOkStatus`/`RenderFailed`, a bytes body → `NonHtmlBody`, multi-path
   ordering + short-circuit) and `writeStatic.spec.ts` (write to a temp dir,
   directory-index layout, `..`/escape rejection → `WriteFailed`). The fs entry
   `src/ssg.ts` is coverage-excluded like `node.ts`.
8. **Runnable demo** — `packages/example/src/build.ts`: build the same `view`
   the SSR demo serves into `dist/site/` via `plgg-server/ssg`, reporting the
   outcome as a value (`matchResult`, never throws). Proves the feature
   end-to-end per the working-style "prove value with a runnable demo" norm.
9. **Close the loop** — `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
   green. After touching `packages/plgg-server/src`, rebuild so the new `./ssg`
   export resolves for the `example` package.

## Patches

> The four new `src/Ssg/**` source files and `src/ssg.ts` are shown as full
> reference source (new files don't diff). The modified files (`package.json`,
> `vite.config.ts`, `src/index.ts`) are shown as diffs. All code below is the
> **adversarially type-checked** version — an earlier draft mis-used `proc`,
> `chainResult`, and a tag-`pattern` `Result` fold; those are corrected here.

### `packages/plgg-server/src/Ssg/model/Ssg.ts` (new)

```ts
import { Box, SoftStr, box, pattern } from "plgg";
import {
  HttpStatus,
  HttpError,
} from "plgg-server/index";

/** One rendered page: the crawl path and the
 * HTML the handler produced. Pure data. */
export type SsgPage = Readonly<{
  path: SoftStr;
  html: SoftStr;
}>;

export const ssgPage = (
  path: SoftStr,
  html: SoftStr,
): SsgPage => ({ path, html });

/** Static-generation failures as values — a
 * `Box` union threaded through `Result`,
 * mirroring the HttpError convention. */
export type SsgError =
  | Box<
      "RenderFailed",
      { path: SoftStr; error: HttpError }
    >
  | Box<
      "NonOkStatus",
      { path: SoftStr; status: HttpStatus }
    >
  | Box<"NonHtmlBody", { path: SoftStr }>
  | Box<
      "WriteFailed",
      { path: SoftStr; message: SoftStr }
    >;

export const renderFailed = (
  path: SoftStr,
  error: HttpError,
): SsgError =>
  box("RenderFailed")({ path, error });

export const nonOkStatus = (
  path: SoftStr,
  status: HttpStatus,
): SsgError =>
  box("NonOkStatus")({ path, status });

export const nonHtmlBody = (
  path: SoftStr,
): SsgError => box("NonHtmlBody")({ path });

export const writeFailed = (
  path: SoftStr,
  message: SoftStr,
): SsgError =>
  box("WriteFailed")({ path, message });

export const renderFailed$ = () =>
  pattern("RenderFailed")();
export const nonOkStatus$ = () =>
  pattern("NonOkStatus")();
export const nonHtmlBody$ = () =>
  pattern("NonHtmlBody")();
export const writeFailed$ = () =>
  pattern("WriteFailed")();

/** A static build: explicit paths (no
 * auto-discovery in v1) and an output dir. */
export type SsgConfig = Readonly<{
  paths: ReadonlyArray<SoftStr>;
  outDir: SoftStr;
}>;
```

### `packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` (new — corrected)

```ts
import {
  SoftStr,
  Result,
  PromisedResult,
  ok,
  err,
  isOk,
  isSoftStr,
  mapResult,
  mapErr,
  chainResult,
  none,
} from "plgg";
import {
  Web,
  HttpRequest,
  HttpResponse,
  HttpError,
  handle,
} from "plgg-server/index";
import {
  SsgPage,
  SsgError,
  ssgPage,
  renderFailed,
  nonOkStatus,
  nonHtmlBody,
} from "plgg-server/Ssg/model/Ssg";

/** The synthetic GET the crawler feeds to
 * `handle`. The literal already satisfies
 * HttpRequest — `"GET"` is a Method, `none()`
 * the empty bytes; no cast. */
export const getRequest = (
  path: SoftStr,
): HttpRequest => ({
  method: "GET",
  path,
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

const statusCode = (
  response: HttpResponse,
): number => response.status.content;

/** Narrows a 2xx string body to an SsgPage,
 * folding the STRICT failures into SsgError. */
export const toPage =
  (path: SoftStr) =>
  (
    response: HttpResponse,
  ): Result<SsgPage, SsgError> =>
    statusCode(response) >= 200 &&
    statusCode(response) < 300
      ? isSoftStr(response.body)
        ? ok(ssgPage(path, response.body))
        : err(nonHtmlBody(path))
      : err(
          nonOkStatus(path, response.status),
        );

/** Folds one awaited handler Result into an
 * SsgPage Result (lift HttpError, sequence). */
const pipeRendered =
  (path: SoftStr) =>
  (
    rendered: Result<HttpResponse, HttpError>,
  ): Result<SsgPage, SsgError> =>
    chainResult(toPage(path))(
      mapErr(
        (error: HttpError): SsgError =>
          renderFailed(path, error),
      )(rendered),
    );

/** Renders one crawl path. Not `proc` — its
 * error channel is fixed to Error and cannot
 * carry SsgError. */
export const renderPath =
  (app: Web) =>
  async (
    path: SoftStr,
  ): PromisedResult<SsgPage, SsgError> =>
    pipeRendered(path)(
      await handle(app, getRequest(path)),
    );

/** Renders every path in order, short-
 * circuiting to the first SsgError (STRICT). */
export const renderRoutes =
  (app: Web) =>
  (
    paths: ReadonlyArray<SoftStr>,
  ): PromisedResult<
    ReadonlyArray<SsgPage>,
    SsgError
  > =>
    paths.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<SsgPage>,
          SsgError
        >,
        path: SoftStr,
      ): PromisedResult<
        ReadonlyArray<SsgPage>,
        SsgError
      > =>
        acc.then(
          (
            soFar: Result<
              ReadonlyArray<SsgPage>,
              SsgError
            >,
          ): PromisedResult<
            ReadonlyArray<SsgPage>,
            SsgError
          > =>
            isOk(soFar)
              ? renderPath(app)(path).then(
                  mapResult(
                    (
                      page: SsgPage,
                    ): ReadonlyArray<SsgPage> => [
                      ...soFar.content,
                      page,
                    ],
                  ),
                )
              : Promise.resolve(soFar),
        ),
      Promise.resolve(
        ok<ReadonlyArray<SsgPage>>([]),
      ),
    );
```

### `packages/plgg-server/src/Ssg/usecase/writeStatic.ts` (new — the fs seam)

```ts
import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
  resolve,
  sep,
} from "node:path";
import {
  SoftStr,
  Result,
  PromisedResult,
  ok,
  err,
  isOk,
  tryCatch,
} from "plgg";
import { splitPath } from "plgg-server/index";
import {
  SsgPage,
  SsgError,
  writeFailed,
} from "plgg-server/Ssg/model/Ssg";

/** Directory-index target under outDir, with a
 * path-traversal guard returned as a value:
 * reject `.`/`..`/separator parts and assert
 * the resolved path stays under outDir. */
const safeTarget =
  (outDir: SoftStr) =>
  (
    path: SoftStr,
  ): Result<SoftStr, SsgError> => {
    const segments = splitPath(path);
    const unsafe = segments.some(
      (s: SoftStr): boolean =>
        s === "." ||
        s === ".." ||
        s.includes(sep) ||
        s.includes("/"),
    );
    const target = join(
      outDir,
      ...segments,
      "index.html",
    );
    const root = resolve(outDir);
    const resolved = resolve(target);
    return unsafe
      ? err(
          writeFailed(
            path,
            "unsafe path segment",
          ),
        )
      : resolved === root ||
          resolved.startsWith(root + sep)
        ? ok(target)
        : err(
            writeFailed(
              path,
              "path escapes outDir",
            ),
          );
  };

/** mkdir -p the parent, lifted to SsgError. */
const ensureDir =
  (path: SoftStr) =>
  (
    target: SoftStr,
  ): PromisedResult<SoftStr, SsgError> =>
    tryCatch(
      (dir: SoftStr): Promise<SoftStr> =>
        mkdir(dir, {
          recursive: true,
        }).then((): SoftStr => target),
      (error: unknown): SsgError =>
        writeFailed(path, String(error)),
    )(dirname(target));

/** Guard → mkdir → writeFile, each fs call an
 * SsgError-typed Result. */
const writePage =
  (outDir: SoftStr) =>
  (
    page: SsgPage,
  ): PromisedResult<SoftStr, SsgError> =>
    Promise.resolve(
      safeTarget(outDir)(page.path),
    ).then(
      (
        guard: Result<SoftStr, SsgError>,
      ): PromisedResult<SoftStr, SsgError> =>
        isOk(guard)
          ? ensureDir(page.path)(
              guard.content,
            ).then(
              (
                made: Result<SoftStr, SsgError>,
              ): PromisedResult<
                SoftStr,
                SsgError
              > =>
                isOk(made)
                  ? tryCatch(
                      (
                        file: SoftStr,
                      ): Promise<SoftStr> =>
                        writeFile(
                          file,
                          page.html,
                          "utf8",
                        ).then(
                          (): SoftStr => file,
                        ),
                      (
                        error: unknown,
                      ): SsgError =>
                        writeFailed(
                          page.path,
                          String(error),
                        ),
                    )(made.content)
                  : Promise.resolve(made),
            )
          : Promise.resolve(guard),
    );

/** Writes every page under outDir, short-
 * circuiting to the first SsgError. Yields the
 * written file paths. Data-last in `pages`. */
export const writeStatic =
  (outDir: SoftStr) =>
  (
    pages: ReadonlyArray<SsgPage>,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError
  > =>
    pages.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<SoftStr>,
          SsgError
        >,
        page: SsgPage,
      ): PromisedResult<
        ReadonlyArray<SoftStr>,
        SsgError
      > =>
        acc.then(
          (
            soFar: Result<
              ReadonlyArray<SoftStr>,
              SsgError
            >,
          ): PromisedResult<
            ReadonlyArray<SoftStr>,
            SsgError
          > =>
            isOk(soFar)
              ? writePage(outDir)(page).then(
                  (
                    one: Result<
                      SoftStr,
                      SsgError
                    >,
                  ): Result<
                    ReadonlyArray<SoftStr>,
                    SsgError
                  > =>
                    isOk(one)
                      ? ok([
                          ...soFar.content,
                          one.content,
                        ])
                      : one,
                )
              : Promise.resolve(soFar),
        ),
      Promise.resolve(
        ok<ReadonlyArray<SoftStr>>([]),
      ),
    );
```

### `packages/plgg-server/src/ssg.ts` (new node entry — corrected driver)

```ts
import {
  PromisedResult,
  SoftStr,
  isOk,
} from "plgg";
import { Web } from "plgg-server/index";
import {
  SsgConfig,
  SsgError,
} from "plgg-server/Ssg/model/Ssg";
import { renderRoutes } from "plgg-server/Ssg/usecase/renderRoutes";
import { writeStatic } from "plgg-server/Ssg/usecase/writeStatic";

export { renderRoutes } from "plgg-server/Ssg/usecase/renderRoutes";
export { writeStatic } from "plgg-server/Ssg/usecase/writeStatic";
export {
  ssgPage,
  renderFailed,
  nonOkStatus,
  nonHtmlBody,
  writeFailed,
  renderFailed$,
  nonOkStatus$,
  nonHtmlBody$,
  writeFailed$,
} from "plgg-server/Ssg/model/Ssg";
export type {
  SsgPage,
  SsgError,
  SsgConfig,
} from "plgg-server/Ssg/model/Ssg";

/** Render every path, then write the pages
 * under outDir, short-circuiting to the first
 * SsgError. A render failure never reaches the
 * fs seam. Not `proc` (Error-fixed channel). */
export const generateStatic =
  (app: Web) =>
  async (
    config: SsgConfig,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError
  > => {
    const rendered = await renderRoutes(app)(
      config.paths,
    );
    return isOk(rendered)
      ? writeStatic(config.outDir)(
          rendered.content,
        )
      : rendered;
  };
```

### `packages/plgg-server/src/index.ts`

```diff
 export * from "plgg-server/Http";
 export * from "plgg-server/Routing";
 export * from "plgg-server/View";
+export * from "plgg-server/Ssg";
```

### `packages/plgg-server/package.json`

```diff
     "./deno": {
       "import": {
         "types": "./dist/deno.d.ts",
         "default": "./dist/deno.es.js"
       },
       "require": {
         "types": "./dist/deno.d.ts",
         "default": "./dist/deno.cjs.js"
       }
+    },
+    "./ssg": {
+      "import": {
+        "types": "./dist/ssg.d.ts",
+        "default": "./dist/ssg.es.js"
+      },
+      "require": {
+        "types": "./dist/ssg.d.ts",
+        "default": "./dist/ssg.cjs.js"
+      }
     }
   },
```

### `packages/plgg-server/vite.config.ts`

```diff
         "src/node.ts",
         "src/bun.ts",
         "src/deno.ts",
+        "src/ssg.ts",
         "vite.config.ts",
@@
       entry: {
         index: "src/index.ts",
         node: "src/node.ts",
         bun: "src/bun.ts",
         deno: "src/deno.ts",
+        ssg: "src/ssg.ts",
       },
@@
-      external: ["node:http", "node:stream"],
+      external: [
+        "node:http",
+        "node:stream",
+        "node:fs",
+        "node:fs/promises",
+        "node:path",
+      ],
```

> **Note**: the `vite.config.ts` hunk is speculative on exact surrounding lines —
> read the real `coverage.exclude` / `build.lib.entry` / `rollupOptions.external`
> blocks and splice these additions in.

### `packages/example/src/build.ts` (new — runnable demo, corrected import)

```ts
import { join } from "node:path";
import {
  pipe,
  matchResult,
  ok,
} from "plgg";
import {
  web,
  get,
  pageResponse,
} from "plgg-server";
import {
  generateStatic,
  SsgError,
} from "plgg-server/ssg";
import { view, init } from "./app";

const app = pipe(
  web(),
  get("/", async () =>
    ok(
      pageResponse({
        title: "plgg To-Do — SSG",
        root: view(init),
        clientEntry: "/main.js",
      }),
    ),
  ),
);

const OUT_DIR = join(
  process.cwd(),
  "dist",
  "site",
);

generateStatic(app)({
  paths: ["/"],
  outDir: OUT_DIR,
}).then(
  matchResult(
    (e: SsgError): void =>
      console.error("build failed", e),
    (files): void =>
      console.log("wrote", files),
  ),
);
```

> The `./app` import (shared `view`/`init`) is illustrative — point it at the
> example's real view module; mirror `example/src/server.ts`'s structure.

## Considerations

- **No `proc` for the SSG chains.** `proc`'s error channel is hard-fixed to
  `Error` (`plgg/src/Flowables/proc.ts`), so it cannot carry `SsgError`. The
  async chains are `async` functions threading awaited *sync* `Result`
  combinators (`mapErr`/`chainResult`/`mapResult`/`isOk`); the fs seam uses
  `tryCatch(fn, (e) => writeFailed(...))` — the one combinator that lets the
  seam choose its error type. (`packages/plgg-server/src/Ssg/usecase/`)
- **`ResponseBody` is a union** `SoftStr | Box<"Bytes"> | Box<"Stream">`. Narrow
  the string arm with the `isSoftStr` type predicate — never `as`. A
  bytes/stream body or a redirect is a value-level `NonHtmlBody`/`NonOkStatus`,
  not a crash. (`packages/plgg-http/src/Http/model/HttpResponse.ts`)
- **Auth/middleware runs during the crawl.** The `/api` group in
  `example.ts` short-circuits with `err(unauthorized())` when no Bearer token is
  present, and `dispatch → runMatched` runs the full onion. A bare GET crawl of
  a guarded route folds to `RenderFailed`/`NonOkStatus` and (STRICT) **fails the
  build** — correct, but means guarded routes must be excluded from `paths` or
  given injected auth headers in `getRequest` (out of scope for v1; note in the
  demo). (`packages/plgg-server/src/Routing/usecase/dispatch.ts`)
- **Path-traversal sink.** Author-supplied paths (and wildcard remainders, which
  pass through `safeDecode`/`decodeURIComponent` in `matchSegments.ts`) can
  carry `..`/separators. The fs seam must reject `.`/`..`/separator parts and
  assert the resolved file stays under `resolve(outDir)` before writing — already
  in `safeTarget`. (`packages/plgg-server/src/Ssg/usecase/writeStatic.ts`,
  `Routing/usecase/matchSegments.ts`)
- **Keep `node:fs` out of the runtime-neutral root.** The README guarantees the
  root "imports nothing runtime-specific"; only `src/ssg.ts` (and transitively
  `writeStatic.ts`) may touch `node:fs`. `src/index.ts` re-exports the pure
  `Ssg` barrel only. Verify the new `./ssg` externals so the core bundle for
  Workers/Deno never pulls in `node:fs`. (`packages/plgg-server/src/index.ts`,
  `src/ssg.ts`, `README.md`)
- **No hydration.** Document in the model/example that plgg-view re-renders from
  `init` on mount (`render.ts` first paint `replaceChildren`), so a `clientEntry`
  discards SSR markup — SSG is first-paint/SEO, not progressive enhancement.
  (`packages/plgg-view/src/Program/usecase/render.ts`)
- **HTML-only scope.** `htmlDocument` emits `clientEntry` as a bare `src` URL and
  never builds/inlines JS; images/fonts/the JS bundle are produced by the
  existing Vite build, not the generator (`response.ts`: "plgg-server has no
  static-file layer"). State this so the output doesn't 404 on its own script.
  (`packages/plgg-server/src/View/usecase/htmlDocument.ts`)
- **Coverage >90%.** Colocated specs for `renderRoutes` and `writeStatic` over a
  tiny in-memory `Web` and a temp dir; `src/ssg.ts` is coverage-excluded like
  `node.ts`/`bun.ts`/`deno.ts`. (`packages/plgg-server/vite.config.ts`)
- **Follow-ups (not this ticket):** `staticPaths(app)` auto-discovery of
  fully-`Static` GET routes; a per-pattern param expander; a lenient
  skip-and-report mode; client hydration in plgg-view.
