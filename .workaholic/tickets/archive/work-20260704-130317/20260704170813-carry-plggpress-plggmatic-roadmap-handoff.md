---
created_at: 2026-07-04T17:08:13+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: []
---

# CARRY CHECKPOINT — plggpress/plggmatic roadmap is written; proceed to /drive it

## Overview

This is a **carry checkpoint**, not implementation work. A planning session on
branch `work-20260704-130317` produced the full plggpress-as-CMS /
plggmatic-as-framework roadmap and its decision record. All of it is already on
disk as durable state; nothing is mid-edit. A fresh session should read this
file, then **`/drive` the 31 roadmap tickets in dependency order** (they live in
this same directory). The single source of truth is
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` (decisions D1–D18,
phased roadmap, phase quality gates, cross-ticket coordination notes).

What the roadmap covers: rewrite plggpress on plggmatic (D1/D3, theme-first),
plgg-view Cmd/Sub effects (D2), a monochrome role×variant design-token system
(D9), a declarative UI scheduler with multi/single-column renderers (D1/D10),
dual-mode serve (D5), git-primary content with a derived SQLite index + FTS5 +
delivery API (D4/D11/D8), OIDC OP+RP auth with an account/roles/invites layer
(D6/D7), stakeholder requests/comments accumulation, RAG embeddings (D11/D12),
an OpenAI Realtime voice agent (D12), a hand-rolled MCP server (D15), a Claude
Code plugin export that will replace the workaholic plugin (D17), and the
**sacrificial-architecture pillar** (D18): app shell is disposable/regenerated,
the data+domain+contracts are the durable core the framework protects.

## Policies

- `workaholic:implementation` / `objective-documentation` — this checkpoint is
  documentation for a future agent; every claim here is verifiable against the
  named files and the git tree, not narrative.
- `workaholic:implementation` / `operational-planning` — shaped as a recovery
  checkpoint for the context-exhaustion scenario: a fresh session can resume the
  exact priority without the prior conversation.

## Key Files

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record (D1–D18) + roadmap table + phase quality gates + coordination notes.
  **Read this first.**
- `.workaholic/tickets/todo/a-qmu-jp/20260704143001-*.md` … `…143031-*.md` — the
  31 roadmap tickets (30 features + ticket 31 the durable-core spine).
- `.workaholic/tickets/todo/a-qmu-jp/20260704143031-durable-core-sacrificial-shell-boundary.md`
  — the D18 foundational spine; prerequisite for tickets 09/17/18.
- Memory `project_sacrificial_architecture.md` — the D18 pillar, durably saved.

## Related History

- The roadmap was derived from a workflow that mapped every plgg subsystem
  against the vision; all D-decisions were confirmed interactively by the author
  on 2026-07-04. No prior CMS spec/ticket existed in `.workaholic` before this.
- Ticket-first workflow honored: no source code was written this session (git
  shows only the spec, the spec index, and the todo/ tickets as changes).

## Implementation Steps

1. Read the roadmap spec (link above) end to end — it carries the decisions each
   ticket assumes.
2. Run `/drive`. The dependency graph is acyclic and fully resolvable; the
   natural start order is **01 (cleanup) → 02 (coverage gate) → 03 (token
   matrix) → 06 (plgg-view effects) → 14 (serve mode) → 15 (FTS5) → 31 (durable
   core spine)**, then their dependents. `depends_on` frontmatter — not the phase
   table — is authoritative for ordering.
3. Resolve these three loose ends (they are NOT captured inside any feature
   ticket):
   - **Ticket 31** was authored after the readiness/enrich pass, so it did not go
     through that review. Give it one readiness check (or author-verify) before
     driving it. Its cited paths were verified to exist.
   - **Ticket 11** (single-column-renderer) has two extra `##` sections before
     `## Overview` (a "Blocking precondition" note) — cosmetic lint warn only;
     fold into Overview if a clean format is wanted.
   - **Ticket 27** (plgg-mcp-http-oauth) needs the OP access-token-format
     decision recorded in the spec's coordination notes: bearer-via-JWKS requires
     the OP to issue JWT access tokens; otherwise ticket 27 validates via token
     introspection. Decide in ticket 19/27 before implementing 27.

## Quality Gate

**Acceptance criteria**
- A fresh session can resume with no dependence on the prior conversation, using
  only this file + the roadmap spec.
- The 31 tickets remain valid: 8 frontmatter fields each, bare (unquoted)
  `depends_on`, all edges resolve, graph acyclic.

**Verification method**
- Confirm the queue: `ls .workaholic/tickets/todo/a-qmu-jp/*.md | wc -l` → 32
  (31 roadmap tickets + this checkpoint).
- Re-run the graph check if desired (acyclic + topologically resolvable was
  verified 2026-07-04).

**Gate**
- This is a capture-only checkpoint; the gate is simply that `/drive` finds the
  priority and the roadmap tickets are intact. No build, commit, or archive is
  part of /carry.

## Considerations

- Do not treat this checkpoint as implementation work — it exists to orient the
  next session. Once /drive is underway on ticket 01, this file can be archived.
- Nothing is uncommitted-but-lost: the only working-tree changes are the spec,
  the spec index, and the todo/ tickets — all intended, none staged/committed
  (committing/archiving is out of /carry scope).
- Sequencing is hybrid (D18): the design-system track (tickets 01–08) is
  unblocked so the theme-first runnable demo (D3) lands before the heavier
  data/domain tickets that wait on the spine (31).
