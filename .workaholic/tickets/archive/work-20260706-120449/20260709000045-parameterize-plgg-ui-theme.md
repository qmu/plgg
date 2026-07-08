---
created_at: 2026-07-09T00:00:45+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, UX]
effort:
commit_hash: e7c404fb
category: Changed
depends_on: [20260709000044-repoint-plggpress-onto-plgg-ui.md]
mission:
---

# A3 — Parameterize `plgg-ui`'s theme as a typed `Theme`; give plggmatic ownership of the design-language contract (the empty-shell answer)

## Overview

Third step of the extraction (`/trip` `plggmatic-extraction-cut`),
and the answer to the "empty shell" risk. A1/A2 re-homed the engine
and repointed plggpress while keeping `--pm-`/monochrome baked in as
`plgg-ui`'s shipped default. This ticket **parameterizes** that
design language so the *values* stay reachable by plggpress (they
must — plggpress emits `var(--pm-*)` and cannot import plggmatic)
while the design-system **contract, branded default, and
palette-override API** become content the `plggmatic` package
genuinely OWNS. Without this, the extracted `plggmatic` package is a
bare re-export label (empty shell); with it, plggmatic carries real,
versionable design-system substance.

**The mechanism (buildable, no escape hatch, no plggpress→plggmatic
dep):**

- The CSS emitters and color atoms take a typed **closed** `Theme`
  record as an argument instead of closing over module constants:
  `colorVar(theme)(c)`, `schemeCss(theme)`, `metricCss(theme)`,
  `syntaxCss(theme)`, where `Theme = { prefix, palette, metrics,
  typeScale, syntax, zBands, storageKey }` — a domain type, no
  `as`/`any`; a widened or missing field fails `tsc`. ("CSS is
  emitted statically today" is fine — the emitter just receives its
  inputs.)
