---
created_at: 2026-07-16T16:49:21+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Config]
effort: 4h
commit_hash:
depends_on: 20260716164920-integration-5-agent-file-edits-coediting.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 6/8: agent-maintained central configuration on the real SiteConfig

## Overview

Sixth ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). Map PoC 5's proven typed-config loop onto plggpress's
real `SiteConfig`: the closed-union color/sizing/layout dials with exhaustive
`switch` (`plgg-poc5-config/src/config.ts`), `ConfigOp` + total `applyOp`
(`apply.ts`), the deterministic typed-command parser (`command.ts`), and the
five agent tools (`set_tag`, `exclude_path`, `include_path`,
`set_sizing_theme`, `set_layout`).

## DECISION NEEDED (developer) — do not guess

PoC 5's accepted sacrificial bound was client-state-only: its verdict says
"production plggpress owns where generated config durably lives." Decide the
persistence target — write back to `site.config.ts`, a generated sidecar file,
or through the `exportFs` atomic-write seam (shares ticket 5's write-seam
decision).

## Quality Gate

- Asking the agent (typed command or voice) to reclassify a tag, exclude a
  path, and switch sizing theme produces a valid persisted configuration the
  real site renders after rebuild/hot-reload.
- Every dial stays a closed union with exhaustive rendering — adding a value
  without handling it is a compile error.
- check-all green; >90% coverage.

## Policies

- `workaholic:implementation` / `policies/type-driven-design.md` — the closed
  dials + total applier are the durable-core guarantee this feature exists to
  demonstrate.
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — one
  persistence seam shared with ticket 5, not a new write path.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
