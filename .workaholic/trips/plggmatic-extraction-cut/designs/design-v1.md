---
type: Design
trip: plggmatic-extraction-cut
instruction: "20260708195655 — settle the plggmatic package cut"
author: Constructor
status: draft
version: 1
created_at: 2026-07-08
---

# Design v1

- **Author:** Constructor
- **Status:** draft
- **Reviewed-by:**

## Content

### 0. The decision in one sentence

The plggmatic **engine** (layout, components, forms, the
declare→schedule→render TEA runtime, and the theme
*mechanism*) is generic plgg-family infrastructure and
**stays in this monorepo as one new package, `plgg-ui`**,
consumed by BOTH plggpress and the extracted plggmatic;
what leaves to `../plggmatic` is the **Pragmatic
design-system identity** — the `plggmatic`/`--pm-*` design
language *values*, the concept/spec/DSL documents, and the
showcase apps — built *on top of* the published `plgg-ui`.

This is the concept-true cut: the Pragmatic concept record
states plainly that "Pragmatic's durable value is the
AI-native design system and its DSL, **not the generic
engine, which may well belong to the plgg family**"
(`.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md`
§Positioning). The near-98%-engine finding is therefore not
a problem to route around — it is the answer: the engine is
plgg-family, and plggmatic is the design language + DSL that
instantiates it.

### 1. Scope & inventory (what actually moves)

**Public surface today** (`packages/plggmatic/src/index.ts`
+ `styleEntry.ts`):

- Root barrel `plggmatic`: `frameworkName`/`cssPrefix`
  (Meta); `row`/`column`/`pane`/`navPane`/`mainPane`/
  `asidePane` (Layout); the whole Component kit (button,
  textLink, heading, prose, themeToggle*, navTree, colHead,
  breadcrumb, textInput, textArea, selectInput, checkbox,
  confirmDialog, toast/toaster); Form (`parseForm`,
  `formView`, `FieldSpec`, submission); Render (`Mode`,
  `Screen`, `multiColumn`, `singleColumn`, `renderMode`);
  Declare (`Row`/`Source`/`Query`/`Action`/`Collection`/
  `Menu`/`Declaration`, `declare`); Schedule (`Model`/
  `Msg`/`Scene`, `schedule`, `sceneToUrl`/`parseUrl`).
- Subpath `plggmatic/style`: `export * from
  "plgg-view/style"` then plggmatic's scheme-aware color
  atoms + `Scheme`/`Color`/`Metric`/appearance/scheme/
  metric/syntax CSS emitters, SHADOWING plgg-view's
  same-named literal-hex atoms.

**Internal layering** (verified by import analysis; bottom →
top): `Meta` (pure leaf: `frameworkName="plggmatic"`,
`cssPrefix="pm"`) → `Style` (→Meta; extends `plgg-view/
style` via one edge in `usecase/utilities.ts`) → `Layout`
(independent leaf) / `Component` (→Meta, Form) / `Form`
(→Meta, Component) → `Declare` (base data model, tiny
Declare↔Schedule cycle) → `Schedule` (→Declare) → `Render`
(top; →Declare, Schedule, Component, Layout, Meta).
`Component`/`Layout`/`Render`/`Form` all emit `plgg-view`
`Html`; `Style` extends `plgg-view/style`. **Zero
third-party imports** across the whole tree (matches the
architecture.md audit row "plggmatic — conformant").

**Brand inventory** (what is actually "plggmatic-branded"):
there is **no `Pragmatic`/`pragmatic` token anywhere in
`src`**. The entire brand is two constants in
`Meta/model/identity.ts` — `frameworkName="plggmatic"` and
`cssPrefix="pm"` (imported by 20 files, so the `--pm-`
prefix is *parameterized*, not scattered) — plus the
design-language **values**: the monochrome `defaultPalette`
(`Style/model/palette.ts`, D9), the metric/type-scale/
z-band values, and the persisted key
`appearanceStorageKey="vp-appearance"` (D16, must be kept).
A handful of `pm-` DOM class-name literals live in
`Layout/` and a few Component controls.

**Engine vs branded verdict:** everything under
`{Meta,Style,Layout,Component,Form,Declare,Schedule,Render}/`
is generic *mechanism* → `plgg-ui`. The only *branded* thing
is the **values** the mechanism is fed (prefix string +
palette/metric/type numbers) + the docs + the showcase → the
extracted `plggmatic`.

