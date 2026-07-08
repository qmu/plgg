---
created_at: 2026-07-09T00:00:44+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Config]
effort:
commit_hash:
category:
depends_on: [20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md]
mission:
---

# A2 — Repoint plggpress onto `plgg-ui`; drop the plggpress→plggmatic dependency; reduce plggmatic to a thin facade

## Overview

Second step of the extraction (`/trip` `plggmatic-extraction-cut`).
A1 created `plgg-ui` and re-homed the engine+theme tree with a
byte-stable surface. This ticket rewires the **consumers**: point
plggpress's two import surfaces at `plgg-ui`, remove the
`plggpress → plggmatic` dependency entirely, and reduce the
`plggmatic` package to a thin facade that re-exports `plgg-ui`
(plus its own brand values) so it stays green through tickets B/C.

After this ticket, plggpress imports **zero** plggmatic, and both
plggpress and plggmatic consume the same `plgg-ui` engine — no
duplication. **A1 + A2 together fully satisfy the original ticket A
goal** ("plggpress stops depending on plggmatic").

The repoint is clean because A1 routed the two surfaces onto the
two subpaths:

- `packages/plggpress/src/theme/*` → `plgg-ui/style`
  (`themeToggleClass`/`themeToggleCss`/`staticThemeToggle`,
  `schemeCss`/`metricCss`/`reducedMotionCss`/`syntaxCss`,
  `colorVar`/`metricVar`/`maxWidth`/`minWidth`,
  `appearanceStorageKey`/`injectAppearanceScript`, `syntaxKinds`).
- `packages/plggpress/src/Admin/*` → `plgg-ui` (the runtime
  barrel: `declare`/`menu`/`menuEntry`/`collection`/`action`/
  `confirm`/`loaded`/`async`/`query`/`makeRow`/`field`,
  `schedule`/`renderMode`, and the `Declaration`/`Path`/
  `SchedulerMsg`/`ScheduledModel`/`Scheduled` types).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — public API via root `src/index.ts` + `./style` only; plggmatic facade re-exports through its root barrel (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; import-specifier changes only; Prettier printWidth 50 (applies to all code work)
- `workaholic:design` / `policies/sacrificial-architecture.md` — plggmatic becomes a thin (temporarily sacrificial) facade over the durable `plgg-ui` engine
- `workaholic:design` / `policies/vendor-neutrality.md` — dependency stays one-directional (plggpress → plgg-ui, never reverse); guide-container dep lists + `gate-guide-deps.sh` reconciled after plggpress drops plggmatic
- `workaholic:design` / `policies/modular-monolith-first.md` — the seam is one plgg-ui package, not a proliferation of edges
- `workaholic:implementation` / `policies/domain-layer-separation.md` — plggpress entry points stay thin; the plgg-ui seam exchanges only primitives/domain/plgg types; **preserve plggpress's vendor-boundary EXEMPT status — the cut removes a dep, it must not add `node:` to plggpress's domain**
- `workaholic:implementation` / `policies/type-driven-design.md` — the re-homed boundary keeps exposing rich domain types (`Declaration`, `Scheme`, `Scheduled`), so a mismatch is a compile error
- `workaholic:implementation` / `policies/test.md` — `plggpress/src/theme/*.spec.ts` and `src/Admin/*.spec.ts` stay green against the re-homed imports; ≥91% coverage holds
- `workaholic:operation` / `policies/ci-cd.md` — `scripts/check-all.sh` stays the single reproducible gate; green after the repoint
- `workaholic:implementation` / `policies/command-scripts.md` — guide container + gate-guide-deps updated through the canonical scripts; `build.sh` remains the sed source of truth

## Trip Origin

`.workaholic/trips/plggmatic-extraction-cut/designs/design-v2.md`
§5 (Delivery & sequencing — A2) and §2 (why the two subpaths map
cleanly to the two consumer surfaces).

## Key Files

- `packages/plggpress/src/theme/{baseCss,appearanceScripts,navBar,shell}.ts` (+ `theme/syntaxSeam.spec.ts`) — repoint `plggmatic`/`plggmatic/style` imports to `plgg-ui`/`plgg-ui/style`
- `packages/plggpress/src/Admin/{adminDeclaration,deliverAdmin}.ts` (+ `Admin/adminRender.spec.ts`) — repoint `plggmatic` imports to `plgg-ui`
- `packages/plggpress/package.json` — drop the `plggmatic` `file:` dep; add `plgg-ui`
- `packages/plggmatic/src/index.ts`, `packages/plggmatic/src/styleEntry.ts` — reduce to a facade re-exporting `plgg-ui` / `plgg-ui/style` (+ plggmatic brand values), so plggmatic stays green until B/C
- `packages/plggmatic/package.json` — depend on `plgg-ui`
- `workloads/guide/{dev-entrypoint.sh,compose.yaml}` + `scripts/gate-guide-deps.sh` — plggpress's provisioned dep set now includes `plgg-ui` and no longer requires `plggmatic`
- `.workaholic/constraints/architecture.md` — dependency-direction audit reflects plggpress → plgg-ui (plggmatic edge removed); plggpress stays EXEMPT

## Related History

- [20260704143007-plggpress-theme-on-plggmatic.md](.workaholic/tickets/archive/work-20260704-130317/20260704143007-plggpress-theme-on-plggmatic.md) - its Final Report lists every consumed symbol this ticket repoints, plus the guide-container/gate-guide-deps wiring
- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) - the reverse precedent's symbol→package rewire map template

