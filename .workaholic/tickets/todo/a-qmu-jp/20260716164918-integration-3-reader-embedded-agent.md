---
created_at: 2026-07-16T16:49:18+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 4h
commit_hash:
depends_on: 20260716164917-integration-2-static-index-and-sitemap.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 3/8: the generated static site embeds the reader-side browser agent

## Overview

Third ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). Port PoC 2's proven reader agent into the plggpress
SSG output: agent UI + citations-next-to-evidence rendering
(`plgg-poc2-agent/src/app.ts`, `view.ts`), the `POST /api/answer` seam
(`answer.ts`/`protocol.ts`, key server-side, honest-404 without a key,
mirroring plgg-cms `agentWeb`), grounded in the shipped `fts.json` via
`plgg-search`.

## DECISION NEEDED (developer) — do not guess

plggpress currently ships ZERO client JavaScript. Embedding the agent
introduces a client bundle into the SSG — an architectural commitment. And the
answer seam's host for a *static* site must be chosen (tiny standalone
function vs. reusing plgg-cms). Ask before implementing.

## Quality Gate

- On a generated static site, the embedded agent answers corpus questions
  with citations linking into the live pages; honest 404 + banner with no key.
- No provider-shaped code in the shipped bundle.
- check-all green; >90% coverage on pure parts.

## Policies

- `workaholic:design` / `policies/security.md` — the model key stays behind
  the server session seam; the bundle carries nothing provider-shaped and the
  no-key state is an honest 404 + banner, exactly the PoC 2 contract.
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — the
  agent grounds through `plgg-search`'s declared seam, never a private index
  format.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `workaholic:design` / `policies/ux.md` — citations render next to the
  evidence they ground (the judged PoC 2 experience), not as bare links.
