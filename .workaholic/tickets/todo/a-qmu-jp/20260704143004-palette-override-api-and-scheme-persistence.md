---
created_at: 2026-07-04T14:30:04+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on: [20260704143003-plggmatic-token-matrix-monochrome-default.md]
---

# Palette override API + plggmatic-owned scheme persistence (`vp-appearance`, no-FOUC, `html.dark`)

## Overview

Phase 1 (Design tokens), ticket **04** of the plggpress/plggmatic roadmap —
implements the **palette-override clause of D9** ("Palette-override API added")
and **D16**'s persistence carve-out ("the theme-persistence localStorage key
`vp-appearance` is preserved so visitors' theme choices survive") from the
approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. Builds directly on
ticket 03 (role×variant token matrix, monochrome default) and prepares ticket
07 (plggpress theme on plggmatic, D3's "theme rewrite first").

Two consumer-facing seams, both currently closed:

1. **Palette is a hardcoded const.** In
   `packages/plggmatic/src/Style/model/token.ts` the literal hexes live in a
   module-private `PALETTE: Record<Scheme, Record<Color, SoftStr>>`, and
   `Style/usecase/schemeCss.ts` bakes them into a module-load-time `schemeCss`
   constant. An app that wants its own brand colors (plggpress themes, the
   future qmu.co.jp) has no way in short of forking the framework. After
   ticket 03 the surface is the full {primary, success, danger, warning, info}
   × {base, text, surface, border} matrix per scheme — this ticket makes that
   whole matrix overridable through a **typed, caster-validated `Palette`**
   value: a branded hex-color model, an `asPalette` caster (config-borne
   `unknown` → `Result`), a palette-parameterized scheme-CSS emitter, and the
   monochrome default exported as `defaultPalette`. Crucially, `colorVar` /
   the color atoms are untouched: everything already resolves through
   `var(--pm-*)` (see `Meta/model/identity.ts`), so an override changes only
   the emitted custom-property values, never a component.

2. **Scheme persistence is app-owned, per app.** Today the no-FOUC script, the
   `prefers-color-scheme` fallback, and the `vp-appearance` localStorage key
   live in `packages/plggpress/src/theme/themeScript.ts` — plggpress private
   code. plggmatic ships only the view (`Component/usecase/themeToggle.ts`),
   whose docblock **records the rule** that applying the `dark` class is "the
   consuming app's `update`/effect seam". That rule makes every future
   consumer (plggmatic-example, site, admin UI, qmu.co.jp) re-implement the
   same script and — worse — free to pick a different storage key, breaking
   D16. This ticket moves the **contract** into plggmatic: one exported
   storage-key constant (`vp-appearance`, preserved verbatim per D16), a
   dependency-free no-FOUC inline head script + escape-boundary injector, a
   pure scheme-decision function (stored choice → else OS
   `prefers-color-scheme`), and a thin apply-and-persist helper that
   `themeToggle` consumers wire their toggle `Msg` to. The `dark` class on
   `<html>` (`html.dark`, already the emitter's selector in
   `Style/model/scheme.ts` / `Style/usecase/schemeCss.ts`) is documented as
   the **single** scheme mechanism — no attribute variants, no per-app
   alternates.

plggpress itself is **not** rewired here — it has no dependency on the new
plggmatic (`packages/plggpress/package.json` lists only `plgg-*` packages) and
its theme moves onto plggmatic wholesale in ticket 07. This ticket instead
proves the contract is a drop-in replacement by asserting behavioral
equivalence with plggpress's existing script (same key, same class, same
fallback order), so 07's swap is mechanical.

## Policies

- `workaholic:design` / `policies/accessibility.md` — the override API is
  exactly the seam where a consumer can undo the WCAG-AA guarantees the
  default palette proves (the policy records accessibility testing as "not
  observed" in the library era; the phase-1 roadmap gate supersedes that with
  a computed AA check). Consequences honored here: the WCAG contrast math is
  extracted from the spec into an exported usecase so override authors can
  compute the same gate over their own palette, and the persistence contract
  defaults to the visitor's OS `prefers-color-scheme` — the inclusive default
  — before any stored choice exists.
