# Agent surfaces

How the served [plggpress](/packages/plggpress)
instance is reached by AI: opt-in retrieval, a browser
voice agent, an MCP server, and an installable Claude
Code plugin. Every surface **degrades gracefully** —
with no operator key configured, the retrieval falls
back to keyword search and the voice UI stays dark, so
the platform serves either way.

## RAG (opt-in embeddings)

The always-on baseline is FTS5/BM25 search
([Content & delivery](/packages/plggpress/content-delivery)).
The opt-in tier (decision D12) adds embeddings through
a single [plgg-kit](/packages/plgg-kit) vendor seam
(`generateEmbedding`), stores a per-chunk `Float32`
BLOB on the CMS-owned `chunks` index, ranks with an
in-JS cosine top-k, and serves a hybrid FTS5+vector
search — **with no API key it gracefully degrades to
BM25**. The retrieval endpoint (`ragSearch`) is exposed
over HTTP and is also the voice agent's tool-call
target.

## The voice agent

A conversational browser agent (decision D12): the
browser connects **directly** to the OpenAI Realtime
API using a short-lived ephemeral key the server mints,
and calls the RAG endpoint as its tool. plggpress's
only realtime responsibilities are:

- minting the ephemeral key — `POST /api/agent/session`
  (a [plgg-kit](/packages/plgg-kit) `mintRealtimeSession`
  seam over [plgg-fetch](/packages/plgg-fetch) with
  streaming + cancellation); and
- answering the agent's RAG tool call.

The agent itself is a [plgg-view](/packages/plgg-view)
TEA program. **With no realtime key configured,
`/api/agent/session` returns 404 and the whole voice UI
is hidden** — the graceful-darkness gate.

## MCP server

The same content is reachable by MCP-speaking agents
through the hand-rolled JSON-RPC 2.0 / MCP protocol
modules now owned by [plgg-cms](/packages/plgg-cms)
(no third-party SDK, decision D15) with two transports:

- **stdio** — the line-delimited `process.stdin/stdout`
  loop, exposing read-only content tools
  (`search_content`, `get_article`, `list_collections`)
  over the CMS-owned content query functions.
- **Streamable HTTP** — the same server **mounted on
  the served instance** and protected as an **OAuth 2.1
  resource server** against plggpress's own OP. Scopes
  separate public read tools (`plggpress:read`) from
  account-holder write tools (`register_request`,
  `comment` — the stakeholder accumulation) that
  require `plggpress:write`; a read token can never
  invoke a write tool, enforced per-tool and never
  failing open.

An MCP client discovers the OP from the protected
resource and runs a standard authorization-code flow
(with PKCE and dynamic client registration) — no
bespoke protocol.

### What ships today

The scope separation above describes `mcpWebGuarded`.
The **mount the served instance actually uses is the
unguarded `mcpWeb`** with the three read tools, so
`initialize`, `tools/list` and `tools/call` need no
`Authorization` header — which is the progressive-lighting
posture below, not an oversight. There are no write tools
registered, so there is nothing a read token could reach
that it should not.

Start an instance over a corpus and talk to it:

```
cd packages/guide
plgg-cms serve --config site.config.ts --contentDir . --port 3000
```

It prints how many pages it indexed (`indexed 39 page(s),
pruned 0`) before it serves, and `GET /health` reports the
same count — an index with nothing in it is visible from
outside rather than only as empty search results. Then:

```
curl -s -X POST localhost:3000/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"search_content","arguments":{"query":"pipeline"}}}'
```

`search_content` returns `{path, heading, rank}` — the
route and the section breadcrumb, not the body. To read
the page, pass that `path` together with the collection
name `list_collections` returns (`content`) to
`get_article`. All three tools are reads, so re-running
one is always safe.

The corpus the index holds is the same Markdown the
reader renders, walked at boot from `--contentDir` and
rebuilt on every start: an agent can only cite what a
human page also shows.

## Claude Code plugin export

The served instance exports an **installable Claude
Code plugin**: a marketplace-manifest endpoint plus an
auto-generated plugin (`.mcp.json` pointing at the
OAuth-aware `/mcp` endpoint, and skills derived from
the content structure), regenerated live from the
content index. So the same corpus that renders as HTML
and answers the delivery API is also installable as a
first-class agent tool.

## Why graceful degradation

Every AI surface is opt-in behind an operator key, and
absence is a first-class state, not an error: no
embeddings key → BM25; no realtime key → the voice UI
is hidden; the MCP read tools need no key at all.
Supplying a key **lights the feature up with no code
change** (decision D12 / ticket 29's progressive
lighting), so a plggpress instance is useful before any
vendor is configured and richer after.
