---
created_at: 2026-07-04T14:30:03+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: d3f210d
category: Changed
depends_on: []
---

# plggmatic Style tokens: role×variant matrix + neutral scale, monochrome black/white default

## Overview

Phase 1 (Design tokens), ticket **03** of the plggpress/plggmatic roadmap —
implements the token half of **D9** ("Monochrome (black/white primary) default
+ role×variant matrix + 5 colors now. Matrix = {primary, success, danger,
warning, info} × {base, text, surface, border}") from the approved decision
record: `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. The
palette-**override API** half of D9 is sibling ticket 04; non-color tokens are
ticket 05; porting plggpress onto these tokens (and the D16 `--vp-*` → `--pm-*`
cutover) is ticket 07. This ticket touches **plggmatic's token layer and the
site docs only** — `plggpress/src/theme/baseCss.ts` is read as an oracle, never
edited.

Two coupled changes:

1. **Restructure the closed `Color` vocabulary.** Today
   `packages/plggmatic/src/Style/model/token.ts` is a flat 8-role union
   (`surface`, `surface-2`, `primary`, `primary-text`, `text`, `muted`,
   `border`, `danger`). Per D9 it becomes a **matrix**: semantic roles
   {`primary`, `success`, `danger`, `warning`, `info`} × variants {`base`,
   `text`, `surface`, `border`} (20 tokens), **plus** the neutral scale
   {`surface`, `surface-2`, `text`, `muted`, `border`} (5 tokens) — one closed
   25-member type. Neutrals and the matrix coexist by construction: export
   `SemanticRole`, `Variant`, and `Neutral` unions and compose
   `` type Color = `${SemanticRole}-${Variant}` | Neutral `` — still closed,
   still a compile error for `bg("blurple")`, and adding `secondary`/`tertiary`
   later is a **single union-member edit** whose fallout (`colors`, `PALETTE`,
   emitter, contrast pairs) is driven entirely by `tsc` errors. Do NOT ship
   secondary/tertiary now (D9: they await a concrete consumer).
2. **Switch the default palette to monochrome.** The warm cream/pine seed
   (`#fffdf7`/`#1f6b54`) is replaced by the black/white values already shipped
   and battle-tested in `packages/plggpress/src/theme/baseCss.ts` — the
   qmu.co.jp oracle port: light brand `#111111` on bg `#ffffff` (alt
   `#f6f6f7`, text `#1f1f22`, muted `#5b5b61`, border `#ededee`), dark bg
   `#1b1b1f` (alt `#202127`, border `#262629`, translucent-white inks).

**Doctrine amendment, stated deliberately:** `token.ts`'s header comment
records the emergent/earned-role seeding doctrine ("a deliberate *seed*, not a
catalog … each role earns its place from a concrete consumer"). Shipping a
5×4 matrix ahead of per-token consumers **amends that recorded doctrine** —
D9 decides the role×variant *shape* up front as roadmap vocabulary, and the
earned-place rule moves up one tier: new **roles** (secondary/tertiary) are
still earned by a concrete consumer. Rewrite the comment to record the amended
doctrine and cite D9, so the file does not silently contradict its own history.

The **phase-1 quality gate** from the roadmap lands here: the WCAG-AA contrast
spec is re-verified for **every role×variant pairing in BOTH schemes** —
computed, not eyeballed, exactly as `contrast.spec.ts` does today.

Zero new dependencies; no runner-script changes (`plggmatic` is already wired
into `scripts/npm-install.sh` / `build.sh` / `check-all.sh` — this ticket adds
no package, so those files must not change).

## Policies

- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility testing as "not observed / not applicable (no UI
  components)"; that predates plggmatic. The computed WCAG 2.2 AA gate in
  `contrast.spec.ts` is this repo's executable accessibility practice, and
  this ticket widens it to the full matrix — the phase-1 gate makes contrast
  a build failure, not a guideline, superseding the snapshot's "not
  applicable".
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer and `as`/`any`/`ts-ignore` are prohibited;
  the whole design leans on this: the union restructure makes every stale call
  site a `tsc` error, and the `Record<Scheme, Record<Color, …>>` palette shape
  makes a missing token a compile error, so the migration is machine-checked
  end to end. Prettier `printWidth: 50` governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage targets are
  enforced per package; `packages/plggmatic/plgg-test.config.json` gates at
  threshold 90 (excluding only `/index.ts`, `/styleEntry.ts`), so the enlarged
  token/spec surface must keep statements/branches/functions/lines above it.

## Key Files

- `packages/plggmatic/src/Style/model/token.ts` — the flat `Color` union, the
  `colors` array, the `PALETTE` map (warm cream/pine values), `colorHex`,
  `colorVar`, and the emergent-doctrine comment. The center of this ticket.
- `packages/plggmatic/src/Style/model/token.spec.ts` — hex-shape check plus the
  compile-time exhaustiveness pin (`SEEN: Record<Color, true>`); must be
  regenerated for the 25-member vocabulary.
- `packages/plggmatic/src/Style/model/scheme.ts` — `Scheme`/`schemes`
  (light/dark); unchanged, but iterated by every re-verification.
- `packages/plggmatic/src/Style/usecase/schemeCss.ts` — emits `--pm-*` custom
  properties from `colors` in order; mechanism unchanged, output grows to 25
  variables per scheme.
- `packages/plggmatic/src/Style/usecase/contrast.spec.ts` — the computed WCAG
  gate; its `PAIRS` list is rebuilt for the matrix (see step 6).
- `packages/plggmatic/src/Style/usecase/utilities.ts` (+ `utilities.spec.ts`)
  — `bg`/`color`/`textColor`/`borderColor`/`outline` take `Color` (signatures
  unchanged); the `border` const hard-pins `colorVar("border")`, which stays
  valid as the neutral.
- `packages/plggmatic/src/Style/index.ts`, `packages/plggmatic/src/styleEntry.ts`
  — the explicit barrels; export the new `SemanticRole`/`Variant`/`Neutral`
  names alongside `Color`.
- Call sites that break (good — `tsc` finds them):
  `packages/plggmatic/src/Component/usecase/button.ts` (lines 61–62,
  `bg("primary")` + `textColor("primary-text")`),
  `packages/plggmatic/src/Component/usecase/textLink.ts` (line 59,
  `textColor("primary")`),
  `packages/plggmatic/src/Component/model/interaction.ts` (line 36,
  `outline("primary")`). Neutral-only sites
  (`Component/usecase/navTree.ts` line 50, `packages/site/examples/colorScheme.ts`,
  `packages/plggmatic-example/src/app.ts` line 332) compile unchanged.
- `packages/plggpress/src/theme/baseCss.ts` — the **read-only oracle**: light
  block lines 31–45, dark block lines 56–72 (translucent-white inks — the
  comment says the alpha "is part of the spec"), callout hues lines ~522–545
  (tip/success `#ecfdf5`/`#10b981`/`#022c22`, warning
  `#fffbeb`/`#f59e0b`/`#451a03`, danger `#fef2f2`/`#ef4444`/`#450a0a`, with
  dark counterparts). Not edited by this ticket.
- `packages/site/color-scheme.md` — the docs page: eight-role table, warm
  palette narrative, measured-ratio table; fully rewritten for the matrix and
  the monochrome default.
- `packages/site/examples/colorScheme.ts` — the compile-checked twin of that
  page; uses only neutrals today, but must be kept in lockstep with the
  rewritten prose.
- `packages/plggmatic/plgg-test.config.json` — threshold 90; unchanged,
  cited by the gate.

## Related History

- The Style seed arrived with the plggmatic UI design framework import,
  commit `6d7a832` ("Add the plggmatic UI design framework to the monorepo").
  `token.ts`'s comment cites its seeding tickets (`20260703144035` pane,
  `20260703144036` component) — those live in the standalone `qmu/plggmatic`
  repo's archive, **not** in this repo's `.workaholic/tickets/archive/`;
  don't hunt for them here.