- `workaholic:implementation` / `policies/test.md` — >90% coverage across
  statements/branches/functions/lines on touched packages, one spec per
  module, and the "computed — not asserted by eye" gate precedent set by
  `contrast.spec.ts`. The scheme-decision core is kept pure (no DOM, no
  localStorage) precisely so plgg-test can cover the whole decision table
  without a browser environment, keeping the coverage number honest.

## Key Files

- `packages/plggmatic/src/Style/model/token.ts` — the hardcoded `PALETTE`
  const, `colorHex`, `colorVar`; reshaped by ticket 03 into the role×variant
  matrix. This ticket splits palette *data* (movable) from token *vocabulary*
  (fixed).
- `packages/plggmatic/src/Style/model/scheme.ts` — `Scheme` union; already
  documents the one-`dark`-class-on-`<html>` mechanism this ticket promotes to
  the single published contract.
- `packages/plggmatic/src/Style/usecase/schemeCss.ts` — module-load `schemeCss`
  const (`:root{…}html.dark{…}`); becomes palette-parameterized.
- `packages/plggmatic/src/Style/usecase/contrast.spec.ts` — WCAG 2.x
  luminance/contrast math currently inlined in the spec; extract to a usecase
  module the spec consumes (don't clone it).
- `packages/plggmatic/src/Component/usecase/themeToggle.ts` (+ spec) — the
  view-only toggle whose "recorded rule" docblock delegates persistence to the
  app; amend it to point at the new contract.
- `packages/plggmatic/src/Meta/model/identity.ts` — `cssPrefix = "pm"`; the
  var namespace overrides flow through.
- `packages/plggmatic/src/Style/index.ts`, `src/styleEntry.ts`, `src/index.ts`
  — explicit named barrels to extend (house style: no `export *` of new
  modules from the root).
- `packages/plggpress/src/theme/themeScript.ts` (+ `themeScript.spec.ts`) —
  the reference implementation and compatibility oracle: `vp-appearance` read,
  `prefers-color-scheme` fallback, `documentElement.classList.add('dark')`,
  end-of-`</head>` injection after the SSR escaper, idempotent
  missing-tag guard. **Read-only for this ticket** — rewired in ticket 07.
- `packages/plggmatic-example/src/app.ts` (+ `app.spec.ts`) — the proving
  consumer: its toggle currently flips `model.scheme` with no persistence
  (lines ~199–217); wire it to the contract.
- `packages/site/color-scheme.md` + `packages/site/examples/colorScheme.ts` —
  the docs page and its compile-checked twin (`baseColorCss = schemeCss`);
  both gain the override + persistence story.
- `packages/plgg/src/Basics/Str.ts` — the `Box`-brand + `as*` caster pattern
  (`Str`/`asStr`) the new hex-color model must follow.
- `packages/plggmatic/plgg-test.config.json` — plggmatic's coverage gate
  (ticket 02 hardens the defaults; this ticket must stay green under it).

## Related History

The persistence contract has a clear lineage — this ticket promotes an
app-private script to a framework seam, it does not invent one:

- `.workaholic/tickets/archive/work-20260630-013457/20260630100000-plgg-press-theme-dark-mode-and-polish.md`
  — step 5 is the birth of the whole contract in plggpress: the no-FOUC head
  script reading `vp-appearance` else `prefers-color-scheme`, the `dark` class
  on `documentElement`, `injectThemeScripts(html)`, and the "no `</script`
  sequence" rule. Today's `themeScript.ts` is that step, verbatim in spirit.
- `.workaholic/tickets/archive/work-20260703-050355/20260703052717-plggpress-reconcile-tokens-a11y-qmu-oracle.md`
  — the AA-reconciliation precedent for token values; and
  `…/20260703114826-svg-sun-moon-icons-oracle-port.md` — the sun/moon icons
  later ported into plggmatic's `themeToggle` (its docblock still credits the
  navBar port).
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  — the absorb that retired the *old* plggmatic (app-framework facade).
  Caution: "plggmatic" there means the facade, not today's UI design
  framework; queued sibling ticket
  `20260704143001-cleanup-plgg-press-remnant-and-canonical-manifests.md` adds
  the disambiguation note.
