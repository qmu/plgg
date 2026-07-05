# plgg-mcp

A **hand-rolled JSON-RPC 2.0 / Model Context Protocol
server**, written from scratch on
[plgg](/packages/plgg/) primitives and the Node
standard library — **no `@modelcontextprotocol/sdk`, no
third-party JSON-RPC library** (decision D15,
vendor-neutrality). MCP is a wire format, and a wire
format is expressible as typed, `Result`-returning
functions. It exposes the served
[plggpress](/packages/plggpress/agent-surfaces) content
to MCP-speaking agents.

## Writing an app with it

The server is layered plgg functions; a transport
drives them. The **stdio** transport is the
line-delimited `process.stdin`/`stdout` loop that MCP
clients spawn, exposing read-only content tools over
[plgg-content](/packages/plgg-content)'s query
functions:

- `search_content` — BM25/RAG search over the index.
- `get_article` — fetch one document.
- `list_collections` — enumerate collections.

The same server also mounts over **Streamable HTTP** on
the served plggpress instance, protected as an OAuth 2.1
resource server (below).

## Vocabulary

- **Rpc** — JSON-RPC 2.0 messages
  (request/response/error) parsed and serialized
  **fail-closed**: a malformed frame is a typed error
  object, never a throw.
- **Mcp** — the method handlers (`initialize`,
  `tools/list`, `tools/call`) over a registry of typed
  tools.
- **Tools** — the read-only plggpress content tools,
  plus the account-holder write tools
  (`register_request`, `comment`) on the HTTP
  transport.
- **Transport** — the stdio line loop, and the
  Streamable HTTP transport mounted on plggpress.

## Two transports, one server

- **stdio** (first stage, D15) — read-only tools over a
  local process pipe; the only IO seam.
- **Streamable HTTP + OAuth** (second stage) — the same
  server mounted on the served instance and authorized
  against plggpress's own OIDC provider
  ([plgg-auth](/packages/plgg-auth)). **Scopes separate
  public read from account-holder write**: read tools
  need `plggpress:read`; the write tools
  (`register_request`, `comment`) require
  `plggpress:write` that only an account-holder token
  carries. A read token can never invoke a write tool —
  enforced per-tool on every `tools/call`, never
  failing open. An MCP client discovers the OP from the
  protected resource and runs a standard
  authorization-code flow (with PKCE and dynamic client
  registration) — no bespoke protocol.

## Why it exists

The MCP ecosystem ships an official SDK; carrying it
would contradict plgg's vendor-neutrality thesis, and
MCP is small enough to express directly. plgg-mcp is
that from-scratch server — fail-closed framing, typed
tool registry, and two transports — so the same corpus
that renders as HTML and answers the
[delivery API](/packages/plggpress/content-delivery) is
reachable as a first-class agent tool, locally over
stdio or remotely over OAuth-protected HTTP, and is
[exported as an installable Claude Code
plugin](/packages/plggpress/agent-surfaces).
