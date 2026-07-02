---
created_at: 2026-07-03T00:05:42+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort:
commit_hash:
category:
depends_on: [20260703000541-thicken-plggmatic-reexport-facade.md]
---

# Rewire `plggpress` to consume the thick `plggmatic` facade; deps collapse to {plgg, plggmatic}

## Overview

With `plggmatic` thickened into a full re-export facade (prerequisite ticket), rewire `plggpress` so every symbol it currently imports raw from `plgg-view` (incl. `/style`), `plgg-server` (incl. `/ssg`), `plgg-md`, and `plgg-highlight` is imported from `plggmatic` / `plggmatic/ssg` / `plggmatic/style` instead, then remove those direct dependencies — plus `plgg-http`, which plggpress declares but never imports directly (dead weight today). End state: `plggpress` depends on `{plgg, plggmatic}` only, mirroring the already-proven single-facade pattern where `packages/guide` depends on `plggpress` alone. The regression oracle is unchanged from the 213411 rewire: the built guide output stays byte-identical.

Scope decisions (recommended defaults recorded while the developer was away from the interrogation prompt — confirm or adjust at the `/drive` approval gate): all five packages wrapped; `plgg` foundation stays a direct dep; subpath mirrors (`plggmatic/ssg`, `plggmatic/style`) rather than a flattened barrel.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout; consumer imports flow through the framework facade, dependencies point down the layer stack
- `workaholic:implementation` / `policies/coding-standards.md` — no-escape-hatch rule (`as`/`any`/`ts-ignore` prohibited); import rewrites must stay type-identical; house style per `plgg-coding-style`
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the consumer sees one framework vocabulary; app-specific logic (SiteConfig IA, theme, CheckLinks, href) stays in plggpress
- `workaholic:design` / `policies/vendor-neutrality.md` — the consumer's integration boundary narrows to one facade; mid-lib churn no longer touches plggpress's dep list
- `workaholic:design` / `policies/sacrificial-architecture.md` — completes the deliberate re-boundary started by the prerequisite ticket; rationale recorded there and in the PR story

## Key Files

- `packages/plggpress/package.json` - deps today: `plgg, plggmatic, plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http` (7); target: `plgg, plggmatic` (2); `npm install` after the edit so node_modules matches; ESM-only with a `plggpress` bin and hook.mjs self-alias resolver (leave those intact)
- `packages/plggpress/src/router/pressRouter.ts` - densest cross-package consumer (view + md + server + highlight + plggmatic in one file); the representative rewrite
- `packages/plggpress/src/theme/shell.ts` and the ~12 `src/theme/*.ts` files - heaviest plgg-view element-builder consumers (html, head, body, title, style, meta, link, slot, text, attr, class_, collectCss…)
- `packages/plggpress/src/devEntry.ts` - the subpath case: `Fetch`/`toFetch` from plgg-server and `SsgError`/`discoverPaths` from `plgg-server/ssg` → `plggmatic` and `plggmatic/ssg`
- `packages/plggpress/src/**/*.spec.ts` - spec files also import raw packages (e.g. `router/pressRouter.spec.ts`, `theme/*.spec.ts` import `renderToString`/`style_` from plgg-view; `appSpecs.spec.ts` imports `handle` from plgg-server) — **spec imports count in the bundle graph walk**; they must migrate too or deriveExternal fails once the deps are dropped
- `packages/plggpress/src/index.ts` - plggpress's own barrel; check the existing alias pattern (`build as frameworkBuild`, `loadConfig as loadAppConfig`) still composes against the thickened facade without new collisions
- `packages/plggpress/README.md` - dependency diagram collapses to plgg + plggmatic; `gate-readme.sh` checks links both ways
- `packages/guide/package.json` - read-only proof of the target pattern (depends on plggpress alone)

## Related History

The 213411 rewire established both the seam ("drop the plgg-lib deps now reached through plggmatic; keep only what plgg-press still imports directly") and the byte-identical-output contract this ticket inherits; this ticket widens that seam to its logical end.

Past tickets that touched similar areas:

- [20260701213411-reimplement-plgg-press-on-plggmatic.md](.workaholic/tickets/archive/work-20260701-185044/20260701213411-reimplement-plgg-press-on-plggmatic.md) - the first rewire onto plggmatic; byte-identical guide output as the acceptance oracle (same oracle here)
- [20260701213410-scaffold-plggmatic-framework-extract-composition.md](.workaholic/tickets/archive/work-20260701-185044/20260701213410-scaffold-plggmatic-framework-extract-composition.md) - the thin-framework boundary the prerequisite ticket amends
- [20260701213412-rename-plgg-press-to-plggpress.md](.workaholic/tickets/archive/work-20260701-185044/20260701213412-rename-plgg-press-to-plggpress.md) - the current package name/dep list this ticket edits
- [20260702215004-readme-every-package-linked-top-to-bottom.md](.workaholic/tickets/archive/work-20260701-185044/20260702215004-readme-every-package-linked-top-to-bottom.md) - README dependency-diagram gate the dep drop ripples into

