---
type: Design
trip: plggmatic-extraction-cut
instruction: "20260708195655 — settle the plggmatic package cut"
author: Constructor
status: approved-pending-consensus
version: 2
supersedes: designs/design-v1.md
reviewed-by:
  - Planner
  - Architect
created_at: 2026-07-08
---

# Design v2

- **Author:** Constructor
- **Status:** approved-pending-consensus
- **Reviewed-by:** Planner, Architect

## What changed from v1

The team converged in round 1. v2 folds the resolution and
**corrects** v1's load-bearing error:

1. **One package, not the (v1-implied) ambiguity, and not the
   Architect's two packages.** One `plgg-ui` with a
   `plgg-ui/style` subpath. The two subpaths *are* the two
   consumed surfaces (theme vs runtime), so the Architect's
   separation goal is met without a second package's doubled
   cross-repo contract, doubled gate wiring, or a split
   Component tree.
2. **`--pm-*` is a parameterized `Theme` (CORRECTED).** v1 said
   "plggmatic OWNS the `--pm-*` values." My own round-1 review of
   the Model showed that is **not buildable** — plggpress emits
   `var(--pm-*)`, needs the values, and cannot import plggmatic
   (the invariant). So the *values* stay in plgg-family; what
   plggmatic owns is the `Theme` **contract + branded default +
   palette-override API + DSL**. The emitters become pure
   `(theme) => css`.

## Content

### 0. The decision in one sentence

The plggmatic engine+theme is generic plgg-family
infrastructure and **stays in this monorepo as one new package
`plgg-ui`** (root barrel = the runtime surface; `plgg-ui/style`
subpath = the theme surface), consumed by BOTH plggpress and the
extracted plggmatic; what leaves to `../plggmatic` is the
**Pragmatic design-system identity** — the `Theme` contract, the
`--pm-*` branded design-language *instance*, the concept/spec/DSL
docs, and the showcase apps — built on the *published* `plgg-ui`.

### 1. Scope & inventory (unchanged from v1, confirmed by all three)

- Public surface: `plggmatic` root barrel (Meta/Layout/Component/
  Form/Render/Declare/Schedule) + `plggmatic/style` subpath
  (`export * from "plgg-view/style"` + scheme-aware shadow atoms
  and CSS emitters).
- Internal layering (bottom→top): `Meta` (pure leaf) → `Style`
  (→Meta; extends `plgg-view/style`) → `Layout`/`Component`/`Form`
  → `Declare` → `Schedule` → `Render`. Zero third-party imports.
- Brand = two constants (`frameworkName="plggmatic"`,
  `cssPrefix="pm"`) + design-language *values* (monochrome
  `defaultPalette` D9, metric/type/z/syntax defaults,
  `appearanceStorageKey="vp-appearance"` D16). No `Pragmatic`
  token in code.
- Consumers to repoint: plggpress `theme/*` (theme surface),
  plggpress `Admin/*` (runtime surface). Showcase
  (`plggmatic-example`, `site`) moves out, not repointed. No
  other monorepo package imports plggmatic.

### 2. The converged cut

**New plgg-family package `plgg-ui`** (stays, published in this
monorepo):

- **Contents:** a verbatim `git mv` of `packages/plggmatic/src/
  {Meta,Style,Layout,Component,Form,Declare,Schedule,Render}/` +
  `styleEntry.ts` into `packages/plgg-ui/src/`, preserving
  history and every co-located `*.spec.ts`. Internal self-alias
  specifiers `plggmatic/<Tree>/…` → `plgg-ui/<Tree>/…`; tsconfig
  path alias `plggmatic/* → src/*` becomes `plgg-ui/* → src/*`.
- **Deps:** `plgg`, `plgg-view` only. Upward-only; never imports
  plggpress or plggmatic. Tooling: `plgg-bundle`, `plgg-test`,
  `.prettierrc.json` (printWidth 50), own `plgg-test.config.json`
  gated ≥90 from day one (D14).
