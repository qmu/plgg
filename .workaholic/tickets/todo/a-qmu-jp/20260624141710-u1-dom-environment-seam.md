---
created_at: 2026-06-24T14:17:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U1-dom — Add a DOM-environment seam to plgg-test (happy-dom directive)

## Overview

Four specs need a browser DOM (`document`/`window`) to run. Under vitest
they declare it with a first-line directive `// @vitest-environment
happy-dom`, and vitest installs a happy-dom global environment before the
spec loads. `plgg-test` has **no environment seam** — it runs specs under
plain Node with no `document`, so these 4 specs cannot migrate until the
runner can provide a DOM.

This ticket adds that capability to plgg-test. It `depends_on` U1 (the
runner/resolver foundation) and is itself a dependency of the plgg-view
and example U2 tickets (the 4 DOM specs live there).

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§3 (plgg-test refinement plan — added by plan.md Amendment 2, DOM seam IN
MANDATE) + §8 (risk: env parity).

### The 4 DOM specs (investigated)

All four carry `// @vitest-environment happy-dom` on line 1:

- `packages/plgg-view/src/Program/usecase/application.spec.ts`
- `packages/plgg-view/src/Program/usecase/sandbox.spec.ts`
- `packages/plgg-view/src/Program/usecase/render.spec.ts`
- `packages/example/src/app.spec.ts`

`happy-dom` (`^15.0.0`) is **already** a devDependency in `plgg-view`,
`example`, and `plgg-server`, so no new top-level dependency choice is
forced for the consumers — but plgg-test itself must be able to load it
when a spec requests it.

## Key Files

- `packages/plgg-test/src/Resolve/hook.ts` or a new
  `packages/plgg-test/src/Env/` module — detect the directive in a spec's
  source and install the DOM globals before the spec's module body runs.
- `packages/plgg-test/src/Core/Runner.ts` — the spec-load seam
  (`loadModule`, the `?t=` cache-bust import) is where a per-spec
  environment must be set up before `await import(url)` and torn down
  after.
- `packages/plgg-test/src/Cli/cli.ts` / `bin/plgg-test.mjs` — if the
  environment install needs to happen in the loader/process bootstrap.
- `packages/plgg-test/package.json` — add `happy-dom` as the appropriate
  dependency (peer/optional/dev — choose so consumers that already carry
  it are not double-burdened; the directive-driven import should be
  lazy/dynamic so packages with NO DOM specs need no happy-dom).
- `packages/plgg-test/src/index.ts` — export any public directive helper
  if needed.

## Implementation Steps

1. Design the directive: detect a first-line `// @plgg-test-environment
   happy-dom` (and, for zero-churn migration, optionally also honor the
   existing `// @vitest-environment happy-dom` so the 4 specs need only
   their import line changed — decide and document which). Read the spec
   source at load time; if the directive is present, dynamically import
   happy-dom and install its `Window`/`document`/relevant globals onto
   `globalThis` before the spec module loads.
2. Tear down / reset the DOM globals after the spec file completes so
   non-DOM specs in the same run are unaffected (per-file isolation,
   consistent with the Runner's `resetRegistry` discipline).
3. Make the happy-dom import **lazy** so only DOM-directive specs pull it
   in; a package with no DOM specs must not need happy-dom installed.
4. Add `happy-dom` to plgg-test's `package.json` at the right tier.
5. Add a plgg-test self-spec (a fixture under
   `packages/plgg-test/fixtures/` or `Env/*.spec.ts`) proving a
   directive spec sees `document` and a non-directive spec does not.
6. Verify: `scripts/test-plgg-test.sh` green (incl. the new env spec);
   no `as`/`any`/`ts-ignore`.

## Considerations

- **No `as`/`any`/`ts-ignore`** — happy-dom's `Window` install onto
  `globalThis` must be typed without a cast (use the typed surface
  happy-dom exposes; if a global augmentation is needed, do it via a
  proper `declare global` ambient, not a cast).
- Keep the happy-dom dependency lazy so the runner stays light for the
  majority of (non-DOM) packages and specs.
- The plgg-view + example U2 tickets `depends_on` this; their DOM specs'
  directive line will be updated to whatever this ticket settles on.
- Mirror the per-file isolation the Runner already enforces — a DOM
  installed for one file must not leak into the next.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the
  env seam lives in its own plgg-test module; fixtures stay under
  `fixtures/`.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; typed global install; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — DOM specs must run
  under the in-house runner with the same environment guarantee vitest
  gave them (env parity is part of preserving the suite).
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  global install is typed, not cast.
- `workaholic:implementation` / `policies/functional-programming.md` —
  the directive detection is a pure read; the install/teardown is an
  isolated imperative seam, clearly bounded.
- `workaholic:operation` / `policies/ci-cd.md` — the env seam must work
  headless in CI (happy-dom, not a real browser).
- `workaholic:implementation` / `policies/vendor-neutrality.md` —
  happy-dom is the same lightweight DOM the project already chose;
  keeping it lazy avoids forcing it on DOM-free packages.
