---
created_at: 2026-07-08T19:56:55+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, UX, Config]
effort:
commit_hash:
category:
depends_on:
mission:
---

# A1 — Scaffold `plgg-ui` and re-home the plggmatic engine+theme tree (byte-stable, zero behavior change)

## Overview

First step of the plggmatic extraction, refined by the `/trip`
design pass (`plggmatic-extraction-cut`). The `/trip` settled the
previously-uncertain cut: the plggmatic **engine + theme
mechanism** is generic plgg-family infrastructure and becomes
**one new package, `plgg-ui`, that STAYS published in this
monorepo**; only the Pragmatic **design-system identity** (the
`Theme` contract, the `--pm-*` branded design language, the
concept/spec/DSL docs, and the showcase) leaves to `../plggmatic`
later (tickets B/C). This ticket does only the mechanical,
behavior-preserving re-home: create `plgg-ui` and `git mv` the
whole engine+theme tree into it, keeping today's `--pm-`/monochrome
defaults so nothing changes for any consumer yet.

The public surface is preserved exactly as **two export subpaths
== the two consumed surfaces**:

- `plgg-ui` (root barrel) = the **runtime** surface (Layout, the
  non-theme Components, Form, Declare, Schedule, Render).
- `plgg-ui/style` (subpath) = the **theme** surface
  (`export * from "plgg-view/style"` + the scheme-aware atoms,
  the CSS emitters, `colorVar`/`metricVar`/`maxWidth`/`minWidth`,
  `appearanceStorageKey`/`injectAppearanceScript`, and — adopting
  the design's refinement — the **`themeToggle*` exports**
  `themeToggle`/`staticThemeToggle`/`themeToggleClass`/
  `themeToggleCss`). Routing `themeToggle*` through the `/style`
  barrel makes the subpath boundary equal the surface boundary, so
  the A2 repoint is clean; the `themeToggle` component **source
  stays physically in `Component/`** — only its export is routed
  through `/style` (no Component-tree fragmentation).