- Commit `6d7a832` imported the new plggmatic (+ `site`, `plggmatic-example`).
  Its `token.ts`/`schemeCss.ts` comments cite tickets `20260703144035`
  (pane) / `20260703144036` (components) from the **standalone repo's**
  archive — they are not under this repo's `.workaholic/tickets/archive/` and
  cannot be linked here.
- Queued siblings: `20260704143002-harden-coverage-gate-defaults.md`
  (coverage-gate hardening this ticket runs under) and the direct dependency
  `20260704143003-plggmatic-token-matrix-monochrome-default.md` (D9 matrix
  this ticket makes overridable).

Wiring note: no new package is created — `plggmatic`, `plggmatic-example`,
and `site` are already in `scripts/npm-install.sh`, `scripts/build.sh` (exact
`cd $REPO_ROOT/packages/<name> && npm run build` lines), and
`scripts/check-all.sh`. Runner scripts must not change.

## Implementation Steps

1. **Branded hex model** — `packages/plggmatic/src/Style/model/hexColor.ts`:
   `HexColor` as a plgg `Box` brand over `string` with an `asHexColor` caster
   (`unknown` → `Result<HexColor, …>`) following `plgg/Basics/Str.ts`. Accept
   exactly `#rrggbb` (6 hex digits, case-insensitive input normalized to
   lowercase); reject everything else with the offending value in the error.
   No `as`/`any` — the brand is minted only through the caster.
2. **Palette model** — `packages/plggmatic/src/Style/model/palette.ts`:
   `type Palette = Record<Scheme, Record<C, HexColor>>` where `C` is ticket
   03's matrix token union (import it; do not re-declare). Move the monochrome
   default out of `token.ts`'s private `PALETTE` into an exported
   `defaultPalette: Palette`. Add `asPalette` (`unknown` → `Result<Palette, …>`)
   that iterates `schemes` × the token array exhaustively — a missing scheme,
   a missing token, an extra key, or a bad hex is an `Err` naming the failing
   path (e.g. `dark.danger-border`). Casters compose from plgg's vocabulary;
   exhaustiveness rides the same array-mirrors-union specs ticket 03 keeps.
3. **Parameterize the emitters** — `Style/usecase/schemeCss.ts`: add
   `schemeCssOf(palette: Palette): SoftStr` producing the same
   `:root{…}html.dark{…}` shape from any palette; keep `schemeCss` exported as
   exactly `schemeCssOf(defaultPalette)` so zero-config consumers are
   untouched. Rework `colorHex` in `token.ts` to read from `defaultPalette`
   (or take a palette parameter — breaking change acceptable; pick the
   cleaner signature and migrate the two in-repo call sites,
   `contrast.spec.ts` and `site/examples/colorScheme.ts`). `colorVar` and
   every color atom in `Style/usecase/utilities.ts` stay byte-identical —
   overrides must never reach components.
