---
created_at: 2026-07-04T14:30:08+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260704143007-plggpress-theme-on-plggmatic.md]
---

# Tokenize syntax-highlight colors: `tok-*` hues move from plggpress `baseCss` into plggmatic's token layer

## Overview

Phase 3 (Theme rewrite), ticket **08** of the plggpress/plggmatic roadmap —
finishes the theme rewrite ordered by **D3** ("tokens → port plggpress theme
onto plggmatic → prove on the live guide") by pulling the last hardcoded color
family out of the plggpress theme: the syntax-highlight hues. It extends the
**D9** token layer with a syntax-token group and completes the **D16** cutover
for code blocks (the `tok-*` rules are the only colors in
`plggpress/src/theme/baseCss.ts` that reference no custom property at all —
they are below even the `--vp-*` tier). Decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Today the seam is half built. plgg-highlight is deliberately color-free: its
`tokenClass` (`packages/plgg-highlight/src/Render/usecase/highlight.ts`)
exhaustively `match`es the nine `TokenKind`s onto semantic `tok-<kind>`
classes and emits **no inline color**, precisely so a theme can repaint code
per scheme (commit `2a0d83a` established this after the dark-mode-flat-colors
bug). But the consuming end never became tokens: plggpress `baseCss.ts` lines
473–489 hardcode fourteen GitHub-palette hexes (`#cf222e`, `#0a3069`, … light;
`#ff7b72`, `#a5d6ff`, … dark) as `.vp-doc .tok-*` / `html.dark .vp-doc .tok-*`
rules. Those hexes bypass the `--pm-*` custom-property system entirely, so
ticket 04's palette-override API cannot reach code blocks, and any second
plggmatic consumer would have to copy-paste the block to get highlighted code
at all.

This ticket moves the *colors* — not the classes — into plggmatic's Style
layer:

1. **A closed syntax vocabulary in plggmatic.** A `SyntaxKind` union of the
   seven colored kinds (`keyword`, `string`, `number`, `comment`, `regex`,
   `template`, `punctuation`) with a per-scheme
   `Record<Scheme, Record<SyntaxKind, …>>` palette, mirroring
   `Style/model/token.ts`'s exhaustive-twice-over shape. `identifier` and
   `plain` are deliberately **absent**: they inherit the code block's default
   ink (the current behavior, kept on purpose).
2. **Emission as `--pm-code-*` custom properties + one `tok-*` rule block.**
   The scheme emitter grows `--pm-code-<kind>` variables per scheme, and
   plggmatic ships the class rules
   (`.tok-keyword{color:var(--pm-code-keyword)}` …, `.tok-comment` keeping its
   `font-style:italic`) so any plggmatic consumer gets themed code blocks for
   free.
3. **plggpress deletes its hardcoded block** and relies on the plggmatic
   rules, exactly as ticket 07 did for the chrome colors.

The `tok-*` class names remain the **only** seam between plgg-highlight and
the design system: plggmatic does NOT gain a dependency on plgg-highlight
(its deps stay `plgg` + `plgg-view`), and plgg-highlight does not learn about
plggmatic. The name agreement is pinned by a cross-package spec in plggpress —
the one package that (after ticket 07) depends on both.

Default values follow the oracle discipline: adopt the shipped GitHub-palette
hexes as the initial token values, then let the computed contrast spec — not
taste — force any adjustment (the light `comment` gray `#6e7781` is expected
to fail 4.5:1 on `surface-2 #f6f6f7`; darken minimally and record the
deviation, the same move ticket 03's precedent made for `muted`).

Zero new dependencies; no runner-script changes (all touched packages are
already wired into `scripts/npm-install.sh` / `build.sh` / `check-all.sh` —
this ticket adds no package, so those files must not change).

## Policies

- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility testing as "not observed / not applicable (no UI
  components)"; that predates plggmatic. The computed WCAG 2.2 AA gate in
  `contrast.spec.ts` is this repo's executable accessibility practice; this
  ticket extends it to syntax hues on the code-block surface in both schemes,
  closing the last color family that ships with no contrast evidence at all.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer and `as`/`any`/`ts-ignore` are prohibited;
  the design leans on it: `SyntaxKind` is a closed union so an unknown kind is
  a compile error, and the `Record<Scheme, Record<SyntaxKind, …>>` palette
  shape makes a missing hue a `tsc` error. Prettier `printWidth: 50` governs
  every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is enforced per
  package; `plggmatic`, `plgg-highlight`, and `plggpress` all gate at
  threshold 90 in their `plgg-test.config.json`, so the new model/emitter
  surface and the deleted baseCss block must keep all three above it.

## Key Files

- `packages/plggpress/src/theme/baseCss.ts` — lines 473–489: the fourteen
  hardcoded `tok-*` hex rules (plus the comment saying they are "themed here")
  to delete; the values are the oracle for the new palette. Note this file is
  reshaped by ticket 07 first — take the block as it exists after that port.
- `packages/plggpress/src/theme/baseCss.spec.ts` — theme spec to update; home
  (or sibling) of the new cross-package seam spec.
- `packages/plggmatic/src/Style/model/token.ts` — the pattern to mirror:
  closed union + `colors` array + exhaustive `PALETTE` + `colorHex`/`colorVar`
  (reworked into the D9 matrix by ticket 03). The syntax group is a *sibling*
  model, not new members of `Color` — `bg("code-keyword")` must stay
  meaningless.
- `packages/plggmatic/src/Style/model/scheme.ts` — `Scheme`/`schemes`
  (light/dark), iterated by palette and specs; unchanged.
- `packages/plggmatic/src/Style/usecase/schemeCss.ts` — the custom-property
  emitter whose output grows the `--pm-code-*` declarations (or gains a
  sibling emitter appended to it); its escape-safety note (no `<`, `>`, `&`)
  binds the new CSS too.
- `packages/plggmatic/src/Style/usecase/contrast.spec.ts` — the computed WCAG
  luminance/ratio math to reuse for the syntax pairings.
- `packages/plggmatic/src/Style/index.ts`, `packages/plggmatic/src/styleEntry.ts`
  — explicit barrels; export the new names.
- `packages/plggmatic/src/Meta/model/identity.ts` — `cssPrefix = "pm"`; the
  `--pm-code-*` namespace derives from it, never hand-written.
- `packages/plgg-highlight/src/Render/usecase/highlight.ts` — `tokenClass`
  (lines 45–62), the single token-class authority; code untouched, but its
  doc comment still says colors live in "the consuming theme's stylesheet
  (plggpress `baseCss`)" — repoint it at plggmatic's Style layer.
- `packages/plgg-highlight/src/Token/model/Token.ts` — the nine `TokenKind`
  variants and their `<kind>$` guards, imported by the seam spec.
- `packages/site/color-scheme.md` (+ `packages/site/examples/colorScheme.ts`)
  — the token-layer docs page; gains the syntax-token section and its measured
  ratios.
- `packages/plggmatic/plgg-test.config.json`,
  `packages/plgg-highlight/plgg-test.config.json`,
  `packages/plggpress/plgg-test.config.json` — threshold 90; unchanged, cited
  by the gate.

## Related History

- `.workaholic/tickets/archive/work-20260630-013457/20260630100000-plgg-press-theme-dark-mode-and-polish.md`
  (story `.workaholic/stories/work-20260630-013457.md`) — recorded the
  original limitation: plgg-highlight emitted inline light-only colors, so
  code did not re-theme in dark mode; "a dark syntax palette is a later
  enhancement". Commit `2a0d83a` ("Fix syntax highlighting in dark mode:
  theme tokens via classes, not inline colours") then created the `tok-*`
  class seam and parked the colors in plggpress `baseCss` — this ticket is the
  final step of that arc: classes stayed semantic, now the colors become
  tokens.
- `.workaholic/tickets/archive/work-20260704-015006/20260704015134-migrate-plgg-highlight-to-plgg-parser.md`
  (story `.workaholic/stories/work-20260704-015006.md`) — replaced the
  tokenizer under the same nine-variant `TokenKind` contract; evidence the
  kind taxonomy is stable enough to pin a design-system vocabulary to.
- `.workaholic/tickets/archive/work-20260701-185044/20260701211839-plgg-press-tokens-typography-match-qmu.md`
  — the oracle-port discipline (adopt shipped values exactly, record every
  deviation) this ticket applies to the GitHub-palette hexes.
- Sibling roadmap tickets (same todo queue): 03
  `20260704143003-plggmatic-token-matrix-monochrome-default.md` establishes
  the model/emitter/contrast-spec patterns being mirrored (and fixes
  `surface-2` — the code-block background — at `#f6f6f7`/`#202127`, the exact
  surfaces the syntax hues must clear); 04 adds the palette-override API this
  ticket must not be invisible to; 07 (this ticket's dependency) ports the
  plggpress theme onto `--pm-*` and wires plggmatic's emitted CSS into the
  guide's stylesheet pipeline.

## Implementation Steps

1. **Model the syntax vocabulary** in a new
   `packages/plggmatic/src/Style/model/syntax.ts`: export
   `type SyntaxKind = "keyword" | "string" | "number" | "comment" | "regex" | "template" | "punctuation"`,
   a `syntaxKinds: ReadonlyArray<SyntaxKind>` array (kept honest by the same
   compile-time exhaustiveness pin `token.spec.ts` uses), and a
   `Record<Scheme, Record<SyntaxKind, …>>` palette seeded with the baseCss
   oracle values (light: `#cf222e`, `#0a3069`, `#0550ae`, `#6e7781`,
   `#116329`, `#0a3069`, `#57606a`; dark: `#ff7b72`, `#a5d6ff`, `#79c0ff`,
   `#8b949e`, `#7ee787`, `#a5d6ff`, `#c9d1d9`). Export `syntaxHex(scheme, k)`
   and `syntaxVar(k)` (→ `var(--pm-code-<kind>)`, prefix from `cssPrefix`).
   Document in the header WHY `identifier`/`plain` are absent (inherit the
   default code ink) and that the kind names are a **pinned contract** with
   plgg-highlight's `tok-<kind>` classes — plggmatic must not import
   plgg-highlight to learn them.
2. **Emit the variables and the class rules.** Extend
   `Style/usecase/schemeCss.ts` (or add a sibling
   `Style/usecase/syntaxCss.ts` composed after it — drive's call) so that:
   the light/dark blocks additionally declare every `--pm-code-<kind>`; and a
   static rule block maps each class —
   `.tok-<kind>{color:var(--pm-code-<kind>)}` for all seven, with
   `.tok-comment` also carrying `font-style:italic`. Rules are deliberately
   **unscoped** (no `.vp-doc`): `tok-*` classes only ever appear on
   plgg-highlight's spans, and unscoped rules are what make the block
   consumer-agnostic. No rule may mention `tok-identifier` or `tok-plain`.
   Keep the whole output escape-safe (no `<`, `>`, `&`). Export through
   `Style/index.ts` and `styleEntry.ts`.
3. **Delete the hardcoded block in plggpress**: remove the fourteen `tok-*`
   rules (and their "themed here" comment) from
   `packages/plggpress/src/theme/baseCss.ts`, and confirm the plggmatic-emitted
   CSS (wired in by ticket 07) now carries the rules into every built page —
   dev server and SSG output both. Update `baseCss.spec.ts` expectations.
4. **Pin the seam with a cross-package spec** in plggpress (it depends on both
   sides): drive `asHighlighter()` (or `tokenize` + `tokenClass` via
   `highlightTs`) over a fixture snippet exercising all nine `TokenKind`s,
   collect the emitted `tok-*` classes, and assert (a) every `SyntaxKind` in
   `syntaxKinds` appears among them as `tok-<kind>`, and (b) the only emitted
   classes plggmatic leaves unthemed are exactly `tok-identifier` and
   `tok-plain`. A rename on either side of the seam now fails a test instead
   of silently shipping uncolored code.
5. **Extend the contrast gate.** Reusing `contrast.spec.ts`'s computed WCAG
   math, assert every `SyntaxKind` hue ≥ 4.5:1 against the code-block
   background `surface-2` in its scheme (both schemes, 14 pairings), derived
   from `syntaxKinds` so a future kind auto-extends the gate. Where an oracle
   hex fails — light `comment #6e7781` on `#f6f6f7` is the expected offender —
   darken/lighten minimally until the spec passes and record the deviation in
   the palette comment (ticket 03's `muted` precedent). The spec, not this
   ticket, is the arbiter of final values.
6. **Repoint the plgg-highlight doc comment**: `tokenClass`'s JSDoc in
   `Render/usecase/highlight.ts` (and the sibling note on `tokenToHtml`) says
   the colors live in plggpress `baseCss` — update to name plggmatic's Style
   layer as the color authority and the `tok-*` classes as the contract. No
   behavior change in this package.
7. **Coordinate with ticket 04's override API**: syntax tokens must be part of
   the palette-override surface (a consumer overriding `primary` should be
   able to override `keyword` the same way). If 04 has landed, extend its
   override type to cover `SyntaxKind`; if not, leave the model shaped so 04
   picks it up (`Record`-based palette, exported kind array) and record the
   handoff in that ticket's queue file if an edit is needed.
8. **Document**: add a syntax-token section to `packages/site/color-scheme.md`
   — the seven kinds, both schemes' values, the inherit rule for
   identifier/plain, the pinned-contract note, and measured ratios computed
   from the final palette. Keep `packages/site/examples/colorScheme.ts`
   compiling and in lockstep if it gains a syntax example.
9. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result and
   exhaustive `match` where control flow appears (`plgg-coding-style`);
   Prettier `printWidth: 50`; zero new dependencies (plggmatic's deps stay
   `plgg` + `plgg-view`); no changes to `scripts/npm-install.sh` /
   `scripts/build.sh` / `scripts/check-all.sh`.

## Quality Gate

**Acceptance criteria**

1. `grep -n "tok-" packages/plggpress/src/theme/baseCss.ts` returns **0**
   matches, and no literal syntax hex (`#cf222e` etc.) survives anywhere in
   `plggpress/src`; the only place syntax colors are defined is plggmatic's
   syntax palette.
2. plggmatic emits, per scheme, a `--pm-code-<kind>` custom property for every
   `SyntaxKind`, plus unscoped `.tok-<kind>{color:var(--pm-code-<kind>)}`
   rules (comment also italic); no rule or variable exists for `identifier`
   or `plain`; the emitted CSS is escape-safe. `SyntaxKind` is closed —
   `syntaxVar("blurple")` is a compile error — and plggmatic's `package.json`
   still depends only on `plgg` + `plgg-view`.
3. The cross-package seam spec in plggpress passes: all seven themed kinds
   round-trip from `tokenize` output to plggmatic's rule block by class name,
   and exactly `tok-identifier`/`tok-plain` are unthemed.
4. The contrast spec covers all 14 syntax pairings (7 kinds × 2 schemes)
   against `surface-2` at ≥ 4.5:1 and passes; every deviation from the
   GitHub-palette oracle is recorded in the palette comment.
5. A built guide page containing a highlighted code block shows per-kind
   colors in BOTH schemes (light and `html.dark`), sourced from
   `var(--pm-code-*)` — verified on the rendered output, not just the CSS
   string.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plggmatic.sh`,
`./scripts/test-plgg-highlight.sh`, and `./scripts/test-plggpress.sh` green;
then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not
mask drift between the three packages) green end to end, with plggmatic,
plgg-highlight, and plggpress coverage above their configured 90 thresholds
across statements/branches/functions/lines. For criterion 5, build the guide
(`npx plggpress build` or the dev server per ticket 07's wiring) and inspect a
code-bearing page in both schemes; this feeds the phase-3 Playwright
side-by-side visual gate, where code blocks must differ from the old guide
only by the contrast-forced hue adjustments recorded in step 5.

**Gate**

All five acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green AND the contrast spec demonstrably covers every kind×scheme pairing.
A single unthemed kind, surviving hardcoded hex, failing pairing, coverage
dip, escape hatch, new dependency, or runner-script diff fails the ticket.

## Considerations

- **The seam is nominal, by design.** plggmatic pins the seven kind names
  without importing plgg-highlight; the plggpress spec (step 4) is the only
  executable link. If a tenth `TokenKind` is ever added, plgg-highlight's
  exhaustive `match` forces a class, and the seam spec fails until plggmatic
  either themes it or the unthemed-set assertion is consciously widened —
  that friction is the feature.
- **Contrast-forced deviations from the GitHub oracle** (expected: light
  `comment`, possibly light `keyword`/`punctuation` on `surface-2`) slightly
  change code-block appearance versus the live guide. Acceptable — the
  phase-3 visual-regression gate should list them as the only expected
  code-block diffs, mirroring how ticket 03 records its alpha-flattening
  divergence.
- **Punctuation vs the neutral scale**: `punctuation` (`#57606a`/`#c9d1d9`)
  is close to the neutral `muted` ink. Drive may alias it to the neutral
  token instead of an independent hue if the contrast spec allows — a values
  decision, not a shape decision; the `SyntaxKind` slot stays either way.
- **Scope walls**: the override API itself is ticket 04 (this ticket only
  keeps syntax tokens reachable by it); scheduler-era component styling is
  phase 4; a second syntax *language* palette (kinds beyond the TS scanner
  set) has no consumer and is not modeled. Resist pulling any of it forward.
- **Revisit triggers**: a second highlighter language earning new kinds; a
  consumer wanting per-block theme overrides (e.g. diff blocks); ticket 04
  shipping an override shape that cannot express `Record<SyntaxKind, …>` —
  any of these reopens the syntax-model file, none reopens the seam.
