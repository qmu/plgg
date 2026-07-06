---
created_at: 2026-07-04T14:30:05+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: 8949b37
category: Added
depends_on: [20260704143003-plggmatic-token-matrix-monochrome-default.md]
---

# plggmatic non-color design tokens: typography scale, breakpoints, shell geometry, z-index bands, reduced motion

## Overview

Phase 1 (Design tokens), ticket **05** of the plggpress/plggmatic roadmap —
the non-color half of the "tokens first" sequencing decided in **D3**
("Theme rewrite first: tokens → port plggpress theme onto plggmatic → prove
on the live guide"), building on the **D9** color matrix landed by sibling
ticket 03 and feeding the **D16** `--vp-*` → `--pm-*` cutover that ticket 07
executes. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Today plggmatic's `Style` module tokenizes **color only**
(`packages/plggmatic/src/Style/model/token.ts` + the `--pm-*` emitter in
`schemeCss.ts`). Every non-color value the theme port will need is either
inherited untyped from plgg-view's generic scale (`FontSize` tops out at
`2xl = 1.5rem` — the guide's `h1` is `1.875rem`, unreachable) or hand-authored
as magic numbers in the plggpress oracle
(`packages/plggpress/src/theme/baseCss.ts`) and the plggmatic example
(`packages/plggmatic-example/src/app.ts`). Ticket 07 cannot port the theme
onto plggmatic tokens if those tokens do not exist. This ticket gives the
`Style` module a typed non-color vocabulary, sourced value-for-value from the
oracle:

1. **Typography scale**, aligned to the current guide prose: `h1 1.875rem`,
   `h2 1.5rem`, `h3 1.1875rem`, `h4 1.0625rem`, all headings **weight 400**;
   body `16px` at line-height `1.75` (`baseCss.ts` lines 91, 373–386); plus
   the compact sub-`sm` heading sizes (`1.75rem/1.25`, `1.375rem/1.3`,
   `1.125rem`, lines 550–554) recorded in the same map so ticket 07 derives
   its 639px block from tokens; a closed font-weight set ({400, 500, 600} —
   the only weights the oracle uses); and the sans font stack.
2. **Spacing**: a recorded decision, not a new scale — plgg-view's
   `spacing(step) = step × 0.25rem` is already the house scale (the prose
   measure `maxW(192)` is exactly `48rem`); adopt it as THE plggmatic spacing
   token and say so in the docs rather than cloning it.
3. **Breakpoints**: `sm` 640px (oracle writes `max-width:639px`), the
   multi-column **snap** boundary 900px (`plggmatic-example` writes
   `min-width:900px` / `max-width:899px`), `lg` 1024px (`min-width:1024px` /
   `max-width:1023px`). These must be **TS constants with query builders**,
   not custom properties — CSS cannot resolve `var()` inside `@media`.
4. **Shell layout dimensions**: shell max `1440px`, sidebar `256px`, content
   measure `48rem`, chrome rail `48px` (`--vp-rail-w`/`--vp-sidebar-w`/
   `--vp-shell-max` at `baseCss.ts` lines 47–49, `.vp-doc{max-width:48rem}`
   line 359; the example's `HEADER_H = "48px"` reuses the same chrome
   thickness).
5. **Z-index bands**: the oracle's stack is 30 (sticky mobile bar, line 169),
   40 (backdrop, line 196), 50 (drawer, line 582), plus in-pane sticky
   headers at 1 (example `.ex-colhead`). Tokenize as a closed, semantically
   named band set so ad-hoc integers stop appearing.
6. **Reduced motion**: the oracle honors `prefers-reduced-motion:reduce`
   (lines 80–85: scroll-behavior back to `auto`, hover transitions off).
   The token layer must own an escape-safe reduced-motion CSS block and the
   recorded rule that any motion the framework ships is covered by it.
7. **The qmu signature hover/hover-ink inversion pair** (`--vp-hover` /
   `--vp-hover-ink`): decide whether it is derivable from the ticket-03
   matrix under the monochrome default or needs its own token — and record
   the decision. The evidence says **derivable**: light `#111111`/`#ffffff`
   and dark `rgba(255,255,255,0.95)`/`#1b1b1f` are exactly ticket 03's
   `primary-base` (dark value alpha-flattened per its step 4) and the neutral
   `surface`, i.e. precisely the on-base-label convention 03 pins. Note the
   tension to resolve explicitly: `Component/model/interaction.ts` records
   "hover feedback is an opacity dim, not a hover color token, until a
   component needs a dedicated hover role" — the inverted pill is a
   *different* hover idiom than `hoverDim`. Whatever drive concludes, the
   decision and its revisit trigger must be written down (see step 7).

Scope walls: `plggpress` is **read-only oracle** (the port is ticket 07);
`plgg-view` is untouched (plggmatic *shadows*, it does not edit upstream);
the color palette-override API is ticket 04. No new package, so
`scripts/npm-install.sh` / `build.sh` / `check-all.sh` must not change
(plggmatic is already wired in). Zero new dependencies.

## Policies

- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility testing as "not observed / not applicable (no UI
  components)"; that predates plggmatic. This ticket moves two executable
  accessibility practices into the token layer: reduced-motion handling
  becomes a framework-owned, spec-asserted CSS block (WCAG 2.3.3 territory),
  and the compact heading scale keeps phone-column type legible — both
  carried over from the oracle rather than left as per-theme folklore.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; the whole design leans on it: every scale here is a closed
  union with an exhaustive `Record`, so a missing value or a
  `text("3xl")`-style typo is a `tsc` error, and consumer migration
  (heading/prose/example) is driven entirely by compile errors. Prettier
  `printWidth: 50` governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; `packages/plggmatic/plgg-test.config.json` sets threshold 90
  (excluding only `/index.ts`, `/styleEntry.ts`), so the new token models,
  emitters, and atoms must land with specs that keep
  statements/branches/functions/lines above it.