4. **Export the contrast math** — new
   `packages/plggmatic/src/Style/usecase/contrast.ts` housing the
   luminance/contrast-ratio functions currently inlined in
   `contrast.spec.ts`; the spec imports them (don't clone garbage). Public
   surface: `contrastRatio(a: HexColor, b: HexColor): number` (WCAG 2.x
   formula), so an app can run the same AA audit over its override palette.
5. **Appearance contract** — new `Style` appearance module (model + usecase,
   e.g. `Style/model/appearance.ts` / `Style/usecase/appearanceScript.ts`):
   - `appearanceStorageKey` = `"vp-appearance"` — ONE constant, with a
     docblock citing D16: the key predates plggmatic (plggpress, `20260630`)
     and is preserved so existing visitors keep their choice; it deliberately
     does NOT follow the `--pm-*` rename.
   - Pure decision core `decideScheme(stored: Option<SoftStr>,
     prefersDark: boolean): Scheme` — stored `"dark"`/`"light"` wins; unknown
     or absent falls back to `prefersDark`. The whole table is spec-coverable
     without a DOM.
   - `appearanceInitScript: SoftStr` — the dependency-free inline `<script>`
     mirroring plggpress's `HEAD_SCRIPT` behavior byte-for-byte in effect:
     read `appearanceStorageKey`, fall back to
     `matchMedia('(prefers-color-scheme: dark)')`, add `dark` to
     `document.documentElement.classList`, all in a `try{}catch{}`. Must
     contain no `</script` inner sequence and must be injected AFTER the SSR
     escaper (same reasoning as plggpress's injector — document it).
   - `injectAppearanceScript(html: SoftStr): SoftStr` — inserts the script
     before `</head>`; a page without `</head>` passes through unchanged
     (idempotent guard, per the plggpress precedent).
   - `applyScheme(scheme: Scheme, …): void` — the toggle-side helper: set or
     remove the `dark` class and persist under `appearanceStorageKey`,
     swallowing storage failures (private mode). Take the document/storage
     collaborators as narrow structural parameters (classList-bearing root +
     get/setItem carrier) so specs drive it with in-memory fakes — no DOM
     environment, no `as`.
6. **Amend the recorded rule** — update `themeToggle.ts`'s docblock: the
   component stays a pure view emitting `toggle: Msg`, but the persistence
   seam is now framework-owned — point to `applyScheme` /
   `appearanceStorageKey` / `appearanceInitScript` instead of "the consuming
   app's `update`/effect seam". Update `scheme.ts` prose to name `html.dark`
   as the single published mechanism.
7. **Prove it in plggmatic-example** — `packages/plggmatic-example/src/app.ts`:
   initialize `model.scheme` from the contract (stored choice, else
   `prefers-color-scheme`) and call `applyScheme` where the toggle `Msg` is
   handled, keeping the `.ex-light`/`.ex-dark` scoped preview blocks as-is.
   Extend `app.spec.ts` accordingly (fakes, not a browser).
8. **Barrels + docs** — export the new names (`HexColor`, `asHexColor`,
   `Palette`, `asPalette`, `defaultPalette`, `schemeCssOf`, `contrastRatio`,
   `appearanceStorageKey`, `decideScheme`, `appearanceInitScript`,
   `injectAppearanceScript`, `applyScheme`) through `Style/index.ts` and the
   `plggmatic/style` subpath (`styleEntry.ts`); root barrel only where it
   doesn't collide. Extend `packages/site/color-scheme.md` + its twin
   `examples/colorScheme.ts` with an override snippet
   (`schemeCssOf` over an `asPalette`-validated palette) and the persistence
   contract; add a short README section documenting `html.dark` +
   `vp-appearance` as THE contract.
9. **Specs + house rules** — one spec per new module: `asHexColor`
   (accept/normalize/reject), `asPalette` (round-trips `defaultPalette`;
   rejects missing scheme/token, extra key, bad hex — with path), `schemeCssOf`
   (custom palette's hexes appear for every `--pm-*` token in both blocks;
   `schemeCss === schemeCssOf(defaultPalette)`), `decideScheme` (full 2×3
   table), `appearanceInitScript`/`injectAppearanceScript` (key present,
   `prefers-color-scheme` present, `dark` class target, no `</script`,
   missing-`</head>` passthrough), `applyScheme` (fake doc/storage; storage
   throw swallowed). No `as`/`any`/`ts-ignore`; Option/Result/exhaustive
   `match` per `plgg-coding-style`; Prettier `printWidth: 50`; zero new
   dependencies; no runner-script changes.

## Quality Gate

**Acceptance criteria**

1. **Override API is total and typed:** `asPalette` accepts a full-matrix
   input and rejects a missing scheme, a missing token, an extra key, and a
   malformed hex — each `Err` naming the failing path; `HexColor` is only
   mintable through `asHexColor`. `grep -rn "as \|as$" ` style escape hatches:
   zero `as`/`any`/`ts-ignore` in the diff.
2. **Override reaches paint, default unchanged:** a spec feeds `schemeCssOf` a
   palette differing from `defaultPalette` in every slot and asserts every
   `--pm-*` declaration in both the `:root` and `html.dark` blocks carries the
   override; `schemeCss` is byte-identical to `schemeCssOf(defaultPalette)`.
   No component/atom file changes for the override path (`colorVar` and
   `utilities.ts` diffs empty except comments, if any).
3. **D16 held:** `appearanceStorageKey === "vp-appearance"` asserted in a
   spec; `decideScheme` matches plggpress's `HEAD_SCRIPT` decision table
   (stored `dark` → dark, stored `light` → light, absent/unknown → OS
   preference); `appearanceInitScript` contains the key, the
   `prefers-color-scheme` query, and targets `documentElement` with the
   `dark` class; contains no `</script` inner sequence;
   `injectAppearanceScript` leaves a `</head>`-less page unchanged.
4. **Toggle wired at a real consumer:** plggmatic-example initializes from and
   persists through the contract; its spec exercises toggle → `applyScheme`
   with fakes, including the storage-throws branch.
5. **AA gate recomputed:** `contrast.spec.ts` consumes the extracted
   `contrastRatio` and re-verifies every role×variant text/surface pairing of
   `defaultPalette` at ≥ 4.5:1 in BOTH schemes (the phase-1 roadmap gate).
6. **Scope held:** `packages/plggpress/` diff is empty (no plggmatic dep
   added — that is ticket 07); runner scripts (`npm-install.sh`, `build.sh`,
   `check-all.sh`) untouched; `git diff --stat` confined to `plggmatic`,
   `plggmatic-example`, `site`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `packages/plggmatic` test script green
(`tsc --noEmit && plgg-test src`); then a **fresh** `scripts/check-all.sh`
(clean rebuild — stale dists must not mask type drift in `plggmatic-example`
and `site`, both of which compile against the changed barrels) green
end-to-end, with plggmatic coverage >90% across
statements/branches/functions/lines under `plgg-test.config.json`. Paste the
output of `grep -rn "vp-appearance" packages/plggmatic/src` (the constant, its
docblock, and specs only) and `git diff --stat`.

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green with coverage above threshold. Any escape hatch (`as`/`any`/
`ts-ignore`), any new dependency, any plggpress or runner-script diff, or any
AA pairing below 4.5:1 in `defaultPalette` fails the ticket.

## Considerations

- **Ticket 03 concurrency:** the exact matrix token union (names, arrays) is
  03's deliverable; implement `Palette` against what 03 lands, not against
  today's 8-role union in `token.ts`. If 03 slips or reshapes, this ticket
  rebases — do not fork the vocabulary.
- **Casters validate shape, not taste:** `asPalette` must NOT reject a
  low-contrast palette — a brand override is the app's deliberate choice. The
  AA gate binds only the shipped `defaultPalette`; `contrastRatio` is exported
  as an advisory audit. Revisit (e.g. a `Result`-returning `auditPalette`
  helper) if a real consumer ships an inaccessible override.
- **Effects land later (ticket 06, D2):** `applyScheme` is a plain
  side-effecting helper called at the app's effect seam today. When plgg-view
  gains `Cmd`/`Sub`, wrap it as a `Cmd` there — keep this adapter thin so the
  wrap is mechanical. Cross-tab scheme sync (`storage` events) is deferred to
  the same era (a natural `Sub`).
- **plggpress adoption is ticket 07:** the `--vp-*` → `--pm-*` CSS-variable
  cutover and the deletion of `plggpress/src/theme/themeScript.ts` in favor of
  this contract happen with the theme rewrite. Per D16 only the *storage key*
  survives the migration; CSS variable names do not.
- **secondary/tertiary tier (D9, deferred):** when a consumer earns the
  7-color tier, the token union grows in ticket 03's one place and `Palette` /
  `asPalette` / `schemeCssOf` follow exhaustively — this ticket must add no
  second enumeration site.
- **Where overrides come from is out of scope:** plumbing a palette from
  plggpress `site.config.ts` (or any app config) into `schemeCssOf` belongs to
  the consumer tickets (07 onward); this ticket ships the seam, validated at
  the boundary, not the plumbing.
- **localStorage failures are silent by design** (private mode, blocked
  storage) — matching the plggpress precedent; the page still schemes from
  `prefers-color-scheme`.