- **Two export subpaths = the two surfaces:**
  - `plgg-ui` (root barrel): the **runtime** surface — Layout,
    the non-theme Components, Form, Declare, Schedule, Render
    (`declare`/`menu`/`collection`/`action`/`schedule`/
    `renderMode` + the `Declaration`/`Scheduled`/`SchedulerMsg`
    types).
  - `plgg-ui/style` (subpath): the **theme** surface —
    `export * from "plgg-view/style"` + the scheme-aware color
    atoms, `Scheme`/`Color`/`Metric`/`SyntaxKind`/`Palette`
    types, the CSS emitters (`schemeCss`/`metricCss`/`syntaxCss`/
    `reducedMotionCss`/`chromeCss`), `colorVar`/`metricVar`/
    `maxWidth`/`minWidth`, `appearanceStorageKey`/
    `injectAppearanceScript`, and — adopting the Architect's
    refinement — the **`themeToggle*` exports**
    (`themeToggle`/`staticThemeToggle`/`themeToggleClass`/
    `themeToggleCss`). Moving `themeToggle*` onto `/style` makes
    the subpath boundary == the surface boundary exactly, so
    plggpress `theme/*` imports come entirely from `plgg-ui/
    style` and `Admin/*` entirely from `plgg-ui`.
    *(The `themeToggle` component source stays physically in
    `Component/` — only its **export** is routed through the
    `/style` barrel; no Component-tree fragmentation.)*

**Future split line (recorded, sacrificial-architecture):** the
`Style/` tree is genuinely separable (bottom layer, deps Meta +
`plgg-view/style` only). IF a theme-only, scheduler-free consumer
ever earns it, `plgg-ui/style` promotes to a standalone
`plgg-scheme` package **along the already-existing subpath seam**
— a clean, pre-drawn rebuild boundary. Not now (YAGNI /
modular-monolith-first / D9 earned-place): the only consumer
today, plggpress, uses both surfaces.

**Base-token fold decision (kept from v1, all three agree):** do
**not** fold base tokens into `plgg-view/style`. It is already a
generic atomic-CSS utility kit and exports a `Color` type that
*collides* with the scheme `Color` (why `plggmatic/style` shadows
after a star). `plgg-ui/style` sits *on top* of `plgg-view/style`
(re-export + extend), exactly as `plggmatic/style` does today.
Preserves plgg-view neutrality; lower risk.

