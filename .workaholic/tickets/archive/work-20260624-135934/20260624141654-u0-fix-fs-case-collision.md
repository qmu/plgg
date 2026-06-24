---
created_at: 2026-06-24T14:16:54+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain, Config]
effort:
commit_hash: 5acdbbc
category: Changed
depends_on:
---

# U0 — Fix pre-existing filesystem case collisions (style.ts/Style, ssg.ts/Ssg)

## Overview

On a case-insensitive filesystem (this dev volume, and macOS/Windows CI),
two pre-existing lowercase barrel files collide with same-named
directories and make the package fail to typecheck (TS1149
"Only a function annotated as @deprecated can be deprecated" — actually
the case-collision diagnostic at `src/style.ts(5,15)`):

- `packages/plgg-view/src/style.ts` (309B) vs
  `packages/plgg-view/src/Style/` (directory).
- `packages/plgg-server/src/ssg.ts` (1468B) vs
  `packages/plgg-server/src/Ssg/` (directory).

This is **not** caused by the vitest→plgg-test migration; it is a latent
bug that surfaces under `tsc --noEmit` (which every package's `test`
script runs first). The migration cannot make plgg-view/plgg-server/
example go green until it is fixed, so it is a **foundation ticket** with
no `depends_on` — the plgg-view, plgg-server, and example U2 tickets
depend on it.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§8 (risk: pre-existing case collisions surfaced during build) — added by
plan.md Amendment 2 (Finding B; developer chose to fix in-scope).

### What the colliding files are (investigated)

- `src/style.ts` is a thin **public subpath barrel**:
  `export * from "plgg-view/Style";`. It backs the `plgg-view/style`
  export specifier (package.json `exports["./style"]`) and the vite
  `lib.entry.style = "src/style.ts"`. Importers use `plgg-view/style`:
  `example/src/app.ts:50` (`import * as sx from "plgg-view/style"`),
  `plgg-view/.../htmlDocument.spec.ts:3`.
- `src/ssg.ts` is the **Node-only SSG public subpath entry**
  re-exporting from `plgg-server/Ssg/...`. It backs
  `exports["./ssg"]` and vite `lib.entry.ssg = "src/ssg.ts"`.

The collision is between the lowercase barrel filename and the
capitalized directory of the same word.

## Key Files

- `packages/plgg-view/src/style.ts` — the colliding barrel (rename/move).
- `packages/plgg-view/src/Style/index.ts` — the directory barrel it
  re-exports.
- `packages/plgg-view/package.json` (`exports["./style"]`),
  `packages/plgg-view/vite.config.ts` (`lib.entry.style`) — the public
  wiring that must keep resolving to the same `plgg-view/style`
  specifier and same `dist/style.*` output.
- `packages/plgg-server/src/ssg.ts`,
  `packages/plgg-server/src/Ssg/index.ts`,
  `packages/plgg-server/package.json` (`exports["./ssg"]`),
  `packages/plgg-server/vite.config.ts` (`lib.entry.ssg`) — same shape.
- Importers to update if the source path changes:
  `packages/example/src/app.ts`,
  `packages/plgg-view/src/Html/usecase/htmlDocument.spec.ts` (this is
  actually `plgg-server` — verify), any `plgg-server/ssg` importer.

## Implementation Steps

1. Investigate first: confirm exactly what `style.ts`/`ssg.ts` export
   and every importer (`grep -rn 'plgg-view/style' ; 'plgg-server/ssg'`).
2. Apply the **minimal** collision-removing change that PRESERVES the
   public `plgg-view/style` and `plgg-server/ssg` export specifiers and
   their `dist/style.*` / `dist/ssg.*` build outputs. Preferred option:
   point the vite entry + package.json types at a non-colliding source
   path while keeping the published subpath name — e.g. move the barrel's
   body into the directory's `index.ts` and have the entry reference the
   directory, OR rename the source file to a non-colliding name
   (`styleEntry.ts` / `ssgEntry.ts`) and update `vite.config` `lib.entry`
   + the `exports` `types` path accordingly. The **published specifier
   name (`./style`, `./ssg`) must not change** — downstream importers
   keep working.
3. Update any in-repo importer that referenced the source path directly
   (not the published specifier).
4. Verify `scripts/tsc-plgg-view.sh` and `scripts/tsc-plgg-server.sh`
   are clean on this case-insensitive volume, and `scripts/build.sh`
   still emits `dist/style.*` and `dist/ssg.*`.
5. No `as`/`any`/`ts-ignore`. Prettier printWidth:50.

## Considerations

- This is a **public-API-preserving** refactor: the whole point is to
  remove the on-disk case collision WITHOUT changing what
  `plgg-view/style` / `plgg-server/ssg` resolve to for consumers.
  Verify the `dist/` output names are unchanged.
- Do NOT delete the subpath entry; downstream (`example`) imports it.
- The plgg-view, plgg-server, and example U2 migration tickets
  `depends_on` this so they can typecheck.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the
  fix is fundamentally a directory-structure correction (a file/dir name
  collision); preserve the package's public subpath layout.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth:50.
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  package must typecheck cleanly; this unblocks `tsc --noEmit`.
- `workaholic:implementation` / `policies/functional-programming.md` —
  barrels stay pure re-exports.
- `workaholic:operation` / `policies/ci-cd.md` — CI runs on
  case-insensitive volumes; the collision must be removed so the build
  is portable.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — n/a
  beyond keeping the build tool config (vite) correct.
