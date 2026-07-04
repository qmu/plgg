---
created_at: 2026-07-04T10:48:36+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.5h
commit_hash: 281341a
category: Changed
---

# `plgg-bundle/bin/hook.mjs`: resolve a bare-directory self-alias to its `index.ts`, not the directory (EISDIR)

## Overview

The plgg-bundle ESM resolver hook rewrites `plgg-bundle/<sub>` self-alias
specifiers to on-disk `src/<sub>` files via `pick`:

```js
const pick = (base) => {
  const candidates = [base, `${base}.ts`, join(base, "index.ts")];
  return candidates.find((c) => existsSync(c));
};
```

`candidates` lists the raw `base` **first**, and `existsSync` is true for a
**directory**. So a bare-directory self-alias (`plgg-bundle/<dir>`) resolves to
the directory itself; Node then `read`s it as a module and throws
`EISDIR: illegal operation on a directory`. The correct resolution is the
directory's `index.ts`.

This is the **same bug**, in the **same `pick`**, that broke the guide's static
build (`npx plggpress build` → EISDIR) in PR #55 — fixed there for the
near-verbatim copy `packages/plggpress/bin/hook.mjs` (commit `4c3341b`) by
matching **files only**. The two hook files are maintained as near-verbatim
copies (see the header comment in each), but the plgg-bundle original was left
unfixed and has now **drifted** from the corrected plggpress copy.

It is currently **latent** for plgg-bundle: no package plgg-bundle resolves
today imports a *bare directory* self-alias (all existing `plgg-bundle/<sub>`
imports point at files, whose raw `base` `existsSync` is false so they fall
through to `base.ts`). The first bare-directory self-import would crash the dev
server / build — exactly how it surfaced for plggpress once `plggpress/framework`
(a directory) was introduced. Fix it now, before it bites, and re-sync the two
copies.

## Key Files

- `packages/plgg-bundle/bin/hook.mjs` — apply the files-only `pick` fix.
- `packages/plggpress/bin/hook.mjs` — the already-fixed reference (commit
  `4c3341b`); the two `pick`/`isFile` bodies should match verbatim afterward.
- A plgg-bundle spec (new) — the regression test (see Quality Gate).

## Implementation Steps

1. In `packages/plgg-bundle/bin/hook.mjs`, mirror the plggpress fix: import
   `statSync`, add `const isFile = (c) => existsSync(c) && statSync(c).isFile();`,
   and change `pick` to `candidates.find(isFile)`. Add the same explanatory
   comment plggpress's copy carries (a directory falls through to its
   `index.ts`). Leave the rest of the hook untouched.
2. Confirm the two hook files' `pick`/`isFile` logic is now identical
   (`diff` the relevant region) so the "near-verbatim copy" invariant holds.
3. Add a regression test that drives the hook's exported `resolve()` with a
   **bare-directory** self-alias specifier and asserts it resolves to that
   directory's `index.ts` (not the directory). Use an existing `src/<dir>` that
   has an `index.ts`, or add a minimal test fixture directory under `src/` with
   an `index.ts`; pass a stub `nextResolve`/`context` since the alias branch
   short-circuits before it. The test must **fail** against the old
   `find(existsSync)` `pick` and **pass** with the fix.
4. Follow house style (no `as`/`any`/`ts-ignore`; Prettier printWidth 50).

## Quality Gate

**Objective pass condition:**

1. **Fix present:** `packages/plgg-bundle/bin/hook.mjs` `pick` matches files only
   (`statSync(c).isFile()`); a bare-directory `plgg-bundle/<dir>` specifier
   resolves to `<dir>/index.ts`.
2. **Copies in sync:** the `pick`/`isFile` region of
   `packages/plgg-bundle/bin/hook.mjs` and `packages/plggpress/bin/hook.mjs` is
   identical (verify with `diff`).
3. **Regression test (live trigger):** a plgg-bundle spec calls `resolve()` with
   a bare-directory self-alias and asserts the returned `url` ends in
   `/index.ts` (and is a file URL), not the bare directory. Demonstrate it
   **red on the old `pick`** (temporarily revert to `find(existsSync)` → test
   fails) and **green with the fix**.
4. **Suite green:** `scripts/tsc-plgg.sh` clean where applicable and
   `./scripts/test-plgg-bundle.sh` passes; a fresh `scripts/check-all.sh` is
   green (plgg-bundle coverage stays >90% across statements/branches/functions/lines).

**Edge cases to cover in the test:** a directory *with* `index.ts` (resolves to
index.ts); a specifier that maps to a real `.ts` file (still resolves to the
file — the fix must not regress the common case); a specifier with no matching
file or index (falls through to `nextResolve`).

## Considerations

- Pure bug fix + guard; no behavior change for the existing file-specifier path.
- Keep the two hook copies verbatim-synced; if this recurs, consider extracting
  a single shared hook module instead of copies (out of scope here — record as a
  follow-up if the duplication keeps drifting).
