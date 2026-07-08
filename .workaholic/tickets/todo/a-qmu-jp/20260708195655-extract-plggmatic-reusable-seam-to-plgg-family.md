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

# Extract plggmatic's plggpress-consumed seam into shared plgg-family packages (plggpress stops depending on plggmatic)

## Overview

Foundation of the plggmatic extraction. Today `plggpress` depends on `plggmatic` through two distinct surfaces, and this ticket re-homes both into **new plgg-family packages that stay published in the plgg monorepo**, so that `plggpress` (which stays) and the soon-to-be-extracted `plggmatic` both depend on those plgg-family packages instead of `plggpress → plggmatic` directly. This is the "changing design and concerns" core the developer asked for, and it is the prerequisite that lets plggmatic leave the monorepo (tickets B/C) without breaking plggpress.

The two consumed surfaces (from discovery):

1. **Theme / token / scheme / appearance surface** — imported by `packages/plggpress/src/theme/*` from `plggmatic/style` and `plggmatic` (`colorVar`/`metricVar`/`schemeCss`/`metricCss`, `Scheme`/`Color`/`Metric`, `appearanceStorageKey`/`injectAppearanceScript`, `syntaxKinds`/`syntaxCss`, `maxWidth`/`minWidth`, `themeToggle`/`staticThemeToggle`/`themeToggleClass`/`themeToggleCss`). Note `plggmatic/style` already re-exports `plgg-view/style` and shadows its color atoms with scheme-aware `--pm-*` versions — the base tokens may fold into `plgg-view/style`, the scheme/appearance/theme-toggle layer into a new plgg-family package.
2. **Declare → Schedule → Render UI runtime** — imported by `packages/plggpress/src/Admin/*` from `plggmatic` (`Declaration`/`Path`/`SchedulerMsg`, `declare`/`menu`/`menuEntry`/`collection`/`action`/`confirm`/`loaded`/`async`/`query`/`makeRow`/`field`, and the SSR render/deliver functions). This is the "scheduler consumer" TEA engine; re-homing it means extracting the whole `Declare`/`Schedule`/`Render`/`Form` (+ the `Layout`/`Component` it renders through) engine, not just leaf components.

