---
created_at: 2026-07-01T21:34:11+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260701213410-scaffold-plggmatic-framework-extract-composition.md]
---

# Reimplement plgg-press as a thin `plggmatic` consumer (still named plgg-press)

## Overview

Rewire plgg-press to build on the `plggmatic` framework (ticket A) instead of hand-wiring the plgg libraries directly: `build`/`dev`/`cli`/`router` become thin declarations that supply plgg-press's **docs-specific** pieces to `plggmatic`'s generalized seam. **No behavior change and no rename** here — the package stays `plgg-press`; the guide site's output must be identical. The rename to `plggpress` is ticket C.

After this ticket, plgg-press keeps only what is genuinely docs-site-specific:

- **`SiteConfig` IA** — `NavItem`/`SidebarGroup`/`SocialLink`/`HomeConfig`/`DevConfig` + the `defineSite` boundary caster (carrying forward the typed-`defineSite` work from [20260701195048](.workaholic/tickets/todo/a-qmu-jp/20260701195048-defineSite-typed-author-facing-input.md)).
- **`theme/*`** — the default theme, **already restyled to qmu.co.jp** by tickets [211839](.workaholic/tickets/todo/a-qmu-jp/20260701211839-plgg-press-tokens-typography-match-qmu.md) + [211840](.workaholic/tickets/todo/a-qmu-jp/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md). **Carry it forward verbatim** — this reimplementation must not regress the qmu palette/typography/layout (author decision: theme-first, carry over).
- **`CheckLinks`** and **`href`** — docs link-checking + href resolution policy.
- The md→highlight→theme **render specifics** it feeds into `plggmatic`'s router builder.

Everything else — config-load mechanism, router assembly, static-build orchestration, dev-server loop, app-options, CLI wiring — is now **`plggmatic`'s**, consumed through its facade.

**Sequencing:** depends on ticket A (which itself runs after the whole current backlog, including the two theming tickets), so by the time this runs, the qmu theme is in place to carry over.

## Policies

- `workaholic:implementation` / `policies/domain-layer-separation.md` — plgg-press's `cli.ts`/`dev.ts`/`build.ts` become thin entry points over `plggmatic`; the docs domain (SiteConfig/theme/CheckLinks) stays in plgg-press, cleanly separated from framework plumbing.
- `workaholic:implementation` / `policies/functional-programming.md` — the reimplementation is declarative composition over `plggmatic`'s data-last API; behavior preserved under the new composition.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; the `plggmatic` facade is consumed via its package-name alias, never relative cross-package paths.
- `workaholic:design` / `policies/emergent-design-system.md` — the carried-over qmu theme is the design system; the reimplementation must preserve it pixel-for-pixel (verified by the same Playwright screenshots the theming tickets used).
- `workaholic:implementation` / `policies/directory-structure.md` — plgg-press shrinks to its docs-specific modules; dead framework-generic modules are removed (now living in `plggmatic`).
- `plgg-coding-style` (skill) — Option/Result, `pipe`/`proc`, printWidth 50, colocated specs, ≥90% coverage.

Repo constraints: `.workaholic/constraints/architecture.md` (plgg-press now depends on `plggmatic`; must not be imported by it — no cycle), `.workaholic/constraints/quality.md`.

## Key Files

plgg-press (to rewire / slim):

- `packages/plgg-press/package.json` — drop the plgg-lib deps now reached through `plggmatic`; add `plggmatic` (`file:../plggmatic`). Keep only what plgg-press still imports directly (plgg-view for theme, plgg core).
- `packages/plgg-press/src/build.ts`, `dev.ts` — reduce to thin calls into `plggmatic`'s build/dev, supplying the plgg-press router factory + 404 + link-check.
- `packages/plgg-press/src/cli.ts` — declare the app via `plggmatic`'s pre-organized CLI helper; supply the config schema + commands.
- `packages/plgg-press/src/router/pressRouter.ts` — reduce to the md→highlight→theme render function handed to `plggmatic`'s router builder; drop the generic route-assembly now in `plggmatic`.
- `packages/plgg-press/src/Config/usecase/loadConfig.ts` — replace with a call to `plggmatic`'s generic loadConfig passing `asSiteConfig`; keep only the press schema wiring.
- `packages/plgg-press/src/Press/model/PressOptions.ts` — replace with `plggmatic`'s app-options (or a press alias of it); remove duplicated fields.
- `packages/plgg-press/src/index.ts` — new public surface: SiteConfig/defineSite, theme, CheckLinks, href, and thin build/dev/cli re-exports.
- `packages/plgg-press/src/theme/*`, `SiteConfig/model/SiteConfig.ts`, `CheckLinks/*`, `Href/*` — **kept**; theme carried forward from the qmu tickets.
- All colocated `*.spec.ts` — update imports to the new composition; behavior assertions must stay green unchanged.