**One package rationale (converged):** the theme (`Style`) and
runtime (`Declare/Schedule/Render`) are entangled through
`Component` (themeToggle emits theme CSS; Render→Component) and
two small cycles (Declare↔Schedule, Component↔Form) — one
rebuildable sacrificial unit. Two packages would split the
Component tree, double the cross-repo published contract (two
semver pins — against Direction §5's narrow-seam principle), and
double the build/gate wiring, for no consumer benefit.

### 3. `--pm-*` = a parameterized `Theme` (the empty-shell answer)

**The correction.** The design-language *values* plggpress
consumes **must stay in plgg-family** (plggpress emits
`var(--pm-*)`, needs `schemeCss`/`colorVar`/the monochrome
palette, and cannot import plggmatic). So they do not ship out
with plggmatic. What makes plggmatic more than a bare label is
**parameterization**, which is buildable with **no escape hatch
and no plggpress→plggmatic dep**:

- The emitters and atoms take a typed **closed** `Theme` record as
  an argument instead of closing over module constants:
  `colorVar(theme)(c)`, `schemeCss(theme)`, `metricCss(theme)`,
  `syntaxCss(theme)`, where
  `Theme = { prefix, palette, metrics, typeScale, syntax, zBands,
  storageKey }` (a domain type — no `as`/`any`; a leaked or
  widened field fails `tsc`). The "CSS is emitted statically
  today" concern dissolves: the emitter simply receives its
  inputs.
- `plgg-ui/style` ships a neutral **`defaultTheme`** whose values
  are **set equal to today's monochrome `--pm-*` design language**
  (prefix `"pm"`, `defaultPalette`, `vp-appearance`), so plggpress
  stays **byte-identical** (D3/D16) — no visual regression.
- **plggpress passes the theme explicitly** at its composition
  root: it imports `defaultTheme` + the emitters from `plgg-ui`/
  `plgg-ui/style` and calls `schemeCss(defaultTheme)` etc.
  **plggpress never imports plggmatic.** Its docs-site look is now
  an explicit choice (it may later supply its own theme), which is
  the D3 "theme-first" spirit made honest.
- **plggmatic owns the Pragmatic design system:** the `Theme`
  **type** as the palette-override contract, the branded default
  `Theme` instance (the `--pm-*` monochrome design language named
  and versioned as Pragmatic's), the palette-override API, plus
  the concept/specs/DSL. One set of palette bytes (in `plgg-ui`'s
  `defaultTheme`), re-branded by plggmatic — **no duplication**;
  invariant intact (plggpress → plgg-ui only).

### 4. Cluster-vs-package (why "extract now" is not "extract empty")

The `plggmatic` **npm package** is a small, curated design-system
surface (Theme contract + branded default + palette-override API +
DSL scaffolding). The plggmatic **cluster** that ships to
`../plggmatic` carries real mass: `plggmatic-example` (workbench +
Demo 1) and `site` (docs) are substantial code, plus the concept +
two Pragmatic specs + scheduler design record. "Small package" ≠
"empty extraction." **Team decision to record: extract now, grow
the DSL in `../plggmatic`** — do not gate tickets B/C on an
unbuilt DSL (that would block the extraction indefinitely).

### 5. Delivery & sequencing (the decomposition source)

Concrete, ordered, with `depends_on`:

- **A1 — Scaffold `plgg-ui` + re-home the engine (byte-stable).**
  Create `packages/plgg-ui`; `git mv` the eight trees +
  `styleEntry.ts`; rewire internal specifiers + tsconfig alias;
  root `src/index.ts` (runtime) + `src/styleEntry.ts` (`./style`,
  now also re-exporting `themeToggle*`). Keep `--pm-`/monochrome
  as `plgg-ui`'s shipped default — **zero behavior change**. Add
  its `cd`-line to `scripts/build.sh` **after `plgg-view`, before
  `plggpress` and `plggmatic`** (publish order sed-derived); add
  `scripts/test-plgg-ui.sh` + the `check-all.sh` line;
  `plgg-test.config.json` ≥90; README index + gate-readme;
  `architecture.md` audit row (`plgg-ui` = "conformant — no
  third-party imports"). `depends_on: []`.
- **A2 — Repoint plggpress; plggmatic → thin facade.** plggpress
  `theme/*` → `plgg-ui/style`, `Admin/*` → `plgg-ui`; drop
  `plggmatic` from `plggpress/package.json`, add `plgg-ui`.
  plggmatic `src/index.ts`+`styleEntry.ts` re-export `plgg-ui`
  (+ its brand values) so it stays green through B/C. Update
  guide-container lists + `gate-guide-deps.sh` (plggpress now
  needs `plgg-ui`, not plggmatic); `architecture.md`
  dependency-direction (plggpress vendor-boundary EXEMPT status
  preserved). Grep-confirm plggpress imports **zero** plggmatic.
  `depends_on: [A1]`. **A1+A2 fully satisfy existing ticket A.**
- **A3 — Parameterize the `Theme` (the empty-shell answer).**
  Convert the emitters/atoms to `(theme) => css` with the closed
  `Theme` record; ship `defaultTheme` in `plgg-ui/style` (= today's
  monochrome); repoint plggpress to pass `defaultTheme` explicitly;
  move the `Theme` **contract + branded default + palette-override
  API** ownership into the plggmatic package. No `as`/`any`; no
  plggpress→plggmatic dep. `depends_on: [A2]`. **Must land before
  B** so the extracted plggmatic package has real substance.
- **B — Init + populate `../plggmatic`** (existing ticket 195656,
  REFINED): move the design-language brand + Theme instance + docs
  + showcase (`plggmatic-example`, `site`) — **not the engine**;
  re-point cross-repo deps to published `^version` of `plgg`/
  `plgg-view`/**`plgg-ui`** (+ `plggpress` for `site`); write the
  split ADR (modular-monolith justification + Reason/Assessment/
  Monitoring/Exit + the D13/D1/D16 amendment + the 192518 note).
  **npm publish of `plgg-ui` (+ any updated plgg/plgg-view) is a
  PREREQUISITE — surfaced as a gating step the developer runs;
  the trip NEVER auto-publishes.** `depends_on: [A3, publish]`.
- **C — Remove the cluster from the monorepo** (existing ticket
  195657, REFINED): delete `plggmatic`, `plggmatic-example`,
  `site` — **keep `plgg-ui`.** Rewire `build.sh` (remove the three
  cluster `cd`-lines + the site/dist/example copy), `check-all.sh`
  (remove the three `test-*.sh` + delete them), guide container,
  README index, `architecture.md` audit. `build.sh` is the sed
  source of truth — edit it, let derived lists follow.
  `depends_on: [B]`.

**Re-point dynamic-sources (192518) onto `plgg-ui` after A1.** It
adds a Model-driven `Source` variant to `Declare/model/Source.ts`
+ `Schedule/usecase/update.ts` — files that A1 re-homes into
`plgg-ui`. Land A1 first, then re-point 192518 at `plgg-ui` (its
framework half stays in the monorepo; its Demo 1 motivation lives
in `plggmatic-example`, which moves out in B, so the demo half
follows to `../plggmatic`). Doing the additive Source variant
after the move avoids a cross-repo change and a merge conflict on
the same files. If 192518 is urgent it may land first on the
current `Source.ts` and be carried by the `git mv`; either order
is safe.

### 6. Roadmap amendment (reference for B's ADR)

- **D13 (plggmatic canonical home = this monorepo): REVERSED** by
  the extraction premise — plggmatic leaves to `../plggmatic`. The
  *design system still originates here* via plgg-family (`plgg-ui`).
  Record as an amendment.
- **D1 (scheduler home = plggmatic): REFINED** — the scheduler
  *engine* moves to `plgg-ui`; plggmatic remains its *branded home
  / DSL owner*. Consistent with the concept (which post-dates D1).
- **D16 (`--pm-*` cutover, keep `vp-appearance`): GUARDED** —
  `plgg-ui`'s `defaultTheme` carries `prefix="pm"` and
  `storageKey="vp-appearance"`, so the live guide look and
  visitors' theme survive byte-identically.

### 7. Quality strategy

- `scripts/check-all.sh` green (all gates + build + every
  `test-*.sh`); coverage ≥91% where enforced. A1 is a verbatim
  move of code **with its specs**, so coverage holds by
  construction; `plgg-ui` gated ≥90 day one (D14) via its own
  `plgg-test.config.json` (avoid silent-ungating).
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error`/non-null `!`. The
  A1 move is specifier-rewire only (tsc proves surface intact);
  A3's `Theme` is a typed closed record.
- Prettier printWidth 50 across new/edited files.
- `build.sh` is the single sed source of truth for publish order +
  guide provisioning — edit it, never hand-fork derived lists
  (PR #51 drift).
- Acceptance grep: `grep -rn "plggmatic" packages/plggpress`
  returns zero import/dep hits after A2.
- Preserve `appearanceStorageKey="vp-appearance"` + `--pm-*`
  output; Phase-3 Playwright visual regression (old vs new guide)
  is the pre-merge visual gate.

### 8. Risk assessment

- **Empty-shell — resolved by A3 + cluster mass.** The cut pulls
  ~98% into `plgg-ui` (correct, concept-endorsed). A3 gives the
  plggmatic package real content (Theme contract + branded default
  + palette-override API); the cluster's mass is the showcase +
  docs. **Sequencing guard: A3 before B.**
- **Cross-repo published contract.** After B, `../plggmatic` is a
  versioned consumer of published `plgg`/`plgg-view`/`plgg-ui`;
  breaking-changes-OK ends at the boundary. One package (not two)
  keeps the seam narrow. Log in the split ADR.
- **npm publish is a PREREQUISITE for B, never autonomous.** The
  trip surfaces it; the developer runs `publish-release.sh` /
  `publish-npm.sh`. Pre-release/tag strategy is the fallback.
- **`site` → `plggpress` cross-repo edge.** `site` (moving out)
  consumes `plggpress` (staying); its SSG build must run against
  the *published* plggpress artifact — confirm during B.
- **Specifier-rewire completeness (A1).** Exhaustive or `tsc`
  fails loudly — a safe failure mode caught by A1's build.

## Policies

Carry into every emitted ticket:

- `workaholic:implementation` / `policies/directory-structure.md`
  — one `plgg-ui` dir; public API via root `src/index.ts` +
  `./style` subpath only; per-tree `model/usecase` preserved.
- `workaholic:implementation` / `policies/coding-standards.md`
  — no `as`/`any`/`ts-ignore`; A1 is specifier-rewire only; A3's
  `Theme` is typed; Prettier printWidth 50.
- `workaholic:design` / `policies/sacrificial-architecture.md`
  — `plgg-ui` is one rebuildable unit; `/style`→`plgg-scheme` is
  the pre-drawn future split; the design-language *values* are the
  replaceable shell, the token *machinery* the durable core.
- `workaholic:design` / `policies/vendor-neutrality.md`
  — `plgg-ui` is domain vocabulary; dependency one-directional
  (plggpress/plggmatic → plgg-ui); declining the `plgg-view/style`
  fold keeps that layer neutral.
- `workaholic:design` / `policies/modular-monolith-first.md`
  — one package now, split when earned (D9 earned-place); the
  `../plggmatic` split is the exception, justified in the B ADR;
  A3 keeps it from being an empty-shell spin-out.
- `workaholic:implementation` / `policies/domain-layer-separation.md`
  — the plgg-ui seam exchanges only primitives/domain/plgg types
  (already true — zero third-party imports); plggpress entry
  points stay thin; plggpress vendor-boundary EXEMPT preserved.
- `workaholic:implementation` / `policies/type-driven-design.md`
  — boundaries expose rich domain types (`Scheme`, `Declaration`,
  `Scene`, `FieldSpec`, and A3's closed `Theme`), not widened
  primitives; mismatches surface at compile time.
- `workaholic:implementation` / `policies/test.md`
  — plggpress `theme/*.spec.ts` + `Admin/*.spec.ts` stay green
  against re-homed imports; plgg-ui carries the co-located specs;
  ≥91% coverage; gated ≥90 day one (D14).
- `workaholic:operation` / `policies/ci-cd.md`
  — `scripts/check-all.sh` stays the single reproducible gate;
  green with `plgg-ui` added (A/C) and the cluster removed (C);
  `../plggmatic` gets its own CalVer release flow (B).
- `workaholic:implementation` / `policies/command-scripts.md`
  — canonical `*-*.sh` runners (`test-plgg-ui.sh`, `build.sh`
  cd-line, `check-all.sh` line); no bespoke per-command scripts;
  `build.sh` is the sed source of truth.

## Review Notes

- v2 is the fixed basis for the Decomposition gate. Open tickets:
  A1, A2, A3, B, C (+ the 192518 re-point). `depends_on`:
  A2→A1, A3→A2, B→A3+publish, C→B.
- Corrected from v1: `--pm-*` ownership is a parameterized `Theme`
  (values stay in plgg-family, plggmatic owns the contract/brand),
  not "plggmatic owns the values."
