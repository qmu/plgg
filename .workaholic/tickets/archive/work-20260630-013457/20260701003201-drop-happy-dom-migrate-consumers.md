---
created_at: 2026-07-01T00:32:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort:
commit_hash:
category: Removed
depends_on: [20260701003200-plgg-test-in-house-dom-env.md]
---

# Migrate consumer DOM specs to `dom`, strip happy-dom monorepo-wide, add the no-happy-dom gate

## Overview

With plgg-test's in-house `dom` environment in place
([20260701003200-plgg-test-in-house-dom-env.md]), happy-dom has no remaining
purpose anywhere. This ticket finishes the removal: migrate the consumer DOM
specs in **plgg-view** and **example** onto `// @plgg-test-environment dom`,
delete happy-dom from their `package.json` files, regenerate the affected
lockfiles, and add a **scoped no-happy-dom gate** (mirroring the canonical
`scripts/gate-vite.sh`) so a reintroduction fails locally and in CI.

After this ticket: `grep -r happy-dom packages/*/package.json packages/*/src` is
empty, and the full monorepo typechecks + tests green against the in-house DOM —
the real >90% coverage proof for the in-house DOM (its ~115 plgg-view specs +
example specs now run on it).

Depends on the keystone because these specs won't run until the `dom` token and
the in-house DOM exist.

## Key Files

- `packages/plgg-view/src/Program/usecase/render.spec.ts` — directive line 1
  `// @vitest-environment happy-dom` → `// @plgg-test-environment dom`. Largest
  consumer (~1288 lines): createElement, events/handlers, focus, controlled
  `value`/`checked`, diffing, WAAPI `animate` stubbing, `getBoundingClientRect`/
  `DOMRect` FLIP, `style.*`. (FLIP test already stubs `getBoundingClientRect` — no
  layout dependence.)
- `packages/plgg-view/src/Program/usecase/sandbox.spec.ts` — directive → `dom`.
  createElement, `querySelector(All)('button'/'span')`, `dispatchEvent(new
  Event('click'))`, `textContent`, `children.length`.
- `packages/plgg-view/src/Program/usecase/application.spec.ts` — directive → `dom`
  **and remove the happy-dom-specific augmentation** (≈ lines 39-54: the `declare
  global { interface Window { happyDOM? } }` block and the
  `window.happyDOM.settings.navigation.disableMainFrameNavigation /
  disableFallbackToSetURL` writes guarded by `if (window.happyDOM)`). The in-house
  DOM is navigation-inert by default, so the guard/augmentation is dead — delete it.
  Keep the history/location/popstate/MouseEvent assertions.
- `packages/plgg-view/src/Program/usecase/render.ts` — **no code change required**
  (the in-house DOM makes text nodes `instanceof CharacterData` with writable
  `.data` and elements `instanceof Element`). Update the stale ≈ line 686-687
  comment that references happy-dom's `instanceof`.
- `packages/example/src/app.spec.ts` — directive → `dom`. createElement, compound
  selectors (`input[name=title]`, `li.todo input[type=checkbox]`, `.todo-filters
  button.filter.selected`), `HTMLInputElement` instanceof + `.value`, `Event`
  (`input`/`change`/`submit`{cancelable}), `MouseEvent('click'{bubbles,cancelable,
  button})`, `window.history.replaceState`, `window.location.search`, `popstate`.
  (Its `renderToString` SSR tests are DOM-free and unaffected.)
- `packages/plgg-view/package.json` — remove `devDependencies."happy-dom"`.
- `packages/example/package.json` — remove `devDependencies."happy-dom"`.
- `scripts/gate-happy-dom.sh` (new) — canonical no-happy-dom gate, modeled on
  `scripts/gate-vite.sh`: fail if `"happy-dom"` appears in any `packages/*/
  package.json`, or `happy-dom` / `@vitest-environment` is imported/referenced in
  any `packages/*/src`. One source of truth.
- `scripts/check-all.sh` — wire `./scripts/gate-happy-dom.sh` next to the vite gate.
- `.github/workflows/run-tests.yml` — add a `run: ./scripts/gate-happy-dom.sh` step
  next to the existing `gate-vite.sh` step (shared verbatim, can't drift).
- Lockfiles — regenerate `package-lock.json` for plgg-view, example, plgg-test
  (and any workspace lock) so no stale happy-dom entry lingers.

## Implementation Steps

1. Migrate the four spec directives to `// @plgg-test-environment dom`
   (render, sandbox, application in plgg-view; app in example).
2. Strip the `window.happyDOM` augmentation/guard from `application.spec.ts`;
   confirm navigation assertions pass against the inert in-house DOM.
3. Update the stale happy-dom `instanceof` comment in `render.ts`.
4. Remove happy-dom from `plgg-view` and `example` `package.json`; regenerate
   the affected lockfiles.
5. Add `scripts/gate-happy-dom.sh`; wire it into `scripts/check-all.sh` and
   `.github/workflows/run-tests.yml`.
6. Verify end to end: `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green
   across the whole monorepo (plgg-view ~115 + example specs now exercise the
   in-house DOM and provide its real >90% coverage); `scripts/gate-happy-dom.sh`
   passes and `grep -rn happy-dom packages` returns only allowed/comment-free
   results (ideally none).

## Considerations

- **Token completeness**: the `happy-dom` token + the legacy `@vitest-environment`
  alias appear across these specs; miss one and that spec silently runs DOM-free
  (module-eval DOM access throws → load failure → red) — the gate plus a clean
  `grep` are the backstop.
- **Navigation parity**: `application.spec.ts` relied on happy-dom auto-navigating
  unless disabled; the in-house DOM is inert by default, so the disable code is not
  just removable but *must* be removed (its `window.happyDOM` reference won't type).
  `history.pushState`/`replaceState` must still actually update `location` for the
  spies/assertions — verify against the keystone's implementation.
- **Lockfiles / clean-runner deps**: the workspace shares package-locks; regenerate
  so stale happy-dom entries don't linger (CI consistency). plgg-test must still
  install its own real deps (cf. the "bundle clean-runner deps" lesson) — the gate
  checks `package.json`, not `node_modules`.
- **Don't narrow thresholds**: plgg-view/example keep their real >90% coverage
  numbers — the migration must not silently lower any threshold to paper over a gap.
- **Gate scope**: model `gate-happy-dom.sh` exactly on `gate-vite.sh` (grep
  `packages/*/package.json` + `packages/*/src`); keep it the single source shared by
  `check-all.sh` and CI.
- Tooling: `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` only; Prettier
  `printWidth: 50`.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — finish shedding
  the external dep with zero replacement; add the scoped gate (vite-purge pattern).
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/
  `ts-ignore` in the migrated specs/renderer comment fixes.
- `workaholic:operation` / `policies/command-scripts.md` — the gate is one canonical
  runner shared by local `check-all.sh` and CI, not a bespoke per-package script.
- `workaholic:implementation` / `policies/test.md` — the migrated suites are the
  regression proof the in-house DOM behaves; keep them green, not narrowed.
