---
instruction: "20260708195655"
phase: planning
step: one-turn-review
iteration: 0
updated_at: 2026-07-08T23:47:22+09:00
---

# Trip Plan

## Initial Idea

20260708195655 — settle the plggmatic package "cut": where to draw the boundary
between the reusable plgg-family engine/theme (stays in this monorepo, consumed
by both plggpress and the extracted plggmatic) and the plggmatic-branded
"Pragmatic" identity + DSL (ships to ../plggmatic). Design-only run with a
pre-build developer pause (developer approves the cut before any build).

## Plan Amendments

- **2026-07-08 (lead)** — Step 1 (concurrent artifacts) complete. Three v1
  artifacts committed: `directions/direction-v1.md` (445c18ad),
  `models/model-v1.md` (04678cfb), `designs/design-v1.md` (752d5dab). A core
  divergence surfaced for the one-turn review to resolve: **package count** —
  Architect proposes TWO packages (`plgg-scheme` + `plgg-ui`), Constructor
  proposes ONE (`plgg-ui`, engine+theme together); and **`--pm-*` design-language
  ownership** — neutral plgg-family infra (Architect v1) vs. owned by the
  extracted plggmatic via a parameterized Theme (Constructor v1 A3, offered as
  the answer to the empty-shell risk). Both agree the identity/DSL/showcase ship
  to ../plggmatic and the dependency direction is upward-only.

## Progress

- [x] planning/artifact-generation — Planner, Architect, Constructor v1 (lead-verified via commits)
- [ ] planning/one-turn-review — each agent reviews the other two artifacts