## Implementation Steps

1. **Capture the oracle first**: build the guide (`packages/guide`) at the pre-rewire state and store its output tree hash (e.g. `find dist -type f | sort | xargs sha256sum > /tmp/guide-oracle.txt` or the repo's established byte-compare method from 213411) — this is the regression baseline.
2. **Rewrite imports** across `packages/plggpress/src/` (sources AND `*.spec.ts`): `from "plgg-view"` → `from "plggmatic"`; `from "plgg-view/style"` → `from "plggmatic/style"`; `from "plgg-server"` → `from "plggmatic"`; `from "plgg-server/ssg"` → `from "plggmatic/ssg"`; `from "plgg-md"` → `from "plggmatic"`; `from "plgg-highlight"` → `from "plggmatic"`. Mechanical per-file sweep; no symbol renames expected (the facade preserves names).
3. **Resolve any collisions surfaced by merged imports** — where a file now imports the same name from `plggmatic` twice (e.g. previously `p` from both view and style), keep the subpath-qualified import (`plggmatic/style`) for the style variant, matching the pre-existing distinction.
4. **Drop deps**: remove `plgg-view, plgg-md, plgg-highlight, plgg-server, plgg-http` from `packages/plggpress/package.json`; run `npm install` to regenerate the lockfile and prune node_modules symlinks.
5. **Rebuild and walk the graph**: rebuild plggpress's dist with plgg-bundle — deriveExternal now fails loudly on ANY remaining raw `plgg-view|plgg-server|plgg-http|plgg-md|plgg-highlight` import (sources or specs); fix stragglers.
6. **Byte-identity check**: rebuild the guide and compare against the Step 1 oracle — must be identical.
7. **README**: update plggpress's dependency diagram/links (now plgg + plggmatic); check plggmatic's README cross-links still resolve; `gate-readme.sh` green.
8. **Full verification**: `scripts/tsc-plgg.sh` clean, then a fresh `scripts/check-all.sh` (fresh dist rebuild — stale dists mask consumer type drift).

## Quality Gate

Captured from the proposed gate (developer was away; recommended defaults recorded — confirm at the `/drive` approval prompt).

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plggpress/package.json` dependencies are exactly `{plgg, plggmatic}` (file: deps), nothing else from the plgg family
- `grep -rn 'from "plgg-view\|from "plgg-server\|from "plgg-http\|from "plgg-md\|from "plgg-highlight' packages/plggpress/src/` returns nothing (sources and spec files)
- The built guide output is byte-identical to the pre-rewire oracle
- No new `as`/`any`/`ts-ignore` anywhere in the diff

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` clean
- Fresh `scripts/check-all.sh` green — includes the plgg-bundle graph walk (deriveExternal proves no undeclared imports remain), all >90% coverage gates, and `gate-readme.sh`
- The Step 1/Step 6 byte-comparison of the guide build output
- The grep proof above, run and shown in the drive report

**Gate** — what must pass before approval:

- All four verification items green; the drive approval prompt shows the dep diff (7 → 2), the grep proof, and the byte-identity result; the developer confirms the recorded scope defaults (all-five wrap, plgg direct, subpath mirrors) stand

## Considerations

- **Spec imports are load-bearing**: plgg-test spec files ride through the same bundle graph walk; forgetting them leaves check-all red even when `src/` is clean (`packages/plggpress/src/**/*.spec.ts`)
- `plgg-http` is dropped without any import rewrite — it was never imported directly (transitive via plgg-server); verify with the grep proof rather than assuming (`packages/plggpress/package.json`)
- Coverage stays neutral: this is an import-path refactor with no logic change; both packages' >90% gates should pass untouched — if coverage moves, something other than imports changed (`packages/plggpress/plgg-test.config.json`)
- `devEntry.ts` is coverage-excluded but graph-walked: its `plggmatic/ssg` import is the main subpath consumer and the first thing to break if the facade's exports map is wrong (`packages/plggpress/src/devEntry.ts`)
- The guide (`packages/guide`) needs no changes — it already imports only from `plggpress`; its unchanged build is the end-to-end proof that the whole facade chain (guide → plggpress → plggmatic → mid-libs) resolves (`packages/guide/package.json`)
- Depends on `20260703000541-thicken-plggmatic-reexport-facade.md` — the facade must exist and export the full inventory before any plggpress import can move; do not start this ticket with the prerequisite unmerged into the working tree