## Key Files

- `packages/plggmatic/src/Style/model/token.ts` — the color vocabulary
  (matrix + neutrals after ticket 03); the hover-derivation decision is
  recorded next to the on-base-label convention here. New non-color model
  files sit beside it.
- `packages/plggmatic/src/Style/model/scheme.ts` — `Scheme`/`schemes`; the
  non-color tokens are scheme-independent, which shapes the emitter split.
- `packages/plggmatic/src/Style/usecase/schemeCss.ts` — the `--pm-*`
  emitter pattern (single source map → escape-safe `:root` block) the new
  metrics/typography emitter mirrors; stays color-only or grows a clearly
  scheme-independent sibling block — drive's call, single-source either way.
- `packages/plggmatic/src/Style/usecase/utilities.ts` (+ `utilities.spec.ts`)
  — the themed atoms; grows the atoms the new tokens need (line-height,
  font-weight, z-index; plgg-view has no `line-height` or `z-index` utility
  today).
- `packages/plggmatic/src/Style/index.ts`,
  `packages/plggmatic/src/styleEntry.ts` — the explicit barrels; every new
  type/const/atom is exported here, shadowing plgg-view where names collide.
- `packages/plgg-view/src/Style/model/token.ts` — **read-only**: the
  `spacing` step scale (adopted, not cloned) and the `FontSize` union whose
  `2xl = 1.5rem` ceiling is why plggmatic needs its own prose scale.
- `packages/plgg-view/src/Style/usecase/utilities.ts` — **read-only**:
  `maxW`, `text`, `weight` — what exists vs. what plggmatic must add.
- `packages/plggmatic/src/Component/usecase/typography.ts`
  (+ `typography.spec.ts`) — `heading` maps levels to plgg-view sizes
  (`LEVEL_SIZE`, `1 → "2xl"`) with `weight(600)`; `prose` uses
  `fontSize("base")` + `maxW(192)`. Both migrate to the new tokens.
- `packages/plggmatic/src/Component/usecase/button.ts` — `weight(500)`
  (line 66) becomes the tokenized medium weight.
- `packages/plggmatic/src/Component/model/interaction.ts` — the recorded
  "no hover color token" rule (lines 42–48) that step 7's decision must
  reconcile, not silently contradict.
- `packages/plggpress/src/theme/baseCss.ts` — the **read-only oracle**; all
  line references in the Overview point here.
- `packages/plggmatic-example/src/app.ts` — `HEADER_H` (line 626) and the
  `min-width:900px` / `max-width:899px` snap pair (lines 656–657) migrate to
  the chrome-rail and breakpoint tokens as the proof of consumption.
- `packages/site/site.config.ts`, `packages/site/color-scheme.md`,
  `packages/site/components/typography.md`,
  `packages/site/examples/typography.ts` — the docs surface: a new
  design-tokens page (+ compiling example) joins the sidebar; the typography
  component page is updated for the new scale/weights.
