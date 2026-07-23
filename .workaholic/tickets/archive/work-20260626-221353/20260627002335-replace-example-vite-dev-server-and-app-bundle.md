---
created_at: 2026-06-27T00:23:35+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Config]
effort:
commit_hash: 0cc75bf
category: Changed
depends_on: [20260627002333-bundler-foundation-poc-against-plgg-core.md]
---

# Replace `example`'s vite dev server, SSR serve, and app bundle

## Overview

The `example` package is the only one that uses vite beyond library mode: its
`vite build` produces a client **app bundle** (`dist/main.js`, ESM only), `vite`
(`npm run serve`) runs vite's **dev server** for the CSR `index.html`, and
`serve:ssr` runs the SSR path. Per the confirmed scope (replace all *direct*
vite usage, leave the guide's VitePress), this de-vites `example` entirely.

Two distinct concerns:

1. **App bundle** — the client entry (`src/main.ts` → `dist/main.js`) can be
   produced by the in-house bundler from the foundation ticket (an app/iife or
   esm bundle target, distinct from the library dual-format target).
2. **Dev server + SSR serve** — a bundler is *not* a dev server. Decide the
   replacement: a minimal in-house static/dev server (serving `index.html` +
   the bundled client, with rebuild-on-change), or a thin existing-tool path
   that does not pull vite back in. The SSR serve currently uses `tsx`; confirm
   whether that stays or is folded into the in-house story.

This is intentionally separated from the library migration because the dev
server is a different capability with its own design decision, and `example` is
a private, non-published package — lower risk, no dist contract for others.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — `example`
  stays a single package; any dev-server code follows the src layout.
- `workaholic:implementation` / `policies/coding-standards.md` — house no-escape-
  hatch rule for any new TypeScript.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the dev-server
  replacement must not reintroduce vite (directly or as the same native-binding
  bundler); record an exit strategy for whatever serves the dev loop.
- `workaholic:implementation` / `policies/command-scripts.md` — keep `example`'s
  npm scripts (`build`, `serve`, `serve:ssr`) as the canonical entry points;
  no bespoke shell scripts.
- `workaholic:design` / (reach / modeless where the example demonstrates UX) —
  the example is the project's showcase; its dev experience should stay simple.
- `plgg-coding-style` skill + `CLAUDE.md` — house style, Prettier printWidth 50.

## Key Files

- `packages/example/vite.config.ts` — app-bundle mode (es only, single
  `dist/main.js`); to be replaced + deleted.
- `packages/example/package.json` — `build` (`vite build`), `serve` (`vite`),
  `serve:ssr` (tsx) scripts and vite devDeps to rewrite/remove.
- `packages/example/index.html` and `packages/example/src/main.ts` — the CSR
  entry the dev server serves and the bundler bundles.
- `packages/example/src/app.spec.ts` — references vite only incidentally; keep
  green after the swap.

## Related History

- [work-20260528-011843.md](.workaholic/stories/work-20260528-011843.md) — the full-stack `example` was assembled as the runnable showcase; context for what the dev/serve loop must preserve.
- [20260626130000-fix-deploy-guide-rolldown-binding.md](.workaholic/tickets/archive/work-20260626-221353/20260626130000-fix-deploy-guide-rolldown-binding.md) — the native-binding fragility the dev-server replacement must not reintroduce.

## Implementation Steps

1. Add an app-bundle target to the in-house bundler (or a thin example-local use
   of it) producing `dist/main.js` from `src/main.ts`, matching the current
   single-ESM output the page loads.
2. Decide and implement the dev-server replacement (minimal in-house static/dev
   server with rebuild-on-change, or an approved non-vite path); wire it to
   `npm run serve`.
3. Resolve the SSR `serve:ssr` path (keep `tsx`, or fold into the in-house
   story) and update the script.
4. Delete `packages/example/vite.config.ts`; rewrite `package.json` scripts and
   drop vite devDeps (final lockfile purge happens in B4).
5. Verify the CSR page loads and renders, the SSR path serves, and
   `app.spec.ts` stays green.

## Considerations

- A dev server is out of a "minimal bundler"'s remit — be explicit about the
  chosen approach and its exit strategy (`packages/example/package.json`).
- `example` is private and has no downstream `file:` consumers, so the dist
  shape is not a contract — this is the safest place to iterate on the app/dev
  story.
- Depends on the foundation bundler supporting an app-bundle (non-library)
  target; if it only does dual-format library output, extend it here or in B1.
- Keep the showcase's developer experience simple (it is the project's front
  door); avoid a heavier dev toolchain than vite provided.
