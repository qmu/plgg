---
created_at: 2026-07-02T03:20:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Domain]
effort:
commit_hash:
category:
depends_on:
---

# RESUME/BLOCKER: 213411 (reimplement plgg-press on plggmatic) is blocked by plgg-bundle's dynamic-import rewrite; 213412 (rename) waits on it

## Overview

Resumption checkpoint after a night `/drive`. **Branch `work-20260701-185044`, HEAD `2c6839b`, working tree clean.** Four of the five queued tickets are resolved (211839, 211840, 213410 committed + green; this note supersedes the earlier resume map). The remaining two — **213411** (reimplement plgg-press as a thin plggmatic consumer) and **213412** (rename plgg-press → plggpress, depends on 213411) — are **blocked by a demonstrated build-tool limitation**, not by scope. This ticket records the exact blocker and the fix so a follow-up `/drive` can finish them.

**Do not implement this ticket.** Fix the blocker (see below), then drive 213411 → 213412.

## The blocker (root cause, demonstrated)

213411 makes plgg-press consume `plggmatic` (a bare package specifier), which resolves to **plggmatic's bundled `dist/index.es.js`**. plggmatic's `loadConfig` does a runtime dynamic `import(pathToFileURL(resolve(path)).href)` to load the app's `site.config.ts`.