**Design decision to settle first (load-bearing):** where exactly to cut between the reusable plgg-family engine/theme packages and the plggmatic-branded remainder (design-token *values*, identity, showcase). The reusable engine is what plggpress needs; the plggmatic-specific design layer is what ships to `../plggmatic` in ticket B. Reconcile the cut against the recorded roadmap (`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`, D1–D16) before rewiring. If the cut proves genuinely uncertain, stop and escalate for a `/trip` design pass rather than guessing.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — new packages land under `packages/` one dir each; public API through root `src/index.ts` only (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; TS feature discipline; per-package `model/service/dependency` layout (applies to all code work)
- `workaholic:implementation` / `policies/domain-layer-separation.md` — plggpress entry points stay thin; the plgg-family seam exchanges only primitives, domain, or plgg types; keep plggpress's vendor-boundary EXEMPT status, don't regress it
- `workaholic:implementation` / `policies/type-driven-design.md` — the new package boundaries expose rich domain types (Scheme, Declaration, Row…), not widened primitives, so a mismatch surfaces at compile time
- `workaholic:design` / `policies/sacrificial-architecture.md` — draw the new plgg-family package boundaries along rebuildable units; record the rebuild rationale
- `workaholic:design` / `policies/vendor-neutrality.md` — plgg-family packages are domain vocabulary (not vendors), so no anti-corruption wrapper is required; keep the dependency one-directional (plggpress → plgg-family, never reverse)
- `workaholic:implementation` / `policies/test.md` — the existing `plggpress/src/theme/*.spec.ts` and `src/Admin/*.spec.ts` must stay green against the re-homed imports; >90% coverage holds

## Key Files

- `packages/plggmatic/src/index.ts` — the barrel enumerating both surfaces (Layout/Component/Form + Declare/Schedule/Render); source of what to extract
- `packages/plggmatic/src/styleEntry.ts` — the `plggmatic/style` subpath (tokens/scheme/appearance/theme-toggle); source of the theme surface
- `packages/plggmatic/src/{Declare,Schedule,Render,Form,Layout,Component,Style,Meta}/` — the engine + theme trees to partition into plgg-family vs plggmatic-branded
- `packages/plggpress/src/theme/{baseCss,shell,navBar,appearanceScripts}.ts` + `syntaxSeam.spec.ts` — consumer #1 (theme surface) to repoint
- `packages/plggpress/src/Admin/{adminDeclaration,deliverAdmin}.ts` + `adminRender.spec.ts` — consumer #2 (runtime surface) to repoint
- `packages/plggpress/package.json` — drop the `file:../plggmatic` dep; add the new plgg-family package deps
- `packages/plggmatic/package.json` — plggmatic now depends on the new plgg-family engine/theme packages
- `scripts/build.sh` — new packages need dependency-ordered `cd` lines (before plggpress and plggmatic); publish order + guide provisioning are sed-derived from here
- `.workaholic/constraints/architecture.md` — adding packages is a "Review trigger" for dependency direction + the vendor-boundary table; update the audit
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — D1–D16 decisions governing the plggpress/plggmatic relationship; reconcile the cut against them

## Related History

The name `plggmatic` was reused: an earlier facade plggmatic was absorbed into plggpress and moved to its own repo; the current plggmatic (a design/scheduler framework) was then scaffolded and re-added as a plggpress dependency. This ticket unwinds that re-added edge, mirroring the earlier absorb pattern.

- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the reverse precedent: removed the prior plggmatic and rewired plggpress onto real plgg-* packages with a symbol→package rewire map (reuse the template)
- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - created the current plggpress→plggmatic edge this ticket severs; its Final Report lists every consumed symbol
- [20260704143001-cleanup-plgg-press-remnant-and-canonical-manifests.md](.workaholic/tickets/archive/work-20260704-130317/20260704143001-cleanup-plgg-press-remnant-and-canonical-manifests.md) - manifest/naming hygiene relevant when adding packages

## Implementation Steps

1. **Settle the cut.** Read `plggmatic/src/index.ts` + `styleEntry.ts` and the plggpress consumers; decide the exact partition: (theme/scheme/appearance/theme-toggle) → base tokens fold into `plgg-view/style` where they belong, scheme+appearance+toggle into a new plgg-family package; (Declare/Schedule/Render/Form + the Layout/Component they render through) → a new plgg-family engine package. Keep plggmatic-branded design-token *values*, identity, and showcase for `../plggmatic` (ticket B). Reconcile against the D1–D16 roadmap. Record the partition rationale (feeds the ticket-B ADR).
2. **Scaffold the new plgg-family package(s)** under `packages/` following directory-structure + coding-standards (root `src/index.ts` surface, `.prettierrc.json` printWidth 50, `plgg-bundle`/`plgg-test` tooling, co-located specs). Keep the dependency direction upward-only (they depend on `plgg`/`plgg-view`, never on plggpress/plggmatic).
3. **Move the reusable code** from plggmatic into the new package(s) with its co-located tests; leave plggmatic re-exporting or consuming them so plggmatic stays green.
4. **Rewire plggpress** `src/theme/*` and `src/Admin/*` imports from `plggmatic`/`plggmatic/style` to the new plgg-family packages (+ `plgg-view/style` for base tokens). Drop `plggmatic` from `packages/plggpress/package.json`.
5. **Rewire plggmatic** onto the same new packages so it and plggpress share one engine/theme (no duplication).
6. **Update the build/wiring**: add the new packages' dependency-ordered `cd` lines to `scripts/build.sh` (before plggpress/plggmatic); add their `test-*.sh` + `check-all.sh` lines; update the guide container lists + `gate-guide-deps.sh` so plggpress's new dep set is provisioned and plggmatic is no longer required by plggpress; update `README.md` index (gate-readme) and the `.workaholic/constraints/architecture.md` vendor-boundary/dependency-direction audit.
7. Run `scripts/check-all.sh` and confirm green; grep-confirm plggpress imports zero `plggmatic`/`plggmatic/style`.

## Quality Gate

**Acceptance criteria:**

- `grep -rn "plggmatic" packages/plggpress/src packages/plggpress/package.json` returns **zero** matches for `"plggmatic"` / `"plggmatic/style"` imports or the dep (only unrelated words allowed).
- The new plgg-family package(s) exist under `packages/`, each with a root `src/index.ts` public surface, co-located `*.spec.ts`, and upward-only deps (they do not import plggpress or plggmatic).
- `plggmatic` and `plggpress` both consume the new packages (no duplicated engine/theme code between them).
- `packages/plggpress/src/theme/*.spec.ts` and `src/Admin/*.spec.ts` stay green against the re-homed imports.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.
- `.workaholic/constraints/architecture.md` dependency-direction + vendor-boundary audit updated for the added packages; `README.md` index updated (gate-readme passes).

**Verification method:**

- `scripts/check-all.sh` green (all gates + build + every `test-*.sh`, ≥91% coverage where enforced).
- `grep` clean for plggpress→plggmatic imports.
- Prettier printWidth 50 across the changed/new files.

**Gate:**

- `scripts/check-all.sh` green AND the plggpress-imports-zero-plggmatic grep clean AND no escape hatches AND the architecture.md/README audits updated.

## Considerations

- The runtime cut is the risk: `Render` likely depends on `Layout`/`Component`, so the engine package may pull most of plggmatic's non-branding code — confirm what actually remains plggmatic-specific so the extracted plggmatic (ticket B) is still coherent and not an empty shell (`packages/plggmatic/src/`).
- Do NOT reverse the dependency direction: plggpress → plgg-family only; the new packages must never import plggpress or plggmatic (`.workaholic/constraints/architecture.md`).
- Keep plggpress's vendor-boundary EXEMPT status; the redesign should preserve or improve it, not regress it (`.workaholic/constraints/architecture.md` Vendor Boundary table).
- The open ticket `20260708192518-plggmatic-dynamic-sources-pure-demo1-update.md` targets plggmatic's scheduler internals (`Declare/model/Source.ts`); if that engine becomes a plgg-family package here, that ticket should be re-pointed at the new package (or moved to `../plggmatic` if it lands post-extraction) — flag it, don't silently strand it.
- Tickets B (populate `../plggmatic`) and C (remove the cluster from this monorepo) depend on this ticket; do not reorder — plggpress must be off plggmatic before the cluster can leave.
