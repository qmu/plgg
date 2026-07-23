# Coding Review — U0 (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U0 — fix pre-existing FS case collisions (`style.ts`/`Style`, `ssg.ts`/`Ssg`)
- **Commit**: e66dfc9 (Constructor)
- **Phase/Step**: coding / per-ticket review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve with minor suggestions.**

This is production-source work, so I held it to the stated bar:
collision genuinely + fully gone (src AND dist) **and** public API
byte-for-byte preserved. Both hold. The fix is minimal, correct, and the
root-cause analysis is accurate. One minor stale comment is the only
follow-up. No `as`/`any`/`ts-ignore` in the source diff (the grep hits
are plan.md prose about my own U1-dom observations, not casts).

## 1. Public-API preservation — VERIFIED byte-for-byte (the keystone)

I read both `package.json` `exports` maps. The public **subpath keys are
unchanged** — only their dist *targets* moved:
- plgg-view `"./style"`: `./dist/style.{d.ts,es.js,cjs.js}` →
  `./dist/styleEntry.*`. Key `"./style"` untouched.
- plgg-server `"./ssg"`: `./dist/ssg.*` → `./dist/ssgEntry.*`. Key
  `"./ssg"` untouched.
- Package roots (`"."`), and every other subpath (`"./client"`,
  `"./node"`, `"./bun"`, `"./deno"`), are byte-identical — the diff
  touches only the two collision entries.

So the published specifiers `plgg-view/style` and `plgg-server/ssg`
resolve exactly as before; the rename is invisible to any importer using
the public subpath.

**Consumer sweep — no one imported the moved internal path.** I grepped
the whole tree for importers of the old `src/style`/`src/ssg`,
`dist/style`/`dist/ssg`, or relative `./style`/`./ssg`. Every real
importer uses the **public subpath**, which is preserved:
- `example/src/app.ts:50` and
  `plgg-server/.../htmlDocument.spec.ts:3`: `import … "plgg-view/style"`.
- `example/src/build.ts:29`, the guide docs, and both package READMEs:
  `import … "plgg-server/ssg"`.

None imports `dist/style`, `dist/ssg`, or the renamed source files
directly. There is **no public subpath name change**, so this is not a
breaking change for cross-package or external consumers. Keystone
satisfied.

## 2. Collision genuinely + fully gone — src AND dist (verified against the built tree)

**Source**: `plgg-view/src` now holds `Style/` (dir) + `styleEntry.ts`
— the `style.ts` that case-folded against `Style/` is gone. Same for
`plgg-server/src`: `Ssg/` (dir) + `ssgEntry.ts`, no `ssg.ts`.
`styleEntry`/`ssgEntry` case-fold to `styleentry`/`ssgentry`, which do
**not** collide with `style`/`Style` or `ssg`/`Ssg`. The src case pair is
eliminated.

**Dist** (the subtle half the Constructor correctly diagnosed — the bug
recreated itself in the emitted tree): I inspected the built dist.
- `plgg-view/dist`: `styleEntry.{es,cjs}.js`, `styleEntry.d.ts`, and a
  `Style/` **directory** (`dist/Style/index.d.ts` + `model`/`usecase`).
  There is **no `dist/style.*`** — so no `dist/style.d.ts` vs
  `dist/Style/` case-fold collision remains.
- The emitted `dist/styleEntry.d.ts` is exactly `export * from './Style';`
  which now resolves to `dist/Style/index.d.ts` (a real directory with an
  index), **not** back to a sibling `style.d.ts`. The cycle the
  Constructor described (`styleEntry.d.ts`'s re-export resolving to the
  case-twin `style.d.ts`, leaving `style_`/`p` unflattened) is broken
  because there is no longer a case-twin sibling.
- `plgg-server/dist` mirrors this: `ssgEntry.*` + a `Ssg/` directory, no
  `dist/ssg.*`.

So the collision is gone at **both** layers, not merely relocated. The
root-cause writeup (`style.ts` did `export * from "plgg-view/Style"`;
alias `plgg-view*:["./src/*"]` resolved `plgg-view/Style`→`src/Style`→
case-insensitively matched `src/style.ts`) is accurate and matches what
I see in the tree.

## 3. Naming coherence — `styleEntry`/`ssgEntry` is sound; I considered the alternative

