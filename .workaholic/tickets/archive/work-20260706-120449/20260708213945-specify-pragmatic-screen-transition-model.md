---
created_at: 2026-07-08T21:39:45+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash: df463220
category: Added
depends_on:
mission: plggmatic-ai-native-ui-toward-a-dsl
---

# Specify Pragmatic's probabilistic screen-transition model (AI-generatable + AI-operable)

## Overview

Derived from the Pragmatic concept (`.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md`). Write the **specification of Pragmatic's screen-transition model**: how the screen a user (or an operating AI) sees next arises **from the data and the situation** rather than from a hard-wired, hand-authored navigation graph — "probabilistic by structure" — and the concrete, testable properties that make each transition **AI-generatable** (a generating AI can produce the right transition from the data) and **AI-operable** (an operating agent, incl. a browser-side WebMCP agent, can read the produced structure and drive the transition deterministically).

This is a **specification (documentation) ticket**, not an implementation. It distills the model empirically from the existing samples — the plggmatic scheduler (`declare → schedule → render`, the TEA runtime whose `Scene` has menu/list/detail levels and holds all state in the URL) and the Demo 1 business app (per-section search → results → detail, deep-linkable) — into an explicit, machine-legible model that later feeds the DSL and the pending `/trip` on the plggmatic extraction (`20260708195655`).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the spec lands in `.workaholic/specs/` (project design record), consistent with the existing plggmatic design specs (applies to all doc/code work)
- `workaholic:implementation` / `policies/objective-documentation.md` — the spec states verified, factual behavior of the current model with file:line evidence, and clearly marks proposed/target properties as such — no aspirational prose passed off as fact
- `workaholic:implementation` / `policies/type-driven-design.md` — express the transition model in typed vocabulary (situation/state → transition as data), so the model is checkable and a proto-DSL, not free text
- `workaholic:design` / `policies/modeless-design.md` — transitions hold state in the URL and stay reachable/composable without mode; the spec must keep this (it is what makes a transition deep-linkable and agent-operable)
- `workaholic:design` / `policies/interaction-design-standard.md` — the four interactive states (loading/empty/error/success) are part of a transition's definition; the spec enumerates them per transition
- `workaholic:design` / `policies/self-explanatory-ui.md` — a transition must be legible from its own structure (labels, affordances) so both a human and a generating/operating AI can understand it
- `workaholic:planning` / `policies/ai-native-future.md` — the A2A premise: AI-driven transitions stay observable and interruptible by humans; the AI-operability properties must not hide state from the user

## Key Files

- `.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md` — the concept this ticket specifies one half of; read first
- `.workaholic/specs/20260704-plggmatic-scheduler-design.md` — the existing scheduler design record; the transition model builds on it
- `packages/plggmatic/src/Schedule/model/Scene.ts` — the `Scene` levels (menu/list/detail) that are today's transition vocabulary
- `packages/plggmatic/src/Schedule/model/Msg.ts` — `SchedulerMsg` (urlChanged/openMenu/select/queryInput/requestAction/…): the situations that drive transitions
- `packages/plggmatic/src/Schedule/usecase/schedule.ts`, `usecase/codec.ts` — the settle loop + URL-as-state codec (state → screen → URL round-trip)
- `packages/plggmatic/src/Render/` — how a `Scene` becomes a screen (multiColumn/singleColumn/renderMode); the operable output surface
- `packages/plggmatic-example/src/demo1/` — Demo 1's per-section search→results→detail flow, a concrete transition sample (url.ts typed view-stage codec is a worked example of situation→screen)

## Related History

The plggmatic scheduler and Demo 1 are the samples this spec generalizes; Demo 1's recent refactor already produced a typed situation→screen codec worth citing.

- [20260708143614-demo1-typed-url-state-codec.md](.workaholic/tickets/archive/work-20260706-120449/20260708143614-demo1-typed-url-state-codec.md) - typed the Demo 1 view stages (Menu/Add/Search/Results/Detail) as a discriminated union — a concrete, worked instance of a transition model
- [20260706183300-plggmatic-demo-3-scheduler-query-url-codec.md](.workaholic/tickets/archive/work-20260706-120449/20260706183300-plggmatic-demo-3-scheduler-query-url-codec.md) - demo 3's scheduler query + derived URL codec, another transition sample

## Implementation Steps

1. Read the concept doc and the existing scheduler design spec; fix the vocabulary (Scene, Level, Situation/Msg, Transition, State-in-URL).
2. **Characterize the current model (factual):** document how today's scheduler derives the next screen — `Scene` levels, the `SchedulerMsg` situations, the settle loop, and the URL-as-single-source-of-truth codec — with file:line evidence. Include Demo 1's typed view-stage codec as a worked example.
3. **Define "probabilistic by structure":** state precisely how a transition is determined by (data × situation) within a bounded, vocabulary-constrained space, versus a hand-authored graph. Enumerate what makes the space coherent-by-construction.
4. **Define the AI-generatable properties:** the concrete inputs a generating AI needs (data structures + situation) to produce a correct transition, and the constraints that keep a generated transition well-formed.
5. **Define the AI-operable properties:** what a produced transition must expose — stable identifiers, action affordances, legible state, loading/empty/error/success states — so an operating agent (incl. a browser WebMCP agent) can drive it deterministically and a human can still observe/interrupt it (A2A).
6. **Write the spec** to `.workaholic/specs/20260708-pragmatic-screen-transition-model.md`: current model (factual, cited) → the probabilistic model → AI-generatable properties → AI-operable properties → open questions handed to the DSL. Cross-reference the input-field model spec (sibling ticket).

## Quality Gate

**Acceptance criteria** (documentation-only — no code gate):

- `.workaholic/specs/20260708-pragmatic-screen-transition-model.md` exists and resolves, for the transition scope, the concept's open questions: (a) how a transition is determined by data × situation, (b) the concrete AI-generatable properties, (c) the concrete AI-operable (WebMCP/MCP-Apps) properties incl. human-observability/interruptibility.
- Every factual claim about the current model cites the code (`packages/plggmatic/src/Schedule/**`, `Render/**`, or the Demo 1 sample) by path; proposed/target properties are marked as such.
- The spec is grounded in ≥1 existing sample (the scheduler and/or Demo 1) with file references, not abstract prose.
- The developer reviews and accepts the spec.

**Verification method:**

- Developer reads the spec against the concept doc's open-questions list and confirms each transition-scope item is answered with evidence.
- `grep` the spec for un-cited "should"/"will" claims about current behavior (objective-documentation) — none remain unqualified.

**Gate:**

- The spec answers the transition-scope checklist with sample-grounded, cited evidence AND the developer accepts it.

## Considerations

- Sibling ticket `20260708213946-specify-pragmatic-input-field-model.md` specifies the input half; keep a single shared definition of the "AI-generatable / AI-operable" property set so the two specs compose into one model (define it here or in a shared section, don't fork it).
- This spec is a proto-DSL input: prefer expressing the model as typed data/vocabulary so the eventual DSL distillation is a generalization, not a rewrite (`packages/plggmatic/src/Schedule/model/`).
- Feeds the `/trip` on `20260708195655` (plggmatic package boundaries): the transition model helps decide what is generic plgg-family engine vs Pragmatic design-system identity — cross-reference, don't pre-decide the boundary here.
- Keep it descriptive of the current samples first; do not over-specify ahead of what the samples have actually proven (the concept is still being discovered empirically).