- `.workaholic/tickets/archive/work-20260701-185044/20260701211839-plgg-press-tokens-typography-match-qmu.md`
  (story `.workaholic/stories/work-20260701-185044.md`) — the qmu.co.jp oracle
  port that produced the exact `baseCss.ts` values this ticket adopts as the
  monochrome default. The oracle discipline ("mirror qmu's global.css exactly,
  record deviations") is the precedent for how values are carried over.
- `.workaholic/tickets/archive/work-20260703-050355/20260703114826-svg-sun-moon-icons-oracle-port.md`
  — same oracle-port pattern, and the theme-toggle affordance the schemes
  serve.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  — describes the **old-meaning** plggmatic (app-framework facade); its rewire
  map must not be applied to today's `packages/plggmatic`. Sibling roadmap
  ticket 01 (`20260704143001-cleanup-plgg-press-remnant-and-canonical-manifests.md`,
  in this todo queue) writes the disambiguation note — no dependency, but
  don't duplicate its prose work.
- `packages/site/color-scheme.md`'s "Contrast is a gate, not a guideline"
  section is the recorded promise this ticket extends from 7 pairings to the
  full matrix.

## Implementation Steps

1. **Restructure the type** in `Style/model/token.ts`: export
   `type SemanticRole = "primary" | "success" | "danger" | "warning" | "info"`,
   `type Variant = "base" | "text" | "surface" | "border"`,
   `type Neutral = "surface" | "surface-2" | "text" | "muted" | "border"`, and
   `` type Color = `${SemanticRole}-${Variant}` | Neutral ``. Export
   `semanticRoles`, `variants`, `neutrals` arrays and **derive**
   `colors: ReadonlyArray<Color>` from them
   (`semanticRoles.flatMap(…variants…)` + neutrals) so the list can never
   drift from the union. The uniform `-base` suffix (no bare `primary`) keeps
   the template-literal derivation total; if drive prefers a bare spelling for
   `base`, the exhaustiveness pin must still hold at compile time.
2. **Document variant semantics** in the same file: `base` = the solid accent
   fill (buttons, active markers); `text` = the role's ink used as foreground
   on the *neutral* surfaces and on the role's own `surface`; `surface` = the
   role-tinted panel background (callout body); `border` = the role's edge
   hue. Pin the **on-base label** convention: ink on `<role>-base` is the
   neutral `surface` token (this is exactly the oracle's
   `--vp-hover:#111111` / `--vp-hover-ink:#ffffff` pair, inverted per scheme).
3. **Amend the doctrine comment** (see Overview): record that D9 fixes the
   role×variant *shape* up front, that the earned-place rule now applies at
   the role tier (secondary/tertiary await a concrete consumer), and cite
   `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` D9. Do not
   erase the history — say the seed doctrine was amended, and by what.
4. **Fill `PALETTE` with the monochrome default.** Neutrals + primary from the
   oracle: light `surface #ffffff`, `surface-2 #f6f6f7`, `text #1f1f22`,
   `muted #5b5b61`, `border #ededee`, `primary-base #111111`; dark
   `surface #1b1b1f`, `surface-2 #202127`, `border #262629`. The dark inks are
   translucent whites in the oracle (`rgba(240,240,245,0.92)` text,
   `rgba(235,235,245,0.55)` muted, `rgba(255,255,255,0.95)` brand) but the
   token layer requires `#rrggbb` (the hex-shape spec and the emitter depend
   on it) — **flatten each alpha over the dark `surface`** (≈ `#dfdfe4`,
   `#8d8d95`, `#f4f4f5`; recompute, don't trust these approximations) and note
   the flattening in the palette comment. `primary-text` = light `#111111` /
   dark flattened brand — the link ink. Seed success/warning/danger
   `surface`/`text`/`border` variants from the oracle's callout hues (both
   schemes); choose their `base` values at a darker tier (e.g. the
   `#dc2626`-family for danger) so the on-base label clears AA — the contrast
   spec, not this ticket, is the arbiter of exact values. `info` has **no
   oracle value** (plggpress renders info callouts in brand/neutral): pick an
   AA-passing blue family, mark it as the one non-oracle role.
5. **Migrate call sites** (all found by `tsc` after step 1, except one):
   `button.ts` → `bg("primary-base")` + on-base ink per step 2;
   `interaction.ts` → `outline("primary-base")`; `textLink.ts` →
   `textColor("primary-text")`. **Trap to handle by hand:** the literal
   `"primary-text"` exists in both vocabularies with *different meanings*
   (old: label ON primary; new: primary ink ON neutral surfaces) — `tsc`
   cannot catch a stale use, so audit every old `primary-text` site
   (`button.ts` line 62 is the only one) explicitly.
6. **Rebuild `contrast.spec.ts` PAIRS as the phase-1 gate.** In BOTH schemes:
   neutrals — `text`/`muted` on `surface` and `surface-2` (4 pairs, ≥4.5:1);
   per semantic role r — `r-text` on `surface`, on `surface-2`, and on
   `r-surface`, plus neutral `surface` on `r-base` (the on-base label)
   (≥4.5:1, 20 pairs); per role r — `r-border` against `surface` and
   `surface-2` at the WCAG 1.4.11 non-text floor (≥3:1, 10 pairs). Derive the
   role-parameterized pairs from `semanticRoles` so adding a role later
   auto-extends the gate. Every one of the 25 tokens must appear in at least
   one asserted pairing — add a spec assertion for that coverage property
   itself.
7. **Verify the emitter needs no logic change**: `schemeCss.ts` maps over
   `colors`, so it emits the 25 `--pm-*` variables per scheme for free. Add a
   spec assertion (in `token.spec.ts` or a new `schemeCss.spec.ts`) that the
   emitted CSS contains `--pm-primary-base` and exactly
   `schemes.length × colors.length` declarations, and stays escape-safe (no
   `<`, `>`, `&`).
8. **Rewrite `packages/site/color-scheme.md`**: the role×variant matrix +
   neutral-scale tables with the monochrome values, the amended-doctrine note,
   and a regenerated measured-ratios table (compute the real ratios of the
   final palette — do not carry the warm palette's numbers). Keep
   `packages/site/examples/colorScheme.ts` compiling and consistent with the
   prose; extend it if the page now shows a semantic-role example.
9. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result and
   exhaustive `match` where control flow appears (`plgg-coding-style`);
   Prettier `printWidth: 50`; zero new dependencies; no changes to
   `scripts/npm-install.sh` / `scripts/build.sh` / `scripts/check-all.sh`.

## Quality Gate

**Acceptance criteria**

1. `Color` is the closed 25-member matrix+neutrals type built from exported
   `SemanticRole`/`Variant`/`Neutral` unions; `colors` is derived, not
   hand-listed twice; `bg("primary")` (bare) and `bg("blurple")` are compile
   errors; adding a role to `SemanticRole` alone type-errors every place that
   must react (palette, pin, pairs) — demonstrated by reasoning over the
   types, not by shipping `secondary`.
2. The default palette is monochrome: light `primary-base` = `#111111` on
   `surface` = `#ffffff`, dark values from the oracle with alpha flattened to
   solid hex; every value matches `#rrggbb` (existing hex-shape spec passes).
3. The contrast spec enumerates the full pairing set of step 6 in **both**
   schemes and passes — all text pairings ≥4.5:1, all border pairings ≥3:1,
   and the every-token-appears coverage assertion holds. This is the roadmap's
   phase-1 gate.
4. `token.ts`'s comment records the D9 doctrine amendment;
   `packages/site/color-scheme.md` documents the new matrix, palette, and
   recomputed measured ratios.
5. `git diff --stat` touches only `packages/plggmatic/src/Style/**`, the three
   Component call-site files, the two barrels, `packages/site/color-scheme.md`
   (+ `examples/colorScheme.ts` if extended) — no runner scripts, no
   `plggpress`, no new dependencies in any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean and `./scripts/test-plggmatic.sh` green, then a
**fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not mask
drift in `plggmatic-example`/`site`, which compile against the new union)
green end to end, with plggmatic coverage above the configured 90 threshold
across statements/branches/functions/lines. Paste the contrast spec's pass
output (or the computed ratio table) into the PR as the phase-gate evidence.

**Gate**

All five acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green AND the contrast spec demonstrably covers every role×variant pairing
in both schemes. A single failing pairing, coverage dip, escape hatch, or
runner-script diff fails the ticket.

## Considerations

- **Alpha flattening is a recorded divergence from the oracle**: baseCss's
  comment says the translucent dark inks "are part of the spec". Tokens are
  single solid values, so we flatten over the scheme's `surface`; text sitting
  on `surface-2` will differ imperceptibly from qmu's compositing. Acceptable
  here; ticket 07 (plggpress theme on plggmatic) must revisit whether any
  surface needs its own flattened ink.
- **`info` is the one non-oracle role** — no qmu value exists (info callouts
  render in brand). Whatever blue ships is provisional until a consumer
  (callout/badge in the component tier) exercises it; the contrast spec keeps
  it honest meanwhile.
- **Scope walls**: palette-override API and scheme persistence
  (`vp-appearance` key, D16 carve-out) = ticket 04; spacing/typography/radius
  tokens = ticket 05; consuming these tokens in plggpress and the `--vp-*` →
  `--pm-*` cutover = ticket 07. Resist pulling any of it forward.
- **secondary/tertiary stay unshipped** (D9, roadmap "deliberately deferred").
  Revisit trigger: a concrete consumer earns them; the type design in step 1
  makes that a one-union-member change.
- The `-base` suffix uniformity vs. a bare role name is a naming judgment
  call; drive may flip it, but the derivation-totality and compile-pin
  properties are non-negotiable.
- `utilities.ts` signatures are untouched, so this is *not* a breaking change
  for atom callers — only role literals move. Breaking changes would be
  acceptable anyway (plgg is its own only consumer), but there is no need
  here.
- The warm cream/pine palette is deleted, not kept as an alternate scheme;
  if anyone wants it back it returns via ticket 04's override API, not as a
  third `Scheme`.

## Final Report

**What Changed**
- `Style/model/token.ts`: flat 8-role union → closed 25-token matrix.
  Exported `SemanticRole` (primary/success/danger/warning/info), `Variant`
  (base/text/surface/border), `Neutral` (surface/surface-2/text/muted/border),
  and `` type Color = `${SemanticRole}-${Variant}` | Neutral ``. `colors` is
  DERIVED from the unions (map callback return-annotated `: Color` so the
  template literal keeps its type). `PALETTE` filled with the monochrome qmu
  default: light `#111111` on `#ffffff`, dark inks flattened from the oracle's
  translucent whites (`#dfdfe4`/`#8d8d95`/`#f4f4f4`); semantic surfaces/inks
  seeded from the oracle callout hues, base/border tiers chosen for AA; `info`
  a provisional blue (the one non-oracle role). Doctrine comment amended per D9.
- Call sites: `button.ts` `bg("primary-base")` + on-base label
  `textColor("surface")`; `textLink.ts` `textColor("primary-text")`;
  `interaction.ts` `outline("primary-base")`.
- Barrels: `Style/index.ts` and `styleEntry.ts` export `SemanticRole`/`Neutral`.
  The token `Variant` is intentionally NOT barrel-exported — plgg-view already
  exports a `Variant` (the {selector, styles} CSS variant) that `styleEntry`
  re-exports and `interaction.ts` imports; shadowing it would break that. Token
  `Variant` stays importable from `plggmatic/Style/model/token`.
- Specs: `token.spec.ts` reworked to union-level exhaustiveness pins
  (`Record<SemanticRole|Variant|Neutral, true>`) + derived-`colors` checks
  (length 25, unique); `contrast.spec.ts` rebuilt as the role-parameterized
  phase-1 gate (24 text pairs ≥4.5:1, 10 border pairs ≥3:1, both schemes) with
  an every-non-divider-token-covered assertion; new `schemeCss.spec.ts` (50
  vars, escape-safe); `utilities.spec.ts` migrated off bare `"primary"`.
- `packages/site/color-scheme.md` rewritten for the matrix + neutral tables,
  the monochrome default, the D9 doctrine note, and recomputed measured ratios.

**Verification**
- Contrast solver (scratchpad) converged first try: all 34 pairings pass in
  both schemes; the shipped values match the spec.
- tsc-plggmatic clean; `test-plggmatic.sh` = 100/100/100/100, "gate passed
  (all four > 90%)", contrast + schemeCss + token specs green.
- Fresh `check-all.sh` exit 0; the two consumers of the changed union
  re-verified directly: `plggmatic-example` compiles + tests (now EXEMPT),
  `site` `tsc -p tsconfig.examples.json` clean.
- `git diff` = exactly the Key Files (Style/**, 3 components, 2 barrels,
  color-scheme.md, + new schemeCss.spec.ts); no plggpress, no runner scripts,
  no new deps.

**Discovered Insights**
- A template literal `` `${r}-${v}` `` widens to `string` in expression
  position — the map callback needs a `: Color` return annotation to keep the
  `` `${SemanticRole}-${Variant}` `` type, otherwise `colors` fails to assign.
- Name collision: the token layer's natural `Variant` name clashes with
  plgg-view's CSS `Variant` on the shared style barrel; resolved by not
  re-exporting the token variant through the barrel.
- The neutral hairline `border` cannot meet a 3:1 floor by design (a faint
  divider), so it is the one token gated by the emitter spec (must be emitted)
  rather than by a contrast ratio.
