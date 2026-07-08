---
created_at: 2026-07-08T14:36:13+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Demo 1 refactor step 1 — collapse the Client/Project parallel code paths into one generic record-section descriptor

## Overview

`packages/plggmatic-example/src/demo1/bizMenuDemo.ts` (2052 lines) carries two fully parallel code paths for its two live sections: `Client` and `Project` each have their own types, row mappers, id/slug builders, `makeX`/`parseX`/`emptyXForm`/`selectCreatedX` pairs, two hand-written form-field builder blocks (`clientFormFields` ~85 lines, `projectFormFields` ~108 lines), and ~14 doubled per-field input `Msg` variants (`clientNameInput`/`projectNameInput`, `clientStatusInput`/`projectStatusInput`, …). This ticket collapses the duplication into a single generic **record-section descriptor** (`RecordSection`-style value: field list, labels, parse/empty/row/slug functions) that both sections are driven from, and replaces the doubled `Msg` input variants with one section-parameterized field-input message (e.g. `{ kind: 'fieldInput'; section; field; value }`).

This is the foundation ticket of a three-step refactoring sequence (this → typed URL-state codec → module split); it shrinks the monolith substantially before the later structural steps.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript feature discipline; no `as`/`any`/`ts-ignore`, `Readonly`/`ReadonlyArray`, `satisfies` (applies to all code work)
- `workaholic:implementation` / `policies/type-driven-design.md` — the whole point of this ticket: replace two stringly parallel record paths with one typed descriptor so a new section is expressed in the existing type vocabulary
- `workaholic:implementation` / `policies/functional-programming.md` — descriptor-driven builders must stay expression-style, pure-data + data-last `pipe`; no builder classes
- `workaholic:implementation` / `policies/test.md` — the frozen behavioral spec is the safety net; tests describe behavior, not internals
- `workaholic:design` / `policies/sacrificial-architecture.md` — authorizes reworking the duplicated unit as a whole instead of stacking further per-section patches

## Key Files

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — primary target; duplication lives at (among others) lines ~122-184/216-277 (parallel seed data + counters), ~502-568 (doubled `Msg` input variants), ~1148-1342 (`clientFormFields`/`projectFormFields`)
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — 724-line behavioral safety net (~30 tests: deep links, search flows, add forms, scheme toggle); FROZEN — must stay byte-identical except import/module-path lines, and green
- `packages/plggmatic-example/src/demo1-main.ts` — CSR entry; untouched by this ticket beyond re-exports if signatures move
- `packages/plggmatic/src/Render/usecase/multiColumn.ts` — framework seam (`afterMenu` slot); boundary, not a target — no demo-specific concern may leak into plggmatic

## Related History

Demo 1 was built incrementally across five archived tickets on this branch; the Projects and Clients sections were added in separate passes, which is where the parallel paths come from.

- [20260706203650-demo-1-projects-section-live.md](.workaholic/tickets/archive/work-20260706-120449/20260706203650-demo-1-projects-section-live.md) - added the Projects collection/query/detail/child logic (one of the two paths this ticket unifies)
- [20260708133114-carry-verify-commit-demo1-search-flow.md](.workaholic/tickets/archive/work-20260706-120449/20260708133114-carry-verify-commit-demo1-search-flow.md) - the per-section navigation + search pass that doubled the form/search machinery across both sections
- [20260706201820-demo-1-bizops-menu-contract-dev.md](.workaholic/tickets/archive/work-20260706-120449/20260706201820-demo-1-bizops-menu-contract-dev.md) - established the eight-section menu the descriptor must keep serving

## Implementation Steps

1. Read the current `bizMenuDemo.ts` end to end and inventory every `clientX`/`projectX` pair (types, seeds, mappers, form builders, parse/empty/create/select functions, `Msg` variants, `update()` cases).
2. Design the descriptor type first (type alias → guard/caster as needed): a `RecordSection<R>`-style value carrying section id/slug, field descriptors (name, label, input kind, options), `emptyForm`, `parseForm` wiring, row projection, and created-record selection hook. Keep it a pure data value + data-last functions, per house style.
3. Express `clients` and `projects` as two instances of the descriptor; derive the form-field builders, parse/empty/create/select functions, and row mappers from it, deleting the hand-written pairs.
4. Collapse the doubled per-field input `Msg` variants into one section-parameterized field-input message; rewrite the corresponding `update()` cases as a single exhaustive branch driven by the descriptor.
5. Keep module-global mutable state and the URL helpers AS-IS — those are tickets 2 and 3 of this sequence; do not widen scope.
6. Format with Prettier (printWidth 50), run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`, and exercise `demo1.html` in a browser.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `bizMenuDemo.spec.ts` is byte-identical to its pre-refactor content except import/module-path lines (verify with `git diff -- packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts`), and every test passes.
- No `clientX`/`projectX` function or `Msg`-variant pair remains that differs only in record type (verify with `grep -nE 'client(Name|Status|Form)|project(Name|Status|Form)' packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — hits may remain only as descriptor-instance data, not as parallel logic).
- The two form-field builder blocks (`clientFormFields`, `projectFormFields`) are gone, replaced by one descriptor-driven builder.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced (verify with `git diff | grep -nE '\bas\s|\bany\b|ts-ignore|ts-expect-error'`).
- `wc -l packages/plggmatic-example/src/demo1/bizMenuDemo.ts` shows a substantial net reduction from 2052 lines.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` — clean compile.
- `scripts/test-plgg.sh` — green, including the frozen `bizMenuDemo.spec.ts` suite (example package is coverage-exempt; the gate is test pass, not coverage).
- Prettier check per package `.prettierrc.json` (printWidth 50).
- Manual browser pass of `demo1.html`: menu navigation, per-section search flow (submit → filtered results), add form (open → validate required → create → land on detail), deep links, light/dark toggle.

**Gate** — what must pass before approval:

- `scripts/tsc-plgg.sh` clean AND `scripts/test-plgg.sh` green AND spec-frozen diff check clean AND no-escape-hatch grep clean AND the manual browser pass completed with all five flows working.

## Considerations

- Do not push the descriptor into `plggmatic` — the framework seam stays `multiColumnWith`'s `afterMenu` slot; the descriptor is app-side (`packages/plggmatic/src/Render/usecase/multiColumn.ts` is a boundary, not a target).
- The six stub sections must keep rendering; the descriptor covers the two live record sections only — don't force stubs through it if that adds complexity.
- Tickets 2 (typed URL codec) and 3 (module split, pure update) build on this; keep the descriptor's surface friendly to a later file split (`packages/plggmatic-example/src/demo1/`).
- Module-global `let clients/projects/…Counter` mutation stays for now (ticket 3 moves state into the Model); the descriptor should not entrench it further — route mutation through the existing seam.
- The example package is coverage-exempt (`packages/plggmatic-example/plgg-test.config.json` notes a contemplated declarative rewrite, roadmap ticket 13); this refactoring sequence supersedes ad-hoc rewriting — reconcile the config note if it becomes stale.