**Consumers to repoint** (import analysis):

- plggpress theme surface — `theme/appearanceScripts.ts`,
  `theme/navBar.ts`, `theme/shell.ts`, `theme/baseCss.ts`
  (+ their specs, `syntaxSeam.spec.ts`): `themeToggleClass/
  Css`, `staticThemeToggle`, `schemeCss`, `metricCss`,
  `reducedMotionCss`, `syntaxCss`, `colorVar`, `metricVar`,
  `maxWidth`, `minWidth`, `appearanceStorageKey`,
  `injectAppearanceScript`.
- plggpress runtime surface — `Admin/adminDeclaration.ts`,
  `Admin/deliverAdmin.ts` (+ `adminRender.spec.ts`):
  `declare`/`menu`/`menuEntry`/`collection`/`action`/
  `confirm`/`loaded`/`async`/`query`/`makeRow`/`field`,
  `schedule`/`renderMode`, and the `Declaration`/`Path`/
  `SchedulerMsg`/`ScheduledModel`/`Scheduled` types.
- Showcase (move out, not repoint): `plggmatic-example`
  (workbench + Demo 1), `site` (docs) — both consume the
  full surface + `plggmatic/style`.
- No other monorepo package imports plggmatic (`example`
  does not).

### 2. Implementation approach — the concrete cut

**New plgg-family package: `plgg-ui`** (stays published in
this monorepo).

- **Contents:** a verbatim `git mv` of
  `packages/plggmatic/src/{Meta,Style,Layout,Component,Form,
  Declare,Schedule,Render}/` and `styleEntry.ts` into
  `packages/plgg-ui/src/`, preserving history and every
  co-located `*.spec.ts`. Internal self-alias specifiers
  `plggmatic/<Tree>/…` are rewired to `plgg-ui/<Tree>/…`
  (mechanical, exact); tsconfig path alias `plggmatic/* →
  src/*` becomes `plgg-ui/* → src/*`.
- **Deps:** `plgg`, `plgg-view` only (upward-only; never
  imports plggpress or plggmatic). Tooling: `plgg-bundle`,
  `plgg-test`, per-package `.prettierrc.json` (printWidth
  50), own `plgg-test.config.json` gated ≥90 from day one
  (D14).
- **Root `src/index.ts` surface:** the *same* named-export
  list plggmatic exports today (§1), re-pointed at
  `plgg-ui/…`. **`plgg-ui/style` subpath** mirrors
  `plggmatic/style` exactly — `export * from "plgg-view/
  style"` then the scheme-aware atoms/emitters that shadow
  it. Consumers get byte-identical symbols; specs move with
  them and stay green.
