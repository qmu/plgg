---
created_at: 2026-05-30T10:34:31+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort: 0.25h
commit_hash: db0dce2
category: Changed
depends_on:
---

# Unify `package.json` `exports` style across non-core packages

## Overview

The monorepo uses two different `exports` shapes:

- **`.`-keyed, explicit** (plgg-view, plgg-router, plgg-server) — required because
  they ship subpaths:
  ```jsonc
  "exports": {
    ".":        { "import": { "types": …, "default": … }, "require": { … } },
    "./client": { … }
  }
  ```
- **Flat conditional sugar** (plgg core, plgg-kit, plgg-sql, plgg-fetch) — a single
  root entry written as condition keys:
  ```jsonc
  "exports": { "import": { "types": …, "default": … }, "require": { … } }
  ```
- **Degenerate** (plgg-foundry) — flat AND missing the `types` conditions entirely:
  ```jsonc
  "exports": { "import": "./dist/index.es.js", "require": "./dist/index.cjs.js" }
  ```

The flat sugar and the `.`-keyed form are semantically equivalent for a single
root entry, so this is purely stylistic drift — except plgg-foundry, which loses
its per-condition `types` mapping (it falls back to the top-level `types` field;
correct today, but fragile and inconsistent).

**Goal:** one canonical shape everywhere — the **`.`-keyed, explicit** form (the
one that already scales to subpaths), with `types`+`default` under both `import`
and `require`. Behavior-preserving; the diff is config-only.

### Scope: non-core only

Per the standing "all except core" directive, **`packages/plgg` (core) is out of
scope** and keeps its flat form for now. This leaves core as the lone flat
package; aligning it is a trivial one-file follow-up the developer can opt into
separately (it touches core, hence excluded here). Note this in the Final Report.

## Canonical form (target)

```jsonc
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.es.js" },
    "require": { "types": "./dist/index.d.ts", "default": "./dist/index.cjs.js" }
  }
  // + any "./subpath" entries the package already ships, same shape
}
```

`main`/`module`/`types` top-level fields stay as-is (legacy resolver fallback).

## Key Files

- `packages/plgg-kit/package.json` — flat → `.`-keyed (single root entry).
- `packages/plgg-sql/package.json` — flat → `.`-keyed.
- `packages/plgg-fetch/package.json` — flat → `.`-keyed.
- `packages/plgg-foundry/package.json` — flat (no `types`) → `.`-keyed **with**
  the `types`+`default` conditions added under `import`/`require`.
- (already canonical, no change: plgg-view, plgg-router, plgg-server.)
- (out of scope: `packages/plgg`.)
- If the `plgg-http` extraction ticket has landed, that package is authored in the
  canonical form already — nothing to do here; if it lands later, it adopts this
  shape. No hard ordering between the two tickets.

## Implementation Steps

1. Rewrite the four `exports` blocks to the canonical `.`-keyed shape, preserving
   each package's existing `dist/*.es.js` / `*.cjs.js` / `*.d.ts` targets. Add the
   missing `types` conditions for plgg-foundry.
2. Smoke-check resolution: build the affected packages and confirm a dependent
   still resolves them. plgg-foundry depends on plgg-kit, and (after the http
   ticket) plgg-fetch depends on plgg-http — run `scripts/check-all.sh` so every
   `file:` dependent resolves its updated dependency's `exports`.
3. No source, test, or behavior changes — `scripts/check-all.sh` green end-to-end.

## Considerations

- **Equivalence, not behavior.** Node resolves `{import,require}` and
  `{".":{import,require}}` identically for the root; this change is safe. The one
  real fix is plgg-foundry regaining explicit `types` conditions.
- **No `as`/`any`/`ts-ignore`** — N/A (config only), but the no-escape-hatch rule
  still governs any incidental code touched (none expected).
- **Keep `main`/`module`/`types`.** Don't remove the legacy top-level fields; they
  cover non-`exports`-aware tooling.
- **Verify, don't assume.** After editing, `scripts/check-all.sh` must stay green —
  the `file:` symlinked deps resolve through `exports`, so a malformed block would
  surface as a dependent build/tsc failure.

## Open Questions

- **Include core for true uniformity?** Recommended *no* here (honoring "all except
  core"); flag a one-line follow-up to convert `packages/plgg` too if the developer
  wants zero drift.
- **Drop the legacy `main`/`module`/`types` fields?** Recommend keeping them
  (belt-and-suspenders for old resolvers); out of scope for this ticket.

## Final Report

Converted the four non-core packages to the canonical `.`-keyed `exports` shape:
plgg-kit, plgg-sql, plgg-fetch (flat → `.`-keyed) and plgg-foundry (flat without
`types` → `.`-keyed with the `types`+`default` conditions restored). Every
non-core package now uses the same shape (plgg-view/router/server were already
canonical; plgg-http was authored canonical in the sibling ticket). `main`/
`module`/`types` top-level fields kept. `scripts/check-all.sh` green end-to-end —
all `file:` dependents still resolve their dependencies' `exports`.

### Open Questions — resolutions

- **Include core?** No — `packages/plgg` stays flat per the "all except core"
  directive, so it is now the lone flat package. Aligning it is a trivial
  one-file follow-up the developer can opt into separately.
- **Drop legacy `main`/`module`/`types`?** No — kept for non-`exports`-aware tooling.

Development completed as planned; no surprises (the change is behavior-preserving,
the one substantive fix being plgg-foundry regaining explicit `types` conditions).