- `packages/plggmatic/plgg-test.config.json` — threshold 90; unchanged,
  cited by the gate.

## Related History

- `.workaholic/tickets/archive/work-20260701-185044/20260701211839-plgg-press-tokens-typography-match-qmu.md`
  (story `.workaholic/stories/work-20260701-185044.md`) — the qmu.co.jp
  oracle port that produced the exact typography and `--vp-rail-w`/
  `--vp-sidebar-w`/`--vp-shell-max` values this ticket lifts into tokens.
  Its discipline (mirror qmu's global.css exactly, record deviations) is the
  precedent for how values carry over.
- `.workaholic/tickets/archive/work-20260701-185044/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md`
  — where the sidebar-first shell geometry (rail, drawer, independent
  scrolling) took its current shape.
- `.workaholic/tickets/archive/work-20260630-013457/20260701003202-plgg-press-responsive-breakpoints.md`
  (story `.workaholic/stories/work-20260630-013457.md`) — the 1024px/639px
  responsive behavior this ticket names as `lg`/`sm`.
- `.workaholic/tickets/archive/work-20260703-050355/20260703052717-plggpress-reconcile-tokens-a11y-qmu-oracle.md`
  — the token/a11y reconciliation pass against the oracle; its posture
  (computed checks over eyeballing) continues here.
- Sibling ticket 03 (`20260704143003-plggmatic-token-matrix-monochrome-default.md`,
  this todo queue) — the dependency: its `primary-base`/neutral-`surface`
  naming and dark-ink alpha flattening are what makes the hover pair
  derivable at all. Do not restate its palette work.
- plggmatic's Style/Layout seed tickets (`20260703144035` pane,
  `20260703144036` component) live in the standalone `qmu/plggmatic` repo's
  archive, **not** in this repo's `.workaholic/tickets/archive/` — don't
  hunt for them here. The seed's emergent doctrine ("tokens grow one
  recorded consumer at a time", `Style/index.ts` header) governs how small
  each new scale starts.

## Implementation Steps

1. **Typography model** (new file under
   `packages/plggmatic/src/Style/model/`): a closed prose-type-scale union
   (e.g. `TypeRole = "h1" | "h2" | "h3" | "h4" | "body"`) with an exhaustive
   `Record` carrying `{size, lineHeight, weight}` per role, values from the
   oracle: `h1 1.875rem/400`, `h2 1.5rem/400`, `h3 1.1875rem/400`,
   `h4 1.0625rem/400` (line-height `1.5` where the oracle sets one), body
   `1rem`/`1.75`/`400`. Record the compact sub-`sm` variants
   (`h1 1.75rem/1.25`, `h2 1.375rem/1.3`, `h3 1.125rem`) in the same map —
   one source, ticket 07 emits the media block from it. Add a closed
   `FontWeight` set ({400, 500, 600} — regular/medium/semibold, the only
   weights the oracle uses) and the sans font-stack constant (`"Inter"`,
   ui-sans-serif, system-ui, … from `baseCss.ts` lines 88–90). Seed nothing
   beyond what the oracle and current components consume (emergent
   doctrine).
2. **Spacing decision**: adopt plgg-view's `spacing` step scale as the
   plggmatic spacing token — a doc-comment + docs-page statement, not code
   duplication. The content measure is formalized in step 4, not as a
   spacing alias.
3. **Breakpoint model**: closed union `sm | snap | lg` mapping to
   `640px | 900px | 1024px`, with `minWidth`/`maxWidth` query builders where
   the max query is boundary − 1px (`639px`/`899px`/`1023px` — matching the
   oracle and example verbatim). Doc-comment the constraint that forces TS
   constants: `@media` cannot resolve `var()`, so breakpoints are build-time
   values consumed by CSS-emitting code, never `--pm-*` properties.
4. **Shell metrics model**: closed union for the shell dimensions —
   shell max `1440px`, sidebar `256px`, content measure `48rem`, chrome rail
   `48px` — emitted as `--pm-*` custom properties (these ARE
   `var()`-consumable, unlike breakpoints), with a lookup mirroring
   `colorHex`/`colorVar`.