This ticket does NOT repoint plggpress (that is A2) or parameterize
the theme (that is A3). plggmatic keeps consuming/​re-exporting the
moved code so it stays green.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — one `plgg-ui` dir under `packages/`; public API via root `src/index.ts` + `./style` subpath only; per-tree `model/usecase` layout preserved by the verbatim move (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; the move is specifier-rewire only, `tsc` proves surface integrity; Prettier printWidth 50 (applies to all code work)
- `workaholic:design` / `policies/sacrificial-architecture.md` — `plgg-ui` is drawn as one rebuildable unit (engine+theme entangled via Component + the Declare↔Schedule / Component↔Form cycles); record the `/style`→`plgg-scheme` future split line
- `workaholic:design` / `policies/vendor-neutrality.md` — `plgg-ui` is domain vocabulary, not a vendor; dependency one-directional (never imports plggpress/plggmatic); do NOT fold base tokens into `plgg-view/style` (keeps that layer neutral, avoids the `Color`-type collision)
- `workaholic:design` / `policies/modular-monolith-first.md` — one package now; the `/style` subpath is the pre-drawn seam to split later only when a consumer earns it (D9 earned-place)
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the plgg-ui seam exchanges only primitives/domain/plgg types (already true — zero third-party imports); plggpress vendor-boundary EXEMPT status untouched here
- `workaholic:implementation` / `policies/type-driven-design.md` — the package boundary exposes rich domain types (`Scheme`, `Declaration`, `Scene`, `FieldSpec`), not widened primitives
- `workaholic:implementation` / `policies/test.md` — the co-located `*.spec.ts` move with the code; ≥91% coverage holds by construction; `plgg-ui` gated ≥90 from day one (D14) via its own `plgg-test.config.json` (avoid the silent-ungating default)
- `workaholic:operation` / `policies/ci-cd.md` — `scripts/check-all.sh` stays the single reproducible gate and must pass green with `plgg-ui` added
- `workaholic:implementation` / `policies/command-scripts.md` — wire through the canonical `*-*.sh` runners (`test-plgg-ui.sh`, the `build.sh` cd-line, the `check-all.sh` line); no bespoke per-command scripts; `build.sh` is the sed source of truth for publish order + guide provisioning

## Trip Origin

`.workaholic/trips/plggmatic-extraction-cut/designs/design-v2.md`
§2 (The converged cut) and §5 (Delivery & sequencing — A1). The
one-package + `/style`-subpath decision and the declined
`plgg-view/style` fold are justified in §2; the byte-stable
re-home is A1 in §5.

## Key Files

- `packages/plggmatic/src/{Meta,Style,Layout,Component,Form,Declare,Schedule,Render}/` — the eight trees to `git mv` into `packages/plgg-ui/src/` (with co-located `*.spec.ts`)
- `packages/plggmatic/src/index.ts`, `packages/plggmatic/src/styleEntry.ts` — the surface templates; become `packages/plgg-ui/src/index.ts` (runtime) + `src/styleEntry.ts` (`./style`, now also re-exporting `themeToggle*`)
- `packages/plggmatic/package.json`, `tsconfig.json`, `.prettierrc.json`, `plgg-test.config.json` — templates for `packages/plgg-ui/*` (name `plgg-ui`, exports `.`/`./style`, path alias `plgg-ui/* → src/*`, deps `plgg`+`plgg-view`, tooling `plgg-bundle`/`plgg-test`)
- `scripts/build.sh` — add the `plgg-ui` `cd`-line AFTER `plgg-view`, BEFORE `plggpress` and `plggmatic` (publish order is sed-derived from these lines)
- `scripts/check-all.sh` + new `scripts/test-plgg-ui.sh` — register the package's test run
- `README.md` — add the `plgg-ui` index entry (gate-readme)
- `.workaholic/constraints/architecture.md` — add the `plgg-ui` audit row ("conformant — no third-party imports") and name it in the dependency-direction Bounds sentence
- `workloads/guide/*` + `scripts/gate-guide-deps.sh` — plgg-ui provisioning follows once plggpress depends on it (mainly A2, but the build/provision plumbing is added here)

## Related History

- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - created the plggpress→plggmatic edge; its Final Report enumerates the build.sh ordering + guide-container lists this ticket's plumbing mirrors
- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the earlier move precedent (symbol→package rewire template)

## Implementation Steps

1. Scaffold `packages/plgg-ui/` from the plggmatic manifests: `package.json` (name `plgg-ui`; `exports` `.` → `dist/index.*` and `./style` → `dist/styleEntry.*`; deps `plgg`+`plgg-view`; devDeps `plgg-bundle`/`plgg-test`/`typescript`), `tsconfig.json` (path alias `plgg-ui/* → src/*`, same strictness), `.prettierrc.json` (printWidth 50), `plgg-test.config.json` (coverage gated ≥90).
2. `git mv` the eight trees `{Meta,Style,Layout,Component,Form,Declare,Schedule,Render}/` + `styleEntry.ts` into `packages/plgg-ui/src/`, preserving history and every co-located `*.spec.ts`.
3. Rewire internal self-alias specifiers `plggmatic/<Tree>/…` → `plgg-ui/<Tree>/…` across the moved files (exhaustive; `tsc` catches misses — no escape hatch).
4. Write `packages/plgg-ui/src/index.ts` (the runtime barrel = today's plggmatic root barrel minus the theme atoms, re-pointed at `plgg-ui/…`) and `src/styleEntry.ts` (the theme barrel = today's `plggmatic/style` PLUS the `themeToggle*` exports routed here). Keep `--pm-`/monochrome as the shipped default (`cssPrefix="pm"`, `defaultPalette`, `appearanceStorageKey="vp-appearance"`) — zero behavior change.
5. Wire `scripts/build.sh` (cd-line after plgg-view, before plggpress/plggmatic), `scripts/test-plgg-ui.sh`, the `scripts/check-all.sh` line, `README.md` index, and the `.workaholic/constraints/architecture.md` audit row + Bounds sentence.
6. Leave plggmatic re-exporting/consuming the moved code (temporary) so `packages/plggmatic` stays green until A2.
7. Run `scripts/check-all.sh` fresh and confirm green (build + every `test-*.sh` + gates), coverage ≥91% where enforced.

## Quality Gate

**Acceptance criteria:**

- `packages/plgg-ui/` exists with root `src/index.ts` (runtime) + `src/styleEntry.ts` (`./style`) surfaces, co-located `*.spec.ts`, deps `plgg`+`plgg-view` only (imports neither plggpress nor plggmatic).
- The moved surface is byte-stable: the symbols exported by `plgg-ui` + `plgg-ui/style` equal today's `plggmatic` + `plggmatic/style` (with `themeToggle*` now on `/style`); `--pm-`/monochrome output unchanged.
- `packages/plggmatic` still builds and tests green (re-exporting/consuming the moved code).
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.
- `scripts/build.sh` has the `plgg-ui` cd-line in dependency order; `scripts/test-plgg-ui.sh` + the `check-all.sh` line exist; `README.md` index + `architecture.md` audit updated.

**Verification method:**

- `scripts/check-all.sh` green (fresh rebuild — all gates + build + every `test-*.sh`, ≥91% coverage where enforced).
- A symbol-diff (or `tsc` against a consumer) confirming `plgg-ui`/`plgg-ui/style` re-export the same names.
- Prettier printWidth 50 across new/edited files.

**Gate:**

- `scripts/check-all.sh` green AND the surface byte-stable AND no escape hatches AND README/architecture updated.

## Considerations

- This is deliberately behavior-preserving: keep `--pm-`/monochrome as `plgg-ui`'s shipped default. Repointing plggpress (A2) and parameterizing the theme (A3) are separate tickets — do not pull them forward.
- `build.sh` is the single sed source of truth for publish order + guide provisioning; never hand-fork the derived lists (PR #51 drift).
- The dynamic-sources ticket `20260708192518` targets `Schedule/model/Source.ts`, which this ticket re-homes into `plgg-ui`; it has been re-pointed at `plgg-ui` with `depends_on: [this ticket]`. Land A1 first so it rebases onto the new home.
- Do NOT reverse the dependency direction and do NOT fold base tokens into `plgg-view/style` (the design declines the fold — `Color`-type collision + neutrality).
