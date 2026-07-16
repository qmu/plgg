---
type: Mission
title: plggmatic AI-native UI toward a DSL
slug: plggmatic-ai-native-ui-toward-a-dsl
status: active
created_at: 2026-07-08T21:45:15+09:00
author: a@qmu.jp
tickets: [20260708213945-specify-pragmatic-screen-transition-model.md, 20260708213946-specify-pragmatic-input-field-model.md]
stories: []
concerns: []
---

# plggmatic AI-native UI toward a DSL

## Goal

plggmatic (the "Pragmatic" concept) is a UI design system **built for AI**: the UI is **AI-generatable**, and the generated UI is itself **AI-operable** — the same premise as MCP Apps / WebMCP, where an agent assembles the interface a task needs on demand and drives it. Given an AI that understands a domain's data structures and the procedures that update them, it can generate the interface the moment calls for, prompt operation (by the user or another agent), and perform the processing; if the generated UI is WebMCP-compatible, a browser-side agent can operate it to complete tasks on the user's behalf.

The mission's outcome is a **DSL**: an AI writes code in that language and the result is a working system **including its user interface** — on-demand UI. The full concept is recorded at [`.workaholic/specs/20260708-pragmatic-ai-native-ui-concept.md`](../../specs/20260708-pragmatic-ai-native-ui-concept.md).

## Scope

**In scope** — the empirical, staged path to the DSL:

1. **Build from samples** (in progress): discover from concrete apps (the plggmatic scheduler, the workbench, Demo 1) what a Pragmatic UI must be.
2. **Specify**: turn the discovered patterns into explicit, machine-legible specifications of the probabilistic screen-transition model and the input-field model — each defining the concrete AI-generatable and AI-operable (WebMCP/MCP-Apps) properties.
3. **Distill the DSL**: generalize the specifications into the DSL from which AI-authored, on-demand UIs are produced.

**Out of scope (for now):** the plggmatic → `../plggmatic` repo extraction (tracked separately, `20260708195655`+); it is informed by this mission's concept but is a packaging concern. The DSL implementation itself is a later stage — this mission's near-term deliverables are the specifications that ground it.

## Acceptance

<!-- checked over total, computed from this list -->

- [x] The Pragmatic concept is recorded as the project's north-star, done at mission creation (#20260708-pragmatic-ai-native-ui-concept.md)
- [x] The probabilistic screen-transition model is specified with concrete AI-generatable + AI-operable properties, grounded in the samples (#20260708213945-specify-pragmatic-screen-transition-model.md)
- [x] The input-field model is specified with concrete AI-generatable + AI-operable properties, grounded in the samples (#20260708213946-specify-pragmatic-input-field-model.md)
- [ ] The DSL is distilled from the specifications and produces a working on-demand UI from a declarative description (delivered by the `plggmatic-screen-structure-model-semantics` mission, migrated 2026-07-11 to the `qmu/plggmatic` repo; checked off here when that mission's DSL v1 lands)
- [ ] A generated UI is demonstrated to be WebMCP/MCP-Apps operable by a browser-side agent (delivered by the `plggmatic-screen-structure-model-semantics` mission in `qmu/plggmatic`; checked off here when its WebMCP adapter + prototype land)

## Changelog

- 2026-07-08 — mission created; Pragmatic concept recorded — 20260708-pragmatic-ai-native-ui-concept.md
- 2026-07-08 — filed the two specification tickets (transition model, input-field model) — 20260708213945-specify-pragmatic-screen-transition-model.md, 20260708213946-specify-pragmatic-input-field-model.md
- 2026-07-08 — ticket archived — 20260708213945-specify-pragmatic-screen-transition-model.md
- 2026-07-08 — ticket archived — 20260708213946-specify-pragmatic-input-field-model.md
- 2026-07-11 — story reported — work-20260706-120449.md
- 2026-07-11 — concern deferred (stuck) — 61-89-standing-deferred-concerns-carried-prs.md
- 2026-07-11 — concern deferred (stuck) — 61-npm-publish-gate-depends-on-the.md
- 2026-07-11 — concern deferred (stuck) — 61-plgg-cms-coverage-sits-at-a.md
- 2026-07-11 — concern deferred (stuck) — 61-demo-1-s-css-overrides-hard.md
- 2026-07-11 — concern deferred (stuck) — 61-plgg-ui-s-package-boundary-was.md
- 2026-07-11 — concern deferred (stuck) — 61-registry-consumability-blockers-were-fixed-reactively.md
- 2026-07-11 — concern deferred (stuck) — 61-demo-1-record-data-is-in.md
- 2026-07-11 — concern deferred (stuck) — 61-demo-2-s-pre-existing-button.md
- 2026-07-11 — remaining DSL/WebMCP items delegated to the screen-structure mission, migrated to qmu/plggmatic — mission.md
- 2026-07-16 — ticket archived — 20260716112612-resume-decide-the-domain-dialect-shape.md
- 2026-07-16 — story reported — work-20260716-115204.md
- 2026-07-16 — concern deferred (stuck) — mapdialect-is-new-public-surface-with.md
- 2026-07-16 — concern deferred (stuck) — new-exports-are-not-yet-on.md