The lead asked whether folding into `Style/index.ts` would be cleaner.
**I do not recommend it**, and the Constructor's choice is the right one:
- The two files are genuine **separate public entry points**, not part
  of the `Style/`/`Ssg/` domain trees. `styleEntry.ts` is a thin barrel
  (`export * from "plgg-view/Style"`) deliberately exposed on its own
  `plgg-view/style` specifier so its Tailwind-style names (`p`, `text`,
  …) don't collide with the Html element builders of the same name (its
  own header documents this). `ssgEntry.ts` is the node-only SSG entry
  that is the sole surface pulling in the `node:fs`/`node:path` seam,
  kept off the runtime-neutral root `index.ts` — exactly parallel to how
  `node.ts` surfaces `serve`.
- Folding either into `Style/index.ts` / `Ssg/index.ts` would **merge
  the public entry into the domain tree**, which (a) would re-create the
  very name overlap the barrel exists to avoid, and (b) breaks the
  established repo pattern where each subpath has a dedicated top-level
  `src/<entry>.ts` (`client.ts`, `node.ts`, `bun.ts`, `deno.ts`). The
  `…Entry` suffix reads as house-consistent *because* it names "the file
  whose vite output key must differ from the dist type-tree dir" — the
  comment in each vite.config makes that rationale explicit at the point
  of surprise. This is the minimal, structurally honest fix.

The vite-config comments ("Output name is `styleEntry` … so the emitted
`dist/styleEntry.*` does NOT collide with the `dist/Style/` type tree on
a case-insensitive filesystem") are exactly the right documentation at
exactly the right place — a future contributor renaming this back to
`style` would read why not.

## 4. Minor concern (the one follow-up)

**A stale doc comment survives the rename.**
`plgg-server/src/Ssg/usecase/index.ts:3` still reads "The seam is
surfaced solely through the node entry `src/ssg.ts`." — the file is now
`src/ssgEntry.ts`. This is a comment, not an import, so it does not
affect behavior or API, but it is now factually wrong and would mislead
someone tracing the seam.

- **Constructive proposal**: update that comment to `src/ssgEntry.ts`.
  (I checked the sibling `plgg-server/src/Ssg/index.ts:2` — it references
  the *public specifier* `plgg-server/ssg`, which is correct and
  unchanged, so leave it. Only the `usecase/index.ts:3` `src/ssg.ts`
  reference is stale. plgg-view had no equivalent stale comment.) Trivial,
  non-blocking — fold into U0 or the nearest plgg-server ticket.

## 5. Observation (non-blocking)

The fix relies on `vite-plugin-dts` with `rollupTypes: false`, so the
`Style/`/`Ssg/` directories are emitted as a multi-file `.d.ts` tree
(confirmed: `dist/Style/index.d.ts` + `model`/`usecase`). That is the
config that makes `export * from './Style'` resolve to a directory
rather than a flattened sibling — i.e. the fix is correct **given**
`rollupTypes: false`. If a future change flips `rollupTypes` to `true`
(flattening the tree into a single `styleEntry.d.ts`), the directory
would vanish and the collision rationale changes shape. Not a defect —
just worth a one-line note that the entry-key rename and `rollupTypes:
false` are coupled, so the next person touching dts config knows the
collision constraint. Optional.

## Decision rationale

Both acceptance bars are met: the case collision is genuinely eliminated
in source *and* in the emitted dist (verified against the built tree, not
just inferred), and the public API is byte-for-byte preserved with no
consumer touched and no subpath name changed. The naming choice is the
structurally correct one (separate public entries, not domain-tree
members), well-documented at the point of surprise. The only follow-up is
one stale comment. Hence **Approve with minor suggestions** — fix the
`usecase/index.ts:3` comment; the optional `rollupTypes` coupling note is
a nicety.

## Review Notes

- No test execution (analytical mandate); the Planner's E2E (a clean
  build on the case-insensitive FS + the published-subpath resolution)
  is the empirical confirmation that the collision no longer breaks the
  build.
- Verified against commit e66dfc9: package.json `exports` (both),
  vite.config entry/exclude changes (both), the two `git mv`'d files
  (content unchanged), and the built `dist/` shape for both packages
  (`styleEntry.*` + `Style/`; `ssgEntry.*` + `Ssg/`; no `dist/style.*` /
  `dist/ssg.*`).