**`plgg-bundle` rewrites every dynamic `import(x)` into the bundle-internal `__require(x)`** (verified in `packages/plggmatic/dist/index.es.js`: the loader becomes `Promise.resolve(url).then(s => require(s))`, where `require` is the bundle's `__require`). `__require(id)` (dist line ~312) throws `"Cannot resolve external '" + id + "'"` for any id not in its `__modules`/`__externals` registry — and a **runtime config file path is never in the registry**. So a bundled plggmatic cannot load a config file:

```
loadConfig validates a well-formed TS config
  • expected Ok, got Err ConfigLoadError:
    "failed to load config at .../valid.config.ts:
     Cannot resolve external 'file:///.../valid.config.ts'"
```

Why plgg-press's ORIGINAL `loadConfig` never hit this: plgg-press runs from **source** (its `.mjs` bin + `hook.mjs` type-strip its `.ts`), so its native `import()` is never bundled. The bug only surfaces once a *bundled* module owns the dynamic import — exactly what 213411 introduces.

This is why 213411 was **attempted and reverted** this session (plgg-press restored to HEAD; the guide build is byte-identical to the pre-attempt oracle — 25 files, verified). Modifying `plgg-bundle` (the shared, concurrency-sensitive build tool every package builds through — see the atomic-publish flake memory) unsupervised at night was judged too risky; it needs a deliberate, reviewed change with a full rebuild of every dist to validate.

## The fix (do this first, then drive 213411)

**Option A (recommended) — teach `plgg-bundle`'s `__require` shim to fall back to native dynamic import.** In the shim emitter, change the unresolved-id branch so an id that is not a bundled module and not a known external falls back to a **native** `import(id)` instead of throwing:

```js
// packages/plgg-bundle — the emitted __require shim
if (!fn) {
  if (id in __externals) return __externals[id];
  return import(id); // was: throw new Error("Cannot resolve external '" + id + "'");
}
```

This is safe for the dynamic-import case: `import(x)` is only ever emitted as `Promise.resolve(x).then(s => __require(s))` (an async context), and a Promise returned from a `.then` callback flattens — so the caller receives the resolved module, not a Promise. Static `require`s are always in `__modules`/`__externals`, so they never reach this branch. Verify by rebuilding **every** package dist (`scripts/build.sh`) and running `scripts/check-all.sh` — the bundler change touches the shared shim, so the whole set must stay green.

**Option B (alternative) — consume plggmatic from source.** Give plggmatic its own `bin/hook.mjs` (resolving `plggmatic/*` → `src`) and point plgg-press's runtime at plggmatic's source, so the native `import()` is never bundled. Heavier: it also has to satisfy how `plgg-test` resolves `plggmatic`'s self-alias when running plgg-press's specs. Prefer A.

## Then: 213411 → 213412 (the rewire is already designed)

The reverted 213411 attempt proved the rest of the rewire is sound (everything except the bundled-dynamic-import path type-checked and the render path is unchanged). Redo it once the bundler loads config:

1. **`package.json`** — add `plggmatic` (`file:../plggmatic`); drop `plgg-cli` (now reached through plggmatic). Keep plgg/plgg-view/plgg-md/plgg-highlight/plgg-server/plgg-http (the theme + Markdown→highlight→theme handler still import them directly).
2. **`Config/usecase/loadConfig.ts`** → `plggmatic.loadConfig(path, asSiteConfig)` (thin).
3. **`Press/model/PressError.ts`** → re-export `ConfigLoadError`/`configLoadError`/`configLoadError$` from `plggmatic`; keep `NotImplementedError` local.
4. **`router/pressRouter.ts`** → `buildRouter(paths, pageHandler(contentDir, config, base))` (drop the local `web()/get()` fold; keep `pageHandler`).
5. **`Press/model/PressOptions.ts`** → keep `PressOptions` (carries `config`); add `appOptionsOf(opts): AppOptions` (drop `config`); re-export `BuildReport`/`DevServer` from plggmatic.
6. **New `Press/usecase/appSpecs.ts`** → `buildSpecOf(config, contentDir, base): BuildSpec<Defect | BrokenLinks>` (`{ router, notFoundHtml: injectThemeScripts(renderToString(notFound(config))), linkCheck: some(collectPageLinks→checkLinks) }`) and `devSpecOf(config, contentDir, base): DevSpec` (`{ router }`). Shared by build/dev/cli so the spec is declared once.
7. **`build.ts`** → `frameworkBuild<Defect | BrokenLinks>(appOptionsOf(opts), buildSpecOf(opts.config, opts.contentDir, opts.base))`.
8. **`dev.ts`** → `frameworkDev(appOptionsOf(opts), devSpecOf(...))`. The dev-loop internals (`decorateDevHtml`/`isAllowedHost`/`createDevHandle`/`devPort`/`devUrl`/`watchContent`) now live in — and are tested by — plggmatic, so **delete plgg-press's `dev.spec.ts`**, add `Press/usecase/appSpecs.spec.ts` (tests `devSpecOf.router` renders via `toFetch`; `buildSpecOf` carries the 404 + link-check), and **exclude `/dev.ts`** from `plgg-test.config.json` (thin adapter, like `cli.ts`).
9. **`cli.ts`** → `await runApp<SiteConfig, Defect | BrokenLinks>({ name, description, configFile: "site.config.ts", loadConfig, context: c => ({ base: c.base, allowedHosts: c.dev.allowedHosts }), buildSpec: (c, o) => buildSpecOf(c, o.contentDir, o.base), devSpec: (c, o) => devSpecOf(c, o.contentDir, o.base), formatError: formatBuildError })`.

**Gate for 213411:** `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh` green ≥90%; **guide build byte-identical** to the oracle (`DOCS_BASE=/plgg/ npm run build` in `packages/guide`, `find dist -type f | sort | xargs sha256sum` matches — capture a fresh oracle from HEAD `2c6839b` first); the qmu theme intact (Playwright, human sign-off carried from 211839/211840). Then **213412** is the mechanical `plgg-press → plggpress` rename (mirror the two prior rename tickets).

## Key Files

- `packages/plgg-bundle/*` — the `__require` shim emitter (the fix).
- `packages/plggmatic/dist/index.es.js` — where the broken `Promise.resolve(url).then(s => require(s))` is visible.
- `packages/plgg-press/src/{build,dev,cli,router/pressRouter,Config/usecase/loadConfig,Press/model/*}.ts` — the 213411 rewire surface (all currently at HEAD).
- `.workaholic/tickets/todo/a-qmu-jp/20260701213411-*.md`, `20260701213412-*.md` — the two blocked tickets (still in todo).

## When 213411 lands: re-wire the build

213410 registered plggmatic in `scripts/build.sh`, but that was **backed out** (a follow-up commit) because nothing consumes plggmatic's dist yet and the guide dev container's entrypoint (`workloads/guide/dev-entrypoint.sh` → `scripts/build.sh`) does **not** provision plggmatic's `node_modules` — a clean `docker compose up --build` would fail at `cd packages/plggmatic && npm run build` (`Cannot find plgg-bundle`). It only survived a restart because the host mount exposed the host's `node_modules`. So when 213411 lands:

1. Re-add the `plggmatic` build line to `scripts/build.sh` (after `plgg-cli`, before `plgg-press`).
2. Provision it in the guide dev container: add `plggmatic` to `dev-entrypoint.sh`'s install loop and `/app/packages/plggmatic/node_modules` to `compose.yaml`'s anonymous-volume list (image rebuild needed).
3. Heads-up (pre-existing, tolerated): `plgg-press`'s `npm run build` already logs a non-fatal `plgg-bundle: DtsError` (declaration-emit type mismatch in `build.ts`'s proc/Defect pipeline); `plgg-bundle` exits 0 and emits JS, and the dev server runs from source so it is unaffected. plggmatic's `build.ts` inherits the same tolerated pattern — worth cleaning up when the declaration-emit typing is addressed repo-wide.

## Considerations

- **Repo is green and clean at HEAD `2c6839b`.** plggmatic (213410) is landed, additive, and does not affect plgg-press, which still builds the guide byte-identically. Nothing is half-applied.
- **The shared-tool change (Option A) needs a full rebuild + `check-all.sh`** — it alters the shim every dist carries.
- **Shell aliases** in the Bash tool break `>` (noclobber) and alias `diff`→editor — use `command diff` and `>|` when re-verifying the byte-identical guide diff (this session hit that).
