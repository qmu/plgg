# Coding Review — U0 (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U0 — fix the pre-existing FS case collisions
  (`style.ts`/`Style`, `ssg.ts`/`Ssg`) that blocked plgg-view/server/
  example, while preserving the public `./style` and `./ssg` subpaths
- **Implementation under test**: Constructor commit `e66dfc9`
- **Status**: validated
- **Decision**: **PASS — Approve with one observation**

## Content

All validation executed externally (rebuilt plgg-test + whole repo
first). This ticket directly resolves **Finding B** from my
concurrent-launch baseline, so the primary bar is: is the blocker gone,
and is the public API genuinely unchanged?

### 1. Typecheck unblocked (Finding B cleared) — PASS

The on-disk collision is gone: `plgg-view/src/style.ts` →
`styleEntry.ts` (no longer collides with the `Style/` directory) and
`plgg-server/src/ssg.ts` → `ssgEntry.ts` (no longer collides with
`Ssg/`).

- `bash scripts/tsc-plgg.sh` → clean (exit 0, no `error TS`).
- Per-package typecheck of the three Finding-B packages:
  - `plgg-view`: **0 TS errors** (the `TS1149` casing error is gone).
  - `plgg-server`: **0 TS errors** (the `TS1261` + missing-export
    cascade is gone).
  - `example`: **0 TS errors** (the `dist/style` missing-export cascade
    is gone).

At launch, all three failed to typecheck on this case-insensitive
filesystem. They are all clean now. **Finding B is cleared.**

### 2. Build clean — PASS

`bash scripts/build.sh` → whole-repo clean (exit 0). Grepping the build
log for `TS1149`/`TS1261`/`differs from`/`case` returns **nothing** — the
generated dist no longer carries a `style.*`-vs-`Style/` (or `ssg`) case
collision. The dist now emits `styleEntry.*` / `ssgEntry.*` alongside the
`Style/` / `Ssg/` subtrees, with no colliding pair.

### 3. Public subpaths still resolve (the API-preservation proof) — PASS

This is the most important external check, and I verified it
**empirically against the built dist**, not just by reading config:

- The `exports` map preserves the published specifiers: `plgg-view`'s
  `"./style"` now points at `./dist/styleEntry.{es,cjs}.js` and
  `plgg-server`'s `"./ssg"` at `./dist/ssgEntry.{es,cjs}.js`. The
  *consumer-facing specifier* (`plgg-view/style`, `plgg-server/ssg`) is
  unchanged; only the internal file target moved.
- Importing the public subpath modules and inspecting their exports:
  - `plgg-view/style` → **58 exported symbols**, including `style_`
    (true) and `p` (true). Sample: `active, alignValue, bg, block,
    border, …, flexCol`.
  - `plgg-server/ssg` → **11 exported symbols**, including
    `generateStatic` (true) and `writeStatic` (true). Sample:
    `generateStatic, nonHtmlBody, ssgPage, writeStatic, …`.

So a downstream consumer importing `plgg-view/style` or
`plgg-server/ssg` gets the exact same symbols as before. The rename is
internal; the public API is preserved. Confirmed end-to-end by `example`
(which imports both subpaths) building and testing green (check 4).

### 4. Existing tests still green (no regression) — PASS

Both packages remain on vitest (correctly NOT migrated by U0) and match
my baseline exactly:

- `bash scripts/test-plgg-view.sh` → **11 files / 115 passed**.
- `bash scripts/test-plgg-server.sh` → **14 files / 86 passed**.
- (bonus) `bash scripts/test-example.sh` → **1 file / 25 passed** — the
  downstream consumer of both renamed subpaths is green, independently
  corroborating the API-preservation result.

No regression versus the pre-U0 state; the rename broke nothing.

### Observation (per Critical Review Policy) — the `…Entry` filename is
the right cross-platform fix, but it is now an undocumented convention
worth a one-line note

The fix renames the colliding *entry* files to `styleEntry.ts` /
`ssgEntry.ts` while keeping the `Style/` / `Ssg/` subtrees and the public
`./style` / `./ssg` specifiers. This is a clean, API-preserving solution.
The only residual risk is human: a future contributor, not knowing why
the entry file is `styleEntry.ts` rather than the more obvious
`style.ts`, could "tidy" it back to `style.ts` and silently re-introduce
the exact case collision on a case-insensitive filesystem — which would
again break plgg-view/server/example builds (and, once those packages are
migrated, their plgg-test runs).

- **Proposal** (non-blocking, U3 hardening): add a one-line comment at
  the top of `styleEntry.ts` and `ssgEntry.ts` —
  "renamed from `style.ts`/`ssg.ts` to avoid a case collision with the
  `Style/`/`Ssg/` directory on case-insensitive filesystems; the public
  `./style`/`./ssg` subpath is preserved via package.json exports — do
  not rename back." This converts an implicit, platform-specific
  invariant into a documented one and protects the contributor-experience
  criterion. The fix itself is correct as-is.

## Review Notes

- **Decision: PASS — Approve with one observation.** Finding B is
  cleared: plgg-view/server/example all typecheck at 0 errors and build
  clean with no case collision; the public `./style`/`./ssg` subpaths
  empirically still expose their symbols (`style_`/`p`;
  `generateStatic`/`writeStatic`); existing vitest suites are unchanged
  (view 11/115, server 14/86, example 1/25). Nothing red.
- This unblocks the plgg-view, plgg-server, and example U2 migration
  tickets, which my launch baseline had flagged as blocked behind
  Finding B. They can now proceed.
- The single observation is a non-blocking U3 documentation item with a
  concrete proposal; no rework requested.