`plggmatic` (consume, read-only): its `src/index.ts` facade from ticket A.

Consumer (unchanged behavior): `packages/guide/site.config.ts` + guide `build`/`dev` scripts — still target `plgg-press` (the rename is ticket C); the guide's built output must be byte-identical.

## Related History

- [20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md](.workaholic/tickets/archive/work-20260701-185044/20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md) — precedent: plgg-press's CLI was already reimplemented on a new package (plgg-cli) with identical behavior as the oracle; this repeats that pattern for the whole composition.
- [20260630013504-plgg-press-scaffold-siteconfig-cli.md](.workaholic/tickets/archive/work-20260630-013457/20260630013504-plgg-press-scaffold-siteconfig-cli.md) — the facade being thinned.
- Depends on ticket A (`plggmatic` scaffold/extraction) and carries over the qmu theme from 211839/211840.

## Implementation Steps

1. Add `plggmatic` as a `file:` dep; wire plgg-press's tsconfig/bundle to resolve it via its package alias.
2. Rewire `loadConfig.ts` to `plggmatic.loadConfig(asSiteConfig)`; delete the duplicated import/validate plumbing.
3. Rewire `pressRouter.ts` to hand its md→highlight→theme render function to `plggmatic`'s router builder; delete the generic route-assembly.
4. Rewire `build.ts`/`dev.ts` to `plggmatic`'s build/dev, injecting the press router factory, `notFound` theme page, and `CheckLinks` policy.
5. Rewire `cli.ts` to `plggmatic`'s pre-organized CLI helper, supplying the press config schema + `build`/`dev` commands.
6. Replace `PressOptions` with `plggmatic`'s app-options (or a thin press alias); remove dead framework-generic modules now living in `plggmatic`.
7. Update all `*.spec.ts` imports; keep behavior assertions unchanged (they are the regression oracle).
8. Run `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; then **build the guide site** and diff its output against a pre-change capture; run `dev` and smoke it.
9. Playwright-screenshot the guide (light/dark, lg/mobile) and confirm the qmu theme is intact vs the theming tickets' baseline.

## Quality Gate

**Acceptance criteria:**
- plgg-press builds on `plggmatic`: its `build`/`dev`/`cli`/`router` are thin declarations; the framework-generic modules (generic loadConfig, route-assembly, PressOptions duplication) are gone from plgg-press.
- **Byte-identical output:** the guide site's built HTML/CSS/assets are unchanged vs before this ticket (captured diff is empty).
- **qmu theme preserved:** Playwright screenshots (light/dark, lg + mobile) match the theming tickets' baseline — no palette/typography/layout regression.
- Every plgg-press `*.spec.ts` passes with **no behavior-assertion changes** (import/shape edits only); coverage stays ≥90%.
- No `as`/`any`/`@ts-ignore`; plgg-press imports `plggmatic` via its alias and is not imported by it (no cycle).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, plgg-press coverage ≥90%.
- Guide build output diff (pre vs post) is empty; `dev` serves and live-reloads in-session.
- Playwright side-by-side vs the theming baseline confirms the qmu look, light + dark, lg + mobile.
- `git grep -nE "plgg-press|plggpress" packages/plggmatic/src` still returns nothing (dependency direction intact).

**Gate:** tsc + tests green with unchanged assertions, guide output byte-identical, qmu theme visually intact (screenshots), ≥90% coverage, no escape hatch, no cycle — before approval.

## Considerations

- **Behavior parity is the contract.** This is a re-layering, not a redesign — any output change is a bug. Capture the guide build **before** starting as the diff oracle (`packages/guide`).
- **Theme carry-over.** `theme/*` moves untouched; if `plggmatic`'s router builder changes the page-assembly call shape, adapt the *call*, not the theme markup/CSS, so the qmu screenshots still match (`packages/plgg-press/src/theme/`).
- **Don't rename yet.** Keep the package name/bin/alias as `plgg-press` here to isolate the risky re-layering from the mechanical rename (ticket C); a green guide build is the handoff point.
- **defineSite carry-forward.** The typed `defineSite` (ticket 195048) is in the SiteConfig boundary that stays; ensure the `plggmatic` generic loadConfig accepts that caster unchanged (`packages/plgg-press/src/SiteConfig/model/SiteConfig.ts`).
- Ticket C (rename → `plggpress`) depends on this landing green.
