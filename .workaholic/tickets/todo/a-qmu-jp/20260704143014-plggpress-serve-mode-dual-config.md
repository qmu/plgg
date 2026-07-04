---
created_at: 2026-07-04T14:30:14+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Domain]
effort:
commit_hash:
category:
depends_on: []
---

# plggpress `serve` verb: run pressRouter as a persistent server, one `site.config` shared with the SSG build

## Overview

Phase 5 (Server & data), ticket **14** of the plggpress/plggmatic roadmap —
implements the served half of **D5** ("Dual-mode: public reader stays SSG/CDN;
dynamic features run as a separate always-on served instance **sharing one
config**") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. It builds on
**D1**'s ruling that the absorbed facade in `plggpress/src/framework` is kept
for build/CLI and re-layered gradually — the `serve` verb lands in that
framework CLI, next to `build`.

Today plggpress has exactly two ways to answer an HTTP request, and neither is
a production server:

1. **`plggpress build`** — `runApp` (framework CLI) folds `site.config.ts` +
   `discoverPaths` + `pressRouter` through `generateStatic` into static files.
2. **`plgg-bundle dev`** — the toolchain server imports the consumer's
   `devEntry.ts` (`pressDevEntry`), which builds the SAME `pressRouter` and
   exposes it as a Web `Fetch`, re-imported on every watched edit for
   hot reload.

This ticket adds the third mode: **`plggpress serve`** — a persistent
`node:http` process (plgg-server's existing `serve` adapter, `plgg-server/node`)
running `pressRouter` directly, loading the **same `site.config.ts`** through
the **same `loadConfig`** the build uses. No new config file, no new flags
semantics: `--config`/`--contentDir` behave exactly as in `build`.

Why now, ahead of the dynamic features themselves: the served instance is the
**mount point** every later roadmap subtree lands on — `/api` delivery
(ticket 16), `/auth` + `/admin` (tickets 19/20), `/mcp` over HTTP (ticket 27,
per D15), the RAG tool-call endpoint (D12). plgg-server already has the
mount combinator (`route(basePath, sub)` in `Routing/model/Web.ts`, which
scopes a sub-app's middleware to its prefix); this ticket establishes the one
composition seam those tickets extend, so none of them has to invent a server.

Where `dev` sits after this ticket (must be stated in code + docs, it keeps
confusing agents): **`dev` remains a toolchain concern** — `plgg-bundle dev`
+ `pressDevEntry` is the authoring loop (hot reload, source aliases), and
plggpress still ships **no `dev` command**. `serve` is not a dev server: no
watch, no re-import, config loaded once at startup. Three modes, one render
path, one config.

Hard constraint (the Phase 5 gate): adding serve mode must be **byte-invisible
to the SSG output**. `pressRouter`, the theme, `buildSpecOf`, and `SiteConfig`
casters are not touched in any way that changes a rendered byte; serve
composes AROUND the existing router, never inside it. Zero new dependencies
(plgg-server is already a plggpress dependency; its `./node` export already
exists in the export map).

## Policies

- `workaholic:operation` / `policies/delivery.md` — this ticket creates a
  second delivery path for the same content: today's pipeline ends at static
  artifacts (`build` → dist → GitHub Pages), and D5 adds an always-on process
  next to it. The policy's build-process section documents that `check-all.sh`
  chains per-package builds and `scripts/build.sh` order is publish-order
  authority; plggpress is already wired into `npm-install.sh`/`build.sh`/
  `check-all.sh`, so this ticket must NOT touch runner scripts — the new verb
  ships inside the existing plggpress artifact.
- `workaholic:implementation` / `policies/test.md` — the byte-identity gate is
  a regression contract and must live in the suite, not in a one-off manual
  diff: co-located `.spec.ts` files (flat `test()`, absolute imports), the
  >90% coverage thresholds enforced per package, and `tsc --noEmit` fused into
  every test run are the mechanisms this ticket's Quality Gate leans on.

## Key Files

- `packages/plggpress/src/framework/Cli/usecase/runApp.ts` — `AppDefinition`
  + the plgg-cli program; today registers only `build` (its docstring says
  "there is no `dev` command" — extend, don't contradict). Gains the `serve`
  command and its handler.
- `packages/plggpress/src/framework/Cli/usecase/resolveOptions.ts` —
  `configPathOf` + `resolveOptions` (flag > cwd-default precedence, `base`
  from `AppRunContext`); serve flags resolve beside it, `AppOptions` itself
  stays untouched.
- `packages/plggpress/src/framework/Build/usecase/build.ts` — `BuildSpec<E>`
  whose `router: (paths) => Web` is the factory serve must share so served
  HTML ≡ generated HTML.
- `packages/plggpress/src/framework/Serve/usecase/serveApp.ts` (new, + spec) —
  the framework serve usecase: discover → router → `toFetch` → node `serve`.
- `packages/plggpress/src/router/pressRouter.ts` — the shared content `Web`
  app (one GET per discovered path, one handler). Served as-is; not modified.
- `packages/plggpress/src/server/pressServer.ts` (new, + spec) — plggpress's
  serve-side `Web` assembly: today `pressRouter` verbatim, documented as the
  mount seam for `/admin`, `/api`, `/auth`, `/mcp` (tickets 16/19/20/27).
- `packages/plggpress/src/cli.ts` — the app declaration handed to `runApp`;
  gains the serve wiring and the three-mode docstring.
- `packages/plggpress/src/devEntry.ts` — the dev-mode boundary
  (`pressDevEntry` for `plgg-bundle dev`); docstring cross-references serve.
- `packages/plgg-server/src/Serving/usecase/serve.ts` — the existing
  node:http adapter (`ServeOptions`: port/hostname + body cap + timeouts),
  exported as `plgg-server/node` (verified in plgg-server's `exports` map).
  Consumed, not modified.
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`,
  the mount combinator the seam is designed around. Consumed, not modified.
- `packages/plggpress/src/Config/usecase/loadConfig.ts` and
  `packages/plggpress/src/framework/Config/usecase/loadConfig.ts` — the one
  config loader all three modes share; `SiteConfig` casters stay untouched.
- `packages/guide/site.config.ts`, `packages/guide/devEntry.ts` — the real
  consumer; the serve smoke target (`npx plggpress serve` from
  `packages/guide`).
- `packages/plggpress/README.md`, `packages/guide/packages/plggpress.md` —
  document the build/dev/serve triad.

## Related History

The three modes were built in three separate eras; this ticket is the first to
name them as one design:

- `.workaholic/tickets/archive/work-20260630-013457/20260630013509-plgg-press-dev-server-live-reload.md`
  — plgg-press once carried its OWN dev server;
  `.workaholic/tickets/archive/work-20260701-185044/20260702041501-replace-plgg-press-dev-with-plgg-bundle.md`
  then deleted it in favor of `plgg-bundle dev` + `devEntry`. That is where
  the "dev is a toolchain concern, plggpress ships no dev command" doctrine
  (quoted in today's `runApp.ts`/`cli.ts` docstrings) comes from — `serve`
  must not be mistaken for its return.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — created
  `plggpress/src/framework/` (the old app-framework facade absorbed);
  D1 keeps it as the build/CLI home, which is why `serve` lands there.
- `.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md`
  — the SSG core (`generateStatic` renders through the same `Web` app a
  server would run); the serve verb is that symmetry finally cashed in.
- `.workaholic/tickets/archive/work-20260531-003055/20260610122928-plgg-server-request-dos-limits.md`
  — hardened the node adapter (body cap, request/headers/socket timeouts)
  precisely so it could face the network as an always-on process; serve
  inherits those defaults for free.
- `.workaholic/tickets/archive/work-20260528-143038/20260529000006-support-non-node-runtimes.md`
  — the bun/deno adapters; serve targets `plgg-server/node` only (the
  production topology in D5 is a Node process), other runtimes stay possible
  through the same `Fetch` seam.

Wiring note: plggpress is already present in `scripts/npm-install.sh`,
`scripts/build.sh` (exact `cd $REPO_ROOT/packages/plggpress && npm run build`
line, order-significant), and `scripts/check-all.sh` — this ticket must not
touch runner scripts.

## Implementation Steps

1. **Framework serve usecase** —
   `packages/plggpress/src/framework/Serve/usecase/serveApp.ts`: given
   `AppOptions`, a router factory `(paths: ReadonlyArray<SoftStr>) => Web`,
   and serve settings (port, optional hostname), run
   `discoverPaths(opts.contentDir)` → factory → `toFetch` →
   `serve({ port, hostname })` from `plgg-server/node`. Discovery/config
   failures stay in the typed `Result` channel (mirroring `build`'s
   `SsgError | Defect | E` fold — never a throw); on success return the
   listening `node:http` `Server` so specs (and later operational code) can
   `close()` it deterministically.
2. **`serve` command in `runApp`** — extend
   `framework/Cli/usecase/runApp.ts`: add a `command("serve", …)` carrying the
   shared `configOptions` plus `option("port", …)` and `option("hostname", …)`
   value-options; extend `AppDefinition<Config, E>` with
   `serveWeb: (config: Config, opts: AppOptions) => (paths: ReadonlyArray<SoftStr>) => Web`
   (a required field — plggpress is the only consumer, breaking the shape is
   fine). The `runServe` handler mirrors `runBuild`: `loadConfig` →
   `resolveOptions` → parse serve flags (`--port` via a plgg caster to a
   number, `Err` with a one-line message on garbage; default `3000`, the
   adapter docstring's own example; `--hostname` optional → adapter default) →
   `serveApp` with `def.serveWeb(config, opts)`. On listen, print one line
   (`serving <contentDir> on http://<host>:<port><base>`) and keep the
   process alive; the `Result`→exit-code fold stays plgg-cli's.
3. **The mount seam** — `packages/plggpress/src/server/pressServer.ts`:
   `pressServeWeb(contentDir, config, base)` returning
   `(paths) => Web`, implemented today as exactly
   `pressRouter(contentDir, config, base, paths)`. Its docstring is the
   ticket's contract: this — and only this — is where later tickets compose
   `route("/api", …)`, `route("/admin", …)`, `route("/auth", …)`,
   `route("/mcp", …)` (plgg-server's `route` scopes sub-app middleware to the
   prefix, so an auth guard registered in the admin sub-app never touches
   reader routes). `pressRouter` and `buildSpecOf` are NOT modified.
4. **Wire the declaration** — `packages/plggpress/src/cli.ts`: pass
   `serveWeb` built from `pressServeWeb`; update the docstring from the
   two-mode story to the three-mode one (build = SSG, dev = `plgg-bundle dev`
   via `devEntry`, serve = persistent instance for the dynamic subtrees; one
   `site.config.ts`, one `loadConfig`, one `pressRouter`). Mirror the
   cross-reference in `devEntry.ts`'s docstring and in `runApp.ts`'s "no dev
   command" paragraph (still true — say why serve is different).
5. **404 parity note** — served unrouted paths answer through the router
   dispatch's typed 404 today, while the SSG ships the themed
   `notFoundHtml` as `404.html`. If the existing `toFetch`/dispatch seam
   admits supplying a custom 404 body without modification, thread
   `buildSpecOf`'s `notFoundHtml` through `serveWeb`; if it would require
   changing plgg-server's shared fold, defer (record in Considerations) —
   this ticket does not modify plgg-server.
6. **Specs** (co-located, flat `test()`, absolute imports, no `describe`):
   - `serveApp.spec.ts` — serve a tiny fixture corpus on port `0`
     (ephemeral; read the real port from `Server.address()`), `fetch` a
     discovered route → 200 + the expected HTML; an unregistered path → 404;
     a bad `contentDir` → typed `Err`, no listener leaked; server closes
     cleanly after each test.
   - `pressServer.spec.ts` — `pressServeWeb(...)(paths)` deep-equals
     `pressRouter(contentDir, config, base, paths)` (routes + middlewares):
     the seam is provably a no-op today.
   - **Byte-identity spec** (the phase gate, in-suite): over a fixture
     corpus, run the framework `build` to a temp `outDir` AND start
     `serveApp` on the same corpus; for every discovered path, `fetch` the
     served body and assert it is byte-equal to the written
     `<outDir><path>index.html`. This must fail if serve ever forks the
     render path.
7. **Docs** — `packages/plggpress/README.md` and
   `packages/guide/packages/plggpress.md`: the three-mode table and a
   one-line `npx plggpress serve --port 3000` example from `packages/guide`.
8. House rules throughout: no `as`/`any`/`ts-ignore`; Option/Result +
   exhaustive `match` per `plgg-coding-style`; Prettier `printWidth: 50`;
   zero new dependencies; no changes to `scripts/npm-install.sh` /
   `scripts/build.sh` / `scripts/check-all.sh`.

## Quality Gate

**Acceptance criteria**

1. From `packages/guide`, `npx plggpress serve --port <p>` starts a
   persistent process; `curl -s http://localhost:<p>/` returns the guide's
   landing HTML (200), a sidebar route returns its page, an unknown path
   returns 404 — with **no** `dist/` present (serve renders live, not from
   build output).
2. `npx plggpress build` behavior is unchanged, and the SSG output is
   **byte-identical**: building the guide before and after this branch into
   two directories yields an empty `diff -r`.
3. The byte-identity spec (build output vs served bodies over one fixture
   corpus) exists and passes; reverting it against a deliberately forked
   router demonstrably fails it.
4. `serve` shares config with `build`: both read the same `site.config.ts`
   through the same `loadConfig`; `--config`/`--contentDir` behave
   identically across the two verbs; no new config file is introduced;
   `SiteConfig` casters are untouched.
5. The mount seam exists (`pressServer.ts`), is a proven no-op today
   (spec 6b), and its docstring names the future `/api`, `/admin`, `/auth`,
   `/mcp` mounts.
6. `plggpress` still ships no `dev` command; `runApp`/`cli.ts`/`devEntry.ts`
   docstrings and the two docs pages state the three-mode split.
7. `git diff --stat` touches only `packages/plggpress` sources/specs/README
   and the guide docs page — no runner scripts, no `plgg-server`, no
   `pressRouter.ts`/`buildSpecOf` render-path changes, no new dependencies in
   any `package.json`.

**Verification method**

Byte-identity: `cd packages/guide && npx plggpress build --outDir
<scratch>/before` on the pre-change tree, same to `<scratch>/after` on this
branch, then `diff -r <scratch>/before <scratch>/after` — paste the (empty)
output. Serve smoke: run criterion 1's curl set and paste status codes.
Suite: `scripts/tsc-plgg.sh` clean where applicable, `scripts/test-plggpress.sh`
green, then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists
must not mask drift) green end-to-end with plggpress coverage >90% across
statements/branches/functions/lines.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. A non-empty SSG diff, a missing/passing-when-forked
byte-identity spec, a runner-script or plgg-server diff, or a coverage dip
fails the ticket.

## Considerations

- **Port/hostname stay flags, not `SiteConfig` fields**, in this ticket:
  they are per-environment operational values (like `base` via `DOCS_BASE`
  in the guide's `devEntry.ts`), and keeping `SiteConfig` byte-untouched is
  the cheapest proof of the identity gate. If ticket 16+ accumulates
  server-side settings, promote them then as ONE Option-typed `serve`
  section (absent field must remain valid so existing configs keep loading).
- **404 parity** (step 5) may be deferred if it needs a plgg-server change;
  if deferred, record it as an explicit follow-up for ticket 16 — the
  delivery API will need typed non-HTML errors anyway.
- **Process supervision, TLS, ports, tunnels are out of scope** — the
  cloudflared mapping and always-on operations belong to roadmap ticket 28
  (production topology). This ticket only guarantees the process exists and
  is correct.
- **`dev.allowedHosts` is not enforced by serve** today (it is a dev-server
  concern in `SiteConfig`); whether the served instance needs Host-header
  checks is a security question for the auth tickets (19/20) — do not
  half-implement it here.
- **Keep-alive semantics**: `runServe` intentionally never resolves the
  process (the server holds the event loop). Make sure plgg-cli's
  `Result`→exit-code fold is not tricked into exiting early — if `runCli`
  requires a resolved `Result` per command, resolve `ok(...)` only on
  `close`/signal, and note the chosen shape in the docstring.
- Revisit triggers: the first real mount (ticket 16) must land inside
  `pressServer.ts` — if it lands anywhere else, the seam has failed its
  purpose; and when D6's OIDC OP arrives, re-examine whether serve needs
  graceful-shutdown hooks (in-flight auth flows) beyond node defaults.
