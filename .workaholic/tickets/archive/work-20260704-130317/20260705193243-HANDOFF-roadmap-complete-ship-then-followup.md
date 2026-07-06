---
created_at: 2026-07-05T19:32:43+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.1h
commit_hash:
category:
depends_on: []
---

# HANDOFF — plggpress/plggmatic roadmap COMPLETE (20/20). Next: /ship this branch, then the follow-up program. NOT a code ticket.

## Read this first

This is a **completion handoff**, not work to `/drive`. There is **NO in-progress
implementation** and **NO remaining roadmap ticket**. A fresh session should NOT
try to build this ticket — archive/delete it and take the **Next actions** below.

## Position (2026-07-05 ~19:32 JST)

- Branch **work-20260704-130317**, HEAD **c8a22903**, tree **clean**,
  `scripts/check-all.sh` **green** at the last run.
- **20 of 20 roadmap tickets COMPLETE + archived** (in
  `.workaholic/tickets/archive/work-20260704-130317/`): 09, 10, 11, 12, 13, 16,
  17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 185202. **Todo is empty.**
- **74 commits** on this branch, each a per-slice green commit behind a fresh
  check-all, strict house style (no as/any/ts-ignore), each ticket archived with a
  full engineering Final Report.

What was built (11 phases): the declarative-UI framework (09-13), content spine +
FTS5 (16-17), OIDC OP+RP auth (19), admin + THREE DB-primary domains
(stakeholder/drafts/media, 20-23), zero-dependency RAG (24), the browser voice
agent (25), a brand-new hand-rolled MCP package with stdio + HTTP/OAuth transports
+ plugin export (26/27/30), production ops + rollout (28/29), and the
high-blast-radius plgg-bundle vendor-boundary refactor (185202, off the exemption
list, verified by the full build).

## Next actions (in order)

1. **`/ship`** this branch — it is the merge candidate: 20/20 tickets, all green.
   Review the diff, open the PR to `main`, per `reference_release_flow`
   (publish-release.sh CalVer + publish-npm.sh) if a release is intended. This is
   the immediate next step; the branch has been accumulating since 2026-07-04.
2. Then open the **follow-up program** as its own ticket series (NOT part of this
   finished roadmap). Seeds, consolidated from the archived Final Reports:

### Deploy-time wiring (the served instance's loose ends)
Every dynamic Web is BUILT + TESTED + MOUNTED behind pressServer's single route()
seam, but the mount uses placeholders a real deploy must thread — per
`packages/plggpress/OPERATIONS.md`:
- The **served origin** (mount today uses a placeholder issuer `https://plggpress.local`,
  `:memory:` stores, and `mcpUrl = base + /mcp`). Thread the real origin.
- **Persistent DB paths** (auth/content/stakeholder/draft/asset stores are all
  `:memory:` for the process lifetime) + the backup cron (backupDatabase / VACUUM
  INTO rolls the filename) + WAL is already on.
- **Operator keys** (all None by default → graceful darkness): the LLM key
  (embedderFromConfig → RAG cosine; today FTS5-only) and the realtime key
  (minterFromConfig → the voice agent; today /api/agent/session is 404, UI dark).
  Supplying a key LIGHTS the feature up — no code change (ticket 29's progressive
  lighting).
- systemd `Restart=always` + cloudflared route + `0600` secret mounts (OPERATIONS.md).

### Ticket 25 — the one browser-verified seam
The whole voice agent is built + wired; the only piece VERIFIED in a browser (not
the node harness) is `realtimeBackend` (the RTCPeerConnection SDP handshake against
the live OpenAI Realtime endpoint — coverage-excluded, DOM-declared). Verify it in
a real browser + mic once a key is configured; `plgg-fetch` SSE streaming is a
small follow-up if token streaming is later wanted.

### qmu-on-plggpress migration (a NEW program — see ticket 29's ROLLOUT.md)
The platform is done; migrating qmu.co.jp onto it is a separate ticket series:
content migration (ticket-17 casters) → auth mapping (ticket 19 OP+RP) → deploy
(OPERATIONS.md) → plugin cutover (ticket 30 replaces the workaholic plugin) → gap
assessment (multi-writer = D5 revisit trigger; large-corpus ANN = D11 trigger).
`packages/site` (@plggmatic/site) stays an SSG reader (the dogfood).

### Minor tidy-ups (non-blocking)
- Stale comment in `pressServer.ts` (~line 116) says plgg-kit "is not yet a
  plggpress dep" — it IS now (ticket 25). One-line fix.
- Other packages still on the vendor-boundary exemption list (plgg-server,
  plgg-test, plggpress, example, plggmatic-example) — each a future boundary ticket
  like 185202 was for plgg-bundle.

## Context (memory-backed)

Standard: no as/any/ts-ignore; Option/Result; exhaustive match; printWidth 50;
>90%/>91% four-metric coverage. Release flow: `reference_release_flow`
(`/ship`-driven, publish-release.sh + publish-npm.sh). Proven session patterns are
in the archived Final Reports (injected-seam + Option gate; coverage-exclude
network/browser seams; base64/JSON-for-binary-in-SQLite; the single route() mount
seam; new-package scaffold; vendor-boundary via vendors/). `reference_cloudflared_tunnel`
(the guide already serves at plgg-guide.qmu.dev → :5181).

## Quality Gate

**Acceptance for this handoff**: a resuming session removes this ticket, runs
`/ship` (or reviews the branch for merge), and — separately — opens the
qmu-on-plggpress + deploy-wiring ticket series. **Verify**: `git log` shows this
handoff gone; the branch is shipped/PR'd; check-all still green.