5. **Z-index bands**: closed union of semantic bands, spaced for insertion —
   sticky in-pane content `1`, chrome `30`, backdrop `40`, overlay `50`
   (exactly the oracle's stack plus the example's sticky header). A `zIndex`
   atom in `utilities.ts`; ad-hoc integers in plggmatic-consuming code are
   the smell this removes.
6. **Emitters + atoms**: emit the scheme-independent variables (shell
   metrics; typography sizes if drive chooses to expose them as `--pm-*`)
   as a single-source `:root` block alongside `schemeCss` — same
   escape-safety contract (no `<`, `>`, `&`; survives the SSR `text()`
   escaper byte-for-byte). Add the missing atoms plgg-view lacks:
   line-height, tokenized font-weight, `zIndex`. Export everything through
   `Style/index.ts` and `styleEntry.ts`.
7. **Hover/hover-ink decision — decide and record.** Default
   recommendation: **derive, no new token** — under the monochrome default
   the pair equals `primary-base` (ink) over neutral `surface` in both
   schemes, exactly ticket 03's on-base-label convention, so a dedicated
   token would be a second name for the same two values. Record in the
   token model's doc comment: (a) the derivation
   (`hover := primary-base`, `hover-ink := neutral surface`), (b) why no
   token ships (D9's earned-place rule at the role tier), (c) the revisit
   triggers — ticket 04's palette-override API (a non-black `primary-base`
   turns the signature monochrome pill into a colored pill; if qmu identity
   requires the inversion to stay monochrome under overridden palettes, the
   pair earns its own token then) and ticket 07's port (if any surface
   fails AA under the derivation, the contrast spec is the arbiter).
   Reconcile `interaction.ts`'s "no hover color token" comment: the
   opacity-dim rule stands for *component* hover feedback; the inverted
   pill is a *theme* idiom expressed through existing tokens — amend the
   comment to say both, citing this ticket and D9. If drive overturns the
   default, the dedicated token must join the ticket-03 contrast gate for
   both schemes.
