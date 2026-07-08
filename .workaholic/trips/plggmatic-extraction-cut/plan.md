---
instruction: "20260708195655"
phase: planning
step: respond-to-feedback
iteration: 0
updated_at: 2026-07-08T23:54:41+09:00
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

- **2026-07-08 (lead)** — Step 2 (one-turn review) complete. Reviews committed:
  `round-1-planner.md` (ff6620d5), `round-1-architect.md` (f5208733),
  `round-1-constructor.md`. **Model v1 drew two "Request revision" votes**
  (Planner + Constructor), both on package count and `--pm` ownership; Direction
  and Design were approved with observations/minor. The team **converged** on one
  resolution, so Step 3 is a concurrent v2 revision round to fix the artifacts to
  it (no escalation needed):
  1. **One `plgg-ui` package** with a `plgg-ui/style` subpath (theme↔runtime
     boundary via subpaths; promotable to a standalone `plgg-scheme` later if a
     real theme-only consumer earns it). Architect conceded (Component↔Form cycle,
     `themeToggle`→`Component/model/interaction` make a clean scheme-only carve
     unbuildable now); doubling packages doubles the cross-repo contract.
  2. **`--pm` via a parameterized `Theme`**: values stay in `plgg-ui/style` as a
     neutral `defaultTheme` (may equal today's monochrome so plggpress is
     byte-identical, D16); plggpress passes that theme explicitly (imports
     `defaultTheme` from `plgg-ui`, never plggmatic); plggmatic owns the `Theme`
     contract + brand + DSL. Constructor corrected his own v1 "move values out".
  3. **Extract-now**: the plggmatic *cluster* (example + site + concept/specs)
     carries the mass; "small package" ≠ "empty extraction"; grow the DSL in
     `../plggmatic`.
  4. **Roadmap**: D13 reversed, D1 refined (framework→plgg-ui,
     design-system→plggmatic), D16 guarded (the `--pm` default lives in plgg-ui;
     do not later relocate it into plggmatic). Re-point 192518 onto plgg-ui;
     decline the plgg-view/style base-token fold (Color-type collision).

## Progress

- [x] planning/artifact-generation — Planner, Architect, Constructor v1 (lead-verified via commits)
- [x] planning/one-turn-review — round-1 reviews committed (ff6620d5, f5208733, + constructor)
- [ ] planning/respond-to-feedback — Architect→model-v2, Constructor→design-v2, Planner acceptance