## Implementation Steps

1. Repoint `packages/plggpress/src/theme/*` imports from `plggmatic`/`plggmatic/style` to `plgg-ui/style` (all four theme files + the syntaxSeam spec).
2. Repoint `packages/plggpress/src/Admin/*` imports from `plggmatic` to `plgg-ui` (adminDeclaration, deliverAdmin, adminRender spec).
3. Drop `plggmatic` from `packages/plggpress/package.json`; add `plgg-ui`. Grep-confirm plggpress imports zero `plggmatic`.
4. Reduce `packages/plggmatic/src/index.ts` + `styleEntry.ts` to a thin facade re-exporting `plgg-ui`/`plgg-ui/style` (+ the plggmatic brand values it still owns); make `packages/plggmatic/package.json` depend on `plgg-ui`. plggmatic must stay green (it is removed only in ticket C).
5. Update the guide container (`workloads/guide/dev-entrypoint.sh`, `compose.yaml`) + `scripts/gate-guide-deps.sh` so plggpress's provisioned deps include `plgg-ui` and drop `plggmatic`.
6. Update `.workaholic/constraints/architecture.md` dependency-direction audit (plggpress → plgg-ui; plggmatic edge gone; plggpress stays EXEMPT).
7. Run `scripts/check-all.sh` fresh and confirm green; grep-confirm plggpress→plggmatic is zero.

## Quality Gate

**Acceptance criteria:**

- `grep -rn "plggmatic" packages/plggpress/src packages/plggpress/package.json` returns **zero** import/dep hits for `"plggmatic"`/`"plggmatic/style"` (only unrelated words/comments allowed).
- `packages/plggpress/package.json` depends on `plgg-ui`, not `plggmatic`.
- `plggmatic` and `plggpress` both consume `plgg-ui` (no duplicated engine/theme between them); `packages/plggmatic` is a thin facade and still builds/tests green.
- `packages/plggpress/src/theme/*.spec.ts` and `src/Admin/*.spec.ts` stay green.
- plggpress's vendor-boundary EXEMPT status is preserved (no new `node:` import in plggpress domain).
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.
- `gate-guide-deps.sh` + `gate-readme.sh` pass; `.workaholic/constraints/architecture.md` dependency audit updated.

**Verification method:**

- `scripts/check-all.sh` green (all gates incl. gate-guide-deps, build, every `test-*.sh`, ≥91% coverage where enforced).
- `grep` clean for plggpress→plggmatic imports/dep.
- Prettier printWidth 50 across changed files.

**Gate:**

- `scripts/check-all.sh` green AND the plggpress-imports-zero-plggmatic grep clean AND plggpress EXEMPT status preserved AND no escape hatches.

## Considerations

- Behavior stays byte-stable: A1 kept `--pm-`/monochrome as `plgg-ui`'s shipped default, so the repoint is import-path-only. Making the theme explicit/parameterized is A3, not this ticket.
- plggmatic MUST remain green as a facade after this ticket — it is only deleted in ticket C, after `../plggmatic` holds a copy (ticket B). Do not delete it here.
- `build.sh` is the sed source of truth for the guide provisioning lists; edit it (and gate-guide-deps) rather than hand-forking derived lists.