- **Identity default:** for the buildable first cut,
  `plgg-ui` keeps the current `cssPrefix="pm"`,
  `defaultPalette` (monochrome), and
  `appearanceStorageKey="vp-appearance"` as its **shipped
  defaults** so plggpress's persisted `--pm-*`/`vp-
  appearance` CSS contract (D16) is preserved with zero
  behavior change.

**What stays plggmatic-branded → `../plggmatic`:** the
Pragmatic *design system* — the identity + design-language
*values* (the `pm` prefix and the monochrome palette/metric/
type numbers it owns as "the `--pm-*` design language"), the
concept + two Pragmatic specs + scheduler design record (the
north-star docs that "travel with the package"), the DSL
roadmap (future), and the showcase (`plggmatic-example`,
`site`). `plggmatic` becomes a thin package that depends on
published `plgg-ui` and re-exports/instantiates it under the
Pragmatic brand.

**Base-token fold decision (REFINES ticket A step 1):** the
ticket floats folding base tokens into `plgg-view/style`.
**Recommend against.** `plgg-view/style` is already a
generic atomic-CSS utility kit consumed broadly and exports
its own `Color` type that *collides* with the scheme `Color`
(the reason `plggmatic/style` shadows after a star). Pushing
a color-scheme opinion down into `plgg-view/style` pollutes
the neutral render layer and re-opens that collision. Keep
`plgg-view/style` untouched and let `plgg-ui/style` sit *on
top* of it (re-export + extend), exactly as `plggmatic/
style` does today. Lower risk, preserves plgg-view
neutrality (sacrificial/vendor-neutrality). Recorded as an
assumption for the developer to overturn if they prefer the
fold.

**One package, not two.** The theme (`Style`) and runtime
(`Declare/Schedule/Render`) are entangled through
`Component` (`themeToggle` emits theme CSS; `Render`→
`Component`) and two small cycles (Declare↔Schedule,
Component↔Form). They form **one rebuildable sacrificial
unit**; splitting them into `plgg-ui-engine`+`plgg-ui-theme`
would sever cycles across a package boundary for no
consumer benefit (plggpress needs both). One `plgg-ui` with
two export subpaths (`.` and `./style`) is the coherent,
low-risk boundary.

**No duplication:** both plggpress and the (extracted)
plggmatic consume the *same* `plgg-ui` — plggpress via
monorepo `file:` dep, plggmatic via published `^version`
across the repo boundary. The engine exists in exactly one
place.

### 3. Delivery & sequencing plan

Ordered, each a `depends_on` edge:

1. **A1 — Scaffold `plgg-ui` + re-home the engine.**
   Create `packages/plgg-ui`, `git mv` the eight trees +
   `styleEntry.ts`, rewire internal specifiers + tsconfig
   alias, root `src/index.ts` + `./style` surface. Add its
   `cd`-line to `scripts/build.sh` **after `plgg-view`,
   before `plggpress` and `plggmatic`** (publish order is
   sed-derived from these lines); add `test-plgg-ui.sh` +
   the `check-all.sh` line; `plgg-test.config.json` gated
   ≥90. `depends_on: []`.
2. **A2 — Repoint plggpress + reduce plggmatic to a
   facade.** plggpress `theme/*` and `Admin/*` imports
   `plggmatic`/`plggmatic/style` → `plgg-ui`/`plgg-ui/
   style`; drop `plggmatic` from `plggpress/package.json`,
   add `plgg-ui`. plggmatic's `src/index.ts`+`styleEntry.ts`
   re-export `plgg-ui` (+ its own brand values) so it stays
   green through B/C. Update guide-container lists +
   `gate-guide-deps.sh` (plggpress now needs `plgg-ui`, not
   plggmatic), `README.md` index (gate-readme), and the
   `architecture.md` dependency-direction + vendor-boundary
   audit (add `plgg-ui` row = "conformant — no third-party
   imports"; plggpress vendor-boundary EXEMPT status
   preserved). Grep-confirm plggpress imports zero
   `plggmatic`. `depends_on: [A1]`. **This pair fully
   satisfies existing ticket A.**
3. **A3 — plggmatic owns the design language (the
   substance that stops it being an empty shell).**
   Parameterize `plgg-ui`'s prefix + palette/metric/type
   *values* as a `Theme`/design-tokens input threaded into
   the CSS emitters + `colorVar`; move the `pm` prefix and
   monochrome `defaultPalette` *values* into the plggmatic
   package as the Pragmatic design language it supplies to
   `plgg-ui`. This is where the "`--pm-*` design language"
   the trip subject names becomes plggmatic-owned content.
   `depends_on: [A2]`. *May instead land inside
   `../plggmatic` post-extraction (see reconciliation);
   sequence it before B populates so the extracted package
   has real substance.*
4. **B — init + populate `../plggmatic`** (existing ticket
   195656, REFINED): moves only the design-language layer +
   docs + showcase (NOT the engine — it stayed as
   `plgg-ui`), re-points cross-repo deps to published
   `^version` of `plgg`/`plgg-view`/**`plgg-ui`** (+
   `plggpress` for `site`). `depends_on: [A3, publish of
   plgg-ui]`.
5. **C — remove the cluster from the monorepo** (existing
   ticket 195657, REFINED): deletes `plggmatic`,
   `plggmatic-example`, `site` — **but NOT `plgg-ui`, which
   stays.** Rewire `build.sh`/`check-all.sh`/guide-container/
   README/architecture.md accordingly. `depends_on: [B]`.

**Reconciliation with the existing queue (explicit):**

- **Ticket A (195655): REFINED, not superseded.** Its core
  intent — plggpress drops plggmatic, both consume shared
  plgg-family, no duplication — is confirmed and buildable.
  The trip fixes the previously-uncertain cut: the "new
  plgg-family package(s)" is concretely **one package,
  `plgg-ui`** (engine+theme mechanism), and the base-token
  fold into `plgg-view/style` is **declined** with rationale
  (§2). A decomposes into A1+A2 (+ A3 as the design-language
  follow-on).
- **Ticket B (195656): REFINED.** What moves to
  `../plggmatic` is the design-language + docs + showcase,
  **not the engine**. The moved `package.json`s pin
  published `plgg-ui` (a *new* published dependency this
  trip introduces). The split ADR gains the plgg-ui rationale.
- **Ticket C (195657): REFINED.** `plgg-ui` is added to the
  monorepo and STAYS; only the three showcase/brand packages
  are removed. Build/guide/README/architecture rewiring is
  as the ticket describes, minus anything touching `plgg-ui`.
- **Dynamic sources (192518): RE-POINT, don't strand.** It
  adds a Model-driven `Source` variant to
  `Declare/model/Source.ts` + `Schedule/usecase/update.ts`
  — files that this cut re-homes into `plgg-ui`.
  **Assumption recorded:** land the cut (A1) first, then
  re-point 192518 at `plgg-ui` (its framework half stays in
  the monorepo; its Demo 1 motivation lives in
  `plggmatic-example`, which moves out in B, so the demo
  half follows to `../plggmatic`). Doing the additive Source
  variant *after* the move avoids a cross-repo change and a
  merge conflict on the same files. If 192518 is urgent it
  may land first on the current `Source.ts` and be carried
  along by the `git mv`; either order is safe, the cut is
  the higher-priority structural decision.

### 4. Quality strategy

- `scripts/check-all.sh` green (all gates + build + every
  `test-*.sh`); coverage ≥91% where enforced. Because
  `plgg-ui` is a verbatim move of code **with its
  co-located specs**, coverage holds by construction; new
  package gated ≥90 from day one (D14) via its own
  `plgg-test.config.json` (avoid the silent-ungating
  default).
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error`/non-null
  `!` introduced. The move is mechanical (specifier rewire
  only); `tsc` proves the surface is intact.
- Prettier printWidth 50 across new/edited files.
- `build.sh` is the single source of truth for publish
  order + guide provisioning (sed-derived) — edit it, let
  the derived lists follow; never hand-fork (PR #51 drift).
- Acceptance grep: `grep -rn "plggmatic" packages/plggpress`
  returns zero import/dep hits after A2.
- Preserve `appearanceStorageKey="vp-appearance"` (D16) and
  the `--pm-*` output so plggpress's live theme is
  byte-stable; Phase-3 Playwright visual regression (old vs
  new guide) is the pre-merge visual gate per the roadmap.

### 5. Risk assessment

- **"Empty-shell" risk (the ticket's headline concern) —
  RESOLVED by design.** The runtime cut *does* pull ~98% of
  the code into `plgg-ui`; that is correct and concept-
  endorsed. The extracted plggmatic is *not* an empty shell
  because its durable content is (a) the design-language
  *values* it owns (A3: the `pm` prefix + monochrome
  palette/metric/type numbers — "the `--pm-*` design
  language"), (b) the concept + specs + DSL roadmap docs,
  and (c) the showcase apps. **Sequencing guard:** A3 must
  land before B populates, or `../plggmatic` risks shipping
  a thin re-export — which would violate
  modular-monolith-first (don't spin out an empty package).
  If the developer wants the *minimal* first cut (A1+A2
  only, plggmatic as a pure facade) they may, but B/C should
  then wait for A3.
- **Cross-repo published contract.** After B, the "breaking-
  changes-OK / single-consumer" freedom no longer holds
  across the boundary: `../plggmatic` is a versioned consumer
  of published `plgg`/`plgg-view`/`plgg-ui`. Every future
  `plgg-ui` change is now a semver event for plggmatic. Log
  this in the split ADR (Reason/Assessment/Monitoring/Exit).
- **npm publish is a PREREQUISITE for B, never performed
  autonomously.** `../plggmatic`'s install pins published
  `^version` of `plgg-ui` (+ plgg/plgg-view, + plggpress for
  site). Those must be published to npm first (via the
  repo's `publish-release.sh`/`publish-npm.sh` release flow,
  past the 1.0.0 ghost, `--tag latest`). **This trip does
  NOT publish** — it surfaces the publish as a gating step
  the developer runs. A pre-release/tag strategy is the
  fallback if publishing the whole chain up front is
  undesirable.
- **`site` → `plggpress` cross-repo edge.** `site` (moving
  out) consumes `plggpress` (staying) across the boundary;
  its SSG build must work against the *published* plggpress
  artifact, not a local path. Confirm during B.
- **Specifier-rewire completeness.** The `plggmatic/<Tree>`
  → `plgg-ui/<Tree>` rewire and the tsconfig alias must be
  exhaustive or `tsc` fails loudly (no escape hatch to hide
  it) — this is a *safe* failure mode, caught by A1's build.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md`
  — `plgg-ui` lands as one dir under `packages/`; public API
  through root `src/index.ts` (+ `./style` subpath) only;
  per-tree `model/usecase` layout preserved by the verbatim
  move.
- `workaholic:implementation` / `policies/coding-standards.md`
  — no `as`/`any`/`ts-ignore`; the move is specifier-rewire
  only, `tsc` proves surface integrity; Prettier printWidth
  50.
- `workaholic:design` / `policies/sacrificial-architecture.md`
  — `plgg-ui` is drawn as one rebuildable unit (engine+theme
  entangled through Component/cycles); the design language
  (values) is the separately-rebuildable Pragmatic layer;
  rebuild rationale recorded here and in the ticket-B ADR.
- `workaholic:design` / `policies/vendor-neutrality.md`
  — plgg-ui is domain vocabulary, not a vendor (no anti-
  corruption wrapper); dependency stays one-directional
  (plggpress/plggmatic → plgg-ui, never reverse); declining
  the `plgg-view/style` fold keeps that layer neutral.
- `workaholic:design` / `policies/modular-monolith-first.md`
  — the `../plggmatic` split is the exception; A3 gives the
  extracted package real substance so the split is not an
  empty-shell spin-out; justification + Reason/Assessment/
  Monitoring/Exit logged in the ticket-B ADR.
- `workaholic:implementation` / `policies/domain-layer-separation.md`
  — the plgg-ui seam exchanges only primitives, domain, and
  plgg types (it already does — zero third-party imports);
  plggpress entry points stay thin; plggpress vendor-
  boundary EXEMPT status preserved, not regressed.
- `workaholic:implementation` / `policies/type-driven-design.md`
  — package boundaries expose rich domain types (`Scheme`,
  `Declaration`, `Row`, `Scene`, `FieldSpec`), not widened
  primitives, so a mismatch surfaces at compile time;
  relevant to A3's `Theme` parameter (a typed design-token
  input, not `any`).
- `workaholic:implementation` / `policies/test.md`
  — plggpress `theme/*.spec.ts` and `Admin/*.spec.ts` stay
  green against re-homed imports; plgg-ui carries plggmatic's
  co-located specs; ≥91% coverage holds; gated ≥90 from day
  one (D14).
- `workaholic:operation` / `policies/ci-cd.md`
  — `scripts/check-all.sh` remains the single reproducible
  gate and must pass with `plgg-ui` added (A/C) and the
  cluster removed (C); `../plggmatic` gets its own
  script-driven CalVer release flow (B).
- `workaholic:implementation` / `policies/command-scripts.md`
  — new wiring goes through the canonical `*-*.sh` runner
  set (`test-plgg-ui.sh`, `build.sh` cd-line, `check-all.sh`
  line); no bespoke per-command scripts; `build.sh` is the
  sed source of truth for publish order + guide provisioning.

## Review Notes

- Load-bearing decision for reviewers to probe: **one
  `plgg-ui` package holding both the theme and the runtime**
  (vs. the ticket's "base tokens into plgg-view/style + a
  new package"). Rationale in §2 (entanglement + cycles +
  neutrality); challenge it if the theme surface is worth an
  independent package to a non-plggpress consumer.
- Second decision to probe: **A3 (plggmatic owns the design
  language via a parameterized `Theme`) as the answer to the
  empty-shell risk.** If the team prefers the minimal cut
  (plggmatic as a pure `plgg-ui` facade), B/C must be gated
  on accepting a thin `../plggmatic` package — flag the
  modular-monolith-first tension.
- Naming: `plgg-ui` chosen as the plgg-family umbrella for
  the UI engine+theme (fits `plgg-view`/`plgg-router`/…);
  alternative `plgg-scheduler` under-describes the layout/
  component/theme content. Open to rename.
- Dynamic-sources (192518) ordering assumption (§3) — Architect/
  Planner to confirm it is re-pointed, not stranded.
