# plggpress rollout consolidation (ticket 29)

Phase 11's closing move. This does **not** build a new capability — it rolls what
tickets 09–30 built into production along three independent tracks, under D5
(dual-mode: the public reader stays SSG/CDN; the dynamic features run as one
always-on served instance).

## Track 1 — light up the guide's served features

The served instance mount (`pressServer.ts`, `pressServeWebWithAuth`) now composes
the reader router with EVERY dynamic subtree behind the single `route(...)` seam:

| Feature | Route | Auth | Ticket |
|---|---|---|---|
| Reader (SSG-identical) | `/*` | public | 07/14 |
| Delivery API + hybrid search | `/api/*` | public read | 16/24 |
| MCP over HTTP | `/mcp` | public read / bearer write | 26/27 |
| Plugin export | `/.claude-plugin/*`, `/.mcp.json` | public | 30 |
| Health | `/health` | public | 28 |
| OIDC OP + RP login | `/auth/*` | public flow | 19 |
| Admin UI | `/admin` | account-holder | 20–23 |
| Stakeholder requests | `/requests` | RP session | 21 |
| Guest editing | `/edit` | RP session + CSRF | 22 |
| Media upload/serve | `/media` | RP session + CSRF | 23 |

**Progressive lighting** (D5): the read-only public tier (`/api`, `/mcp`, plugin
export, `/health`) is lit with NO key — RAG degrades to FTS5, the MCP/plugin tools
are public read. The **key-gated** tier stays dark until the operator supplies keys
at deploy: RAG cosine re-ranking + the voice agent (`minterFromConfig` → None →
UI hidden). This is graceful degradation as a rollout strategy: ship the instance,
turn features on by adding config, never by redeploying code.

**Deferred to deploy config** (not code): the served origin (the mount uses a
placeholder issuer + `:memory:` stores + `mcpUrl = base + /mcp`); the persistent DB
paths; the operator LLM/realtime keys; the OP signing key. `OPERATIONS.md` is the
runbook for standing this up.

## Track 2 — `packages/site`'s fate

The design-system documentation site is itself a plggpress-built
SSG site — the canonical dogfood for its code fences.
**Decision: keep it, as an SSG reader.** It needs no dynamic tier (docs are
read-only, versioned in git), so under D5 it stays a pure static publish; it is the
living proof that the reader half of plggpress works. If it ever wants search/RAG,
it opts into a served instance with the SAME mount above — no fork. `packages/guide`
similarly keeps its static reader and gains the served features above when deployed.

## Track 3 — qmu.co.jp replacement assessment (seeds a new ticket series)

The spec's long-term goal: qmu.co.jp runs on plggpress, and the plugin export (ticket
30) replaces the workaholic plugin. That is a SEPARATE program, not this roadmap.
What it needs, as a seed for its own ticket series:

1. **Content migration** — import qmu.co.jp's existing corpus into the git-primary
   Markdown + typed-frontmatter model (ticket 17 casters); one collection schema per
   content type.
2. **Auth mapping** — map qmu's identities onto the OP+RP account model (ticket 19),
   or federate to an existing IdP as an upstream.
3. **Deploy** — a persistent-DB served instance per `OPERATIONS.md` (systemd +
   cloudflared + backup cron + secret mounts), fronted by the real qmu.co.jp origin;
   the reader on the CDN.
4. **Plugin cutover** — point Claude Code at the instance's generated plugin (ticket
   30) and retire the workaholic plugin once parity is proven.
5. **Assess gaps** — features qmu.co.jp needs that the roadmap did NOT build (e.g.
   multi-writer scale is the explicit D5 revisit trigger; large-corpus ANN is the
   D11 trigger). Each becomes a ticket.

**Recommendation**: open the `qmu-on-plggpress` ticket series against the deployed
guide/site instances as the reference, using this roadmap's 20 tickets as the
platform. The platform is complete; the migration is a new body of work.