8. **Reduced motion**: export an escape-safe `prefers-reduced-motion:reduce`
   CSS block owned by the Style layer (scroll-behavior back to `auto`,
   framework transitions off — the oracle's lines 80–85 generalized to
   plggmatic's own hooks), and record the rule that any motion plggmatic
   ships (today: `hoverDim`-style transitions, the example's drawer/snap)
   must be covered by it. Ticket 07 composes this block into the ported
   theme instead of re-authoring it.
9. **Migrate consumers** (compile errors and the oracle drive this):
   `Component/usecase/typography.ts` — `heading` draws size/weight from the
   new type scale (h1 becomes `1.875rem`/weight `400`; the current
   `2xl`/`600` rendering is the mismatch this ticket exists to fix — a
   deliberate visual change, the guide prose is the arbiter) and `prose`
   takes body line-height `1.75` and the content-measure token instead of
   `maxW(192)`; `button.ts` `weight(500)` → the medium weight token;
   `plggmatic-example/src/app.ts` — `HEADER_H` → chrome-rail token, the
   `900px`/`899px` literals → `snap` breakpoint builders.
10. **Docs**: add a design-tokens page to `packages/site` (prose + a
    compiling example under `examples/`, wired into `site.config.ts`'s
    sidebar like the existing pages) covering the type scale, spacing
    decision, breakpoints (and why they are not custom properties), shell
    metrics, z-index bands, reduced motion, and the recorded hover
    decision; update `components/typography.md` for the new heading
    sizes/weights. Keep prose and example in lockstep.
11. **Specs**: exhaustiveness pins for every new closed union (the
    `SEEN: Record<…, true>` pattern from `token.spec.ts`); value-shape
    checks (rem/px/unitless line-height where each is expected); the
    breakpoint max = min − 1px property; emitter escape-safety and
    declaration-count assertions; updated `typography.spec.ts` asserting
    the oracle sizes/weights. Coverage stays above the configured 90.
12. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result
    and exhaustive `match` where control flow appears (`plgg-coding-style`);
    Prettier `printWidth: 50`; zero new dependencies; no changes to
    `scripts/npm-install.sh` / `scripts/build.sh` / `scripts/check-all.sh`.

## Quality Gate

**Acceptance criteria**

1. Typography, breakpoints, shell metrics, and z-index bands each exist as
   a closed union + exhaustive `Record` in `packages/plggmatic/src/Style/`,
   exported through both barrels; an unknown member (e.g. a `"3xl"` type
   role or a `"md"` breakpoint) is a compile error.
2. Values match the oracle exactly: h1/h2/h3/h4 =
   `1.875/1.5/1.1875/1.0625rem` all weight 400, body 1rem at 1.75, compact
   sub-`sm` sizes recorded; breakpoints 640/900/1024 with 639/899/1023 max
   queries; shell 1440px / sidebar 256px / measure 48rem / rail 48px;
   z-index 1/30/40/50.
3. Breakpoints are TS constants with query builders (no `--pm-*`
   breakpoint variable exists); shell metrics ARE emitted as `--pm-*`
   variables; every emitted CSS block is escape-safe (spec-asserted).
4. The hover/hover-ink decision is recorded in the token model's doc
   comment with derivation, rationale, and both revisit triggers, and
   `interaction.ts`'s hover comment is reconciled — or, if overturned, the
   dedicated token passes the ticket-03 contrast gate in both schemes.
5. `heading` renders the guide scale (level 1 = 1.875rem, weight 400),
   `prose` uses the measure and line-height tokens, `button` uses the
   weight token, and `plggmatic-example` carries no `900px`/`899px`/`48px`
   literals where a token now exists.
6. The reduced-motion block is exported from the Style layer and
   spec-asserted; the site's design-tokens page exists, compiles its
   example, and `components/typography.md` matches the shipped scale.
7. `git diff --stat` touches only `packages/plggmatic/**`,
   `packages/plggmatic-example/**`, `packages/site/**` — no `plggpress`,
   no `plgg-view`, no runner scripts, no new dependencies in any
   `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean and `./scripts/test-plggmatic.sh` green, then a
**fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not mask
drift in `plggmatic-example`/`site`, which compile against the new exports)
green end to end, with plggmatic coverage above the configured 90 threshold
across statements/branches/functions/lines. Paste the rendered guide-scale
comparison (token values vs. `baseCss.ts` oracle lines) into the PR as
evidence for criterion 2.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. A single oracle-value mismatch, an open hover decision, a
breakpoint shipped as a custom property, a coverage dip, an escape hatch, or
a `plggpress`/`plgg-view`/runner-script diff fails the ticket.

## Considerations

- **The heading change is visible**: plggmatic's own docs site headings go
  from `1.5rem`/600 to the guide scale at weight 400. That is the point
  (alignment for ticket 07), but reviewers should expect the diff in
  rendered output; the plggpress-built guide itself is untouched until 07.
- **Two shells, two breakpoints — do not unify**: `lg` (1024px) gates the
  docs shell, `snap` (900px) gates the example's multi-column strip. They
  are different layouts with different collapse physics; tokenize both,
  merge never (or only when the D10 scheduler makes one of them
  derivable).
- **Line-height units**: the oracle mixes unitless (`1.75`, `1.5`) and the
  token layer should keep them unitless (inheritance-safe); the value-shape
  spec must not force everything into rem.
- **Breakpoints-as-constants is a real constraint, not a style choice** —
  record it prominently; ticket 07's emitter work depends on reaching for
  the TS values, and a future contributor "cleaning up" breakpoints into
  `--pm-*` variables would silently break every media query.
- **Deferred, with revisit triggers**: motion-duration/easing tokens (the
  oracle has exactly two transitions — not enough consumers yet; revisit
  when ticket 07 ports them); radius/shadow stay plgg-view's generic scales
  until a plggmatic component demands themed ones; typography roles beyond
  h1–h4/body (code/caption sizes like the oracle's `0.8em` code badge)
  arrive with ticket 07's real consumers; the hover token's two triggers
  are recorded in step 7.
- **Scope walls**: palette override + `vp-appearance` persistence =
  ticket 04; consuming all of this in plggpress and the `--vp-*` → `--pm-*`
  cutover = ticket 07; syntax-highlight colors = ticket 08. Resist pulling
  any of it forward.
- If ticket 03 lands with a different spelling for the on-base ink
  convention (its step 1 leaves `-base` naming as a drive judgment call),
  the hover derivation prose here must follow its final names — the
  dependency ordering exists precisely so this ticket reads 03's outcome,
  not its draft.

## Final Report

Implemented in commit `8949b37` (feat, code) + this archive commit.

**What Changed**
- New `Style/model/` token modules: `typography.ts`
  (`TypeRole` scale `h1`–`h4`/`body` + exhaustive `Record` of
  `{size,lineHeight,weight,compact}` from the oracle — h1 `1.875rem/1.25/400`
  … body `1rem/1.75/400`; compact sub-`sm` overrides as `Option` (h3 keeps its
  leading → `None`); closed `FontWeight {400,500,600}` with `regular`/`medium`/
  `semibold`; `sansFontStack`), `breakpoint.ts` (`sm`/`snap`/`lg` = 640/900/1024
  as **TS constants** + `minWidth`/`maxWidth` builders, max = min−1px; recorded
  as never-`--pm-*` because `@media` can't resolve `var()`), `metric.ts` (shell
  `shell-max`/`sidebar`/`measure`/`rail` = 1440px/256px/48rem/48px as
  `var()`-consumable `--pm-*` + `metricValue`/`metricVar`), `zIndex.ts`
  (`content`/`chrome`/`backdrop`/`overlay` = 1/30/40/50).
- New `Style/usecase/` emitters: `metricCss.ts` (single scheme-independent
  `:root{--pm-*}` block, escape-safe, no `html.dark`), `reducedMotion.ts`
  (framework-owned `prefers-reduced-motion:reduce` → `scroll-behavior:auto`).
  New atoms in `utilities.ts`: `lineHeight`, tokenized `weight` (shadows
  plgg-view's untyped `weight`), `zIndex`, `typeStyle` (size+leading+weight
  bundle), `measure`.
- Hover/hover-ink DECISION recorded in `Style/model/token.ts` — **derive, no
  token** (`hover:=primary-base`, `hover-ink:=neutral surface`); both revisit
  triggers (palette override; port AA failure) written down; `interaction.ts`'s
  `hoverDim` comment reconciled (component opacity-dim vs theme inverted-pill,
  both stand).
- Consumers migrated: `heading` renders the guide scale (level 1 =
  `1.875rem`/400, was `2xl`/600), `prose` uses `typeStyle("body")` + the
  `measure` metric var, `button` uses `weight(medium)`;
  `plggmatic-example/src/app.ts` drops its `48px`/`900px`/`899px` literals for
  the `rail` metric var + `snap` breakpoint builders, tokenizes the sticky
  header z-index, and injects `metricCss`.
- Barrels (`Style/index.ts`, `styleEntry.ts`) export the whole surface; `weight`
  shadows plgg-view's after the star. Docs: new `site/design-tokens.md` +
  compiling `examples/designTokens.ts` + Foundations sidebar leaf;
  `components/typography.md` updated for the shipped scale. One spec per new
  module + extended `utilities.spec`/`typography.spec`.

**Verification**
- Fresh `scripts/check-all.sh`: **EXIT 0**. plggmatic tsc clean, **83 passed /
  0 failed**, coverage 100/98.28/100/100 gate passed (one dead branch → 98.28,
  > 90); `plggmatic-example` 11 passed / 0 failed; site examples tsc clean;
  **13 pages built** (the new `design-tokens` page) + dead-link check passed.
- Diff confined to `packages/plggmatic/**`, `packages/plggmatic-example/**`,
  `packages/site/**` — no `plgg-view`, `plggpress`, runner-script, or
  dependency diff; no `as`/`any`/`ts-ignore`. All seven acceptance criteria
  hold.

**Discovered Insights**
- **Breakpoints cannot be custom properties** — a `@media` query never resolves
  `var()`. They must stay TS constants consumed by CSS-emitting code; the model
  records this prominently so a future "tidy the breakpoints into `--pm-*`"
  refactor can't silently break every media query.
- **The `measure` var needs its emitter present at render.** Because `prose`'s
  cap became `max-width:var(--pm-measure)`, `metricCss` must be injected
  wherever prose renders or the cap silently no-ops — the example's `appCss`
  now injects it, and ticket 07 must wire it into the guide shell (a real
  runtime dependency, not just aesthetics).
- **Compact leading is `Option`, not a sentinel.** The oracle's `639px` block
  re-states h1/h2 leading but omits h3's, so `CompactType.lineHeight` is
  `Option<SoftStr>` — ticket 07 folds it with `matchOption` to reproduce the
  block byte-for-byte.
- Coverage-line discipline held: the authoritative signal is the
  `N passed, M failed` line + the `sh -eu` success trailer / exit code from a
  FOREGROUND run, not the orthogonal `Coverage gate passed` line.