- `plgg-ui/style` ships a neutral **`defaultTheme`** whose values
  are **set equal to today's monochrome `--pm-*` design language**
  (prefix `"pm"`, `defaultPalette`, `storageKey="vp-appearance"`),
  so plggpress stays **byte-identical** (D3/D16 — no visual
  regression, visitors' theme survives).
- **plggpress passes the theme explicitly** at its composition root
  (`packages/plggpress/src/theme/*`): import `defaultTheme` + the
  emitters from `plgg-ui`/`plgg-ui/style` and call
  `schemeCss(defaultTheme)` etc. **plggpress never imports
  plggmatic.**
- **plggmatic owns the Pragmatic design system:** the `Theme`
  **type** as the palette-override contract, the branded default
  `Theme` instance (the `--pm-*` monochrome design language named &
  versioned as Pragmatic's), and the palette-override API. One set
  of palette bytes (in `plgg-ui`'s `defaultTheme`), re-branded by
  plggmatic — **no duplication**; the invariant holds (plggpress →
  plgg-ui only).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — `Theme` machinery in `plgg-ui/src/Style`; public API via `./style` only (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; the `Theme` is a typed closed record; Prettier printWidth 50 (applies to all code work)
- `workaholic:design` / `policies/sacrificial-architecture.md` — the design-language *values* are the replaceable shell, the token *machinery* the durable core; this ticket makes that boundary explicit
- `workaholic:design` / `policies/vendor-neutrality.md` — parameterizing keeps `plgg-ui` brand-neutral and reusable; plggpress supplies its own theme (may diverge later); one-directional deps preserved
- `workaholic:design` / `policies/modular-monolith-first.md` — this is the substance that stops `../plggmatic` being an empty-shell spin-out; must land before ticket B
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the `Theme` crosses the seam as a domain type; plggpress passes it at its composition root, keeping entry points thin; plggpress EXEMPT status preserved
- `workaholic:implementation` / `policies/type-driven-design.md` — `Theme` is a closed record whose misuse is a compile error; the palette-override API is typed, not `any`-widened (mirrors ticket 04's palette caster)
- `workaholic:implementation` / `policies/test.md` — emitter specs re-parameterized on `Theme`; plggpress theme specs stay green against `defaultTheme`; ≥91% coverage
- `workaholic:operation` / `policies/ci-cd.md` — fresh `scripts/check-all.sh` green after the parameterization
- `workaholic:implementation` / `policies/command-scripts.md` — no new bespoke scripts; runs through the existing runner set

## Trip Origin

`.workaholic/trips/plggmatic-extraction-cut/designs/design-v2.md`
§3 (`--pm-*` = a parameterized `Theme` — the empty-shell answer)
and §4 (cluster-vs-package). This is the correction of design-v1's
"plggmatic owns the values" framing.

## Key Files

- `packages/plgg-ui/src/Style/model/token.ts` — `colorVar` becomes `colorVar(theme)(c)` (prefix from `theme`, not the Meta constant)
- `packages/plgg-ui/src/Style/model/{palette,metric,typography,zIndex,syntax,scheme}.ts` — the value tables become the `palette`/`metrics`/`typeScale`/`zBands`/`syntax` fields of `Theme`; define the `Theme` type + `defaultTheme` (= today's monochrome) here
- `packages/plgg-ui/src/Style/usecase/{schemeCss,metricCss,syntaxCss,chromeCss,reducedMotion,appearanceScript}.ts` — emitters become pure `(theme) => css`
- `packages/plgg-ui/src/Meta/model/identity.ts` — `cssPrefix`/`appearanceStorageKey` become `defaultTheme` fields (the constant may remain as the default's seed)
- `packages/plgg-ui/src/styleEntry.ts` — export `Theme`, `defaultTheme`, and the parameterized emitters/atoms
- `packages/plggpress/src/theme/*` — import `defaultTheme` and pass it to the emitters at the composition root
- `packages/plggmatic/src/*` — own the branded `Theme` instance + palette-override API (re-exporting `plgg-ui`'s `defaultTheme` under the Pragmatic brand); this is the substance that ships to `../plggmatic` in B
- co-located `*.spec.ts` for every touched emitter/atom — re-parameterized on `Theme`

## Related History

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - prior structural move context
- Roadmap D9/D16 + ticket 04 (palette-override-api-and-scheme-persistence) — the palette-override caster this `Theme` contract generalizes

## Implementation Steps

1. Define the closed `Theme` type (`{ prefix, palette, metrics, typeScale, syntax, zBands, storageKey }`) and `defaultTheme` (values = today's monochrome `--pm-*`) in `plgg-ui/src/Style`.
2. Convert `colorVar`/`metricVar` and the CSS emitters (`schemeCss`/`metricCss`/`syntaxCss`/`chromeCss`/`reducedMotion`/`appearanceScript`) to take `theme: Theme`; thread it through — no `as`/`any`, `tsc` proves totality.
3. Re-parameterize the co-located emitter/atom specs on `Theme` (assert `defaultTheme` reproduces today's `--pm-*` output byte-for-byte).
4. Repoint `packages/plggpress/src/theme/*` to import `defaultTheme` and pass it explicitly to the emitters at plggpress's composition root — plggpress never imports plggmatic.
5. Give the `plggmatic` package ownership of the branded `Theme` instance + palette-override API (re-exporting `plgg-ui`'s `defaultTheme` under the Pragmatic brand) — the substance ticket B ships.
6. Run `scripts/check-all.sh` fresh; confirm the guide look is byte-identical (D16) and coverage ≥91%.

## Quality Gate

**Acceptance criteria:**

- The `Theme` type is a closed typed record; the emitters/atoms are pure `(theme) => …`; `plgg-ui/style` exports `Theme` + `defaultTheme`.
- `defaultTheme` reproduces today's `--pm-*` output byte-for-byte; the live guide is visually unchanged; `vp-appearance` preserved (D16).
- plggpress passes the theme explicitly and imports **zero** plggmatic (grep clean, unchanged from A2).
- plggmatic owns the branded `Theme` instance + palette-override API (real design-system content, not a bare label).
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced; no palette-byte duplication.

**Verification method:**

- `scripts/check-all.sh` green (fresh; all gates + build + every `test-*.sh`, ≥91% coverage where enforced).
- Emitter specs assert `defaultTheme` output == the pre-parameterization `--pm-*` CSS.
- Phase-3-style visual check (old vs new guide) confirms no regression.
- Prettier printWidth 50 across changed files.

**Gate:**

- `scripts/check-all.sh` green AND `defaultTheme` output byte-identical AND plggpress→plggmatic still zero AND plggmatic owns the Theme contract AND no escape hatches.

## Considerations

- **Must land before ticket B.** B populates `../plggmatic`; if A3 has not landed, the extracted `plggmatic` package is a bare re-export (empty shell), violating modular-monolith-first. This ticket is the substance.
- Keep the change value-preserving: `defaultTheme` == today's monochrome so plggpress and the guide do not visually change (D3/D16).
- The `Theme` contract generalizes ticket 04's palette-override caster; keep it typed (a caster-validated override), never widened to `any`.
- plggpress's docs-site look is now an explicit theme choice — this is the intended D3 "theme-first" outcome, not a regression.
