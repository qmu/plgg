---
created_at: 2026-07-04T14:30:25+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, UX]
effort:
commit_hash:
category:
depends_on: [20260704143006-plgg-view-cmd-sub-effects.md, 20260704143014-plggpress-serve-mode-dual-config.md, 20260704143019-plggpress-oidc-rp-integration.md, 20260704143021-requests-and-comments-accumulation.md, 20260704143024-rag-embeddings-and-search.md]
---

# Conversational browser voice agent: a `plgg-kit` **ephemeral-key mint** seam, `plgg-fetch` **streaming + cancellation** underneath, a plggpress `POST /api/agent/session` mint route, and a plgg-view TEA agent that talks to the **OpenAI Realtime API directly** and calls ticket 24's `ragSearch` as its tool — **the whole UI hidden/disabled when no API key is configured**

## Overview

Phase 9 (Voice agent), ticket **25** of the plggpress/plggmatic roadmap — the
only ticket in its phase. It builds the spec's headline stakeholder feature: a
*"conversational browser agent using the OpenAI Realtime API (user speaks →
agent searches the RAG DB → answers), so stakeholder interactions accumulate
inside plggpress"* (spec Vision). It consumes ticket **24**'s server-side
`ragSearch` retrieval endpoint as the agent's tool-call target and delivers the
**other half of D12** that ticket 24 explicitly deferred here: ephemeral-key
minting in plgg-kit, `plgg-fetch` streaming+cancellation, the browser voice
loop, and the *agent-UI-hidden-with-no-key* half of the Phase 8/9 gate. Decision
record: `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Two governing decisions, transcribed here so an implementer need not open the
spec:

- **D12 — LLM seam & Realtime:** *"**plgg-kit is the single active vendor seam**
  (settles retired-vs-live ambiguity: it is LIVE). Add embeddings/streaming/
  **ephemeral-key minting** there; **plgg-fetch gains streaming+cancellation
  underneath**. Realtime agent = **browser connects directly to OpenAI** with
  **server-minted ephemeral keys**; the server also exposes the RAG tool-call
  endpoint. Vendor kept swappable behind the seam."* This is the architecture of
  the ticket. Ticket 24 already added `generateEmbedding` to plgg-kit's `LLMs`
  seam; this ticket adds the **`mintRealtimeSession`** sibling (the third D12
  verb) in the *same* `Provider`-dispatch + injectable-`post` + `env`-key-
  fallback shape, and the **streaming + cancellation** that D12 puts
  *"underneath"* into `plgg-fetch`. The realtime media loop is deliberately
  **not** proxied through our server: the browser opens its own connection to
  `https://api.openai.com/v1/realtime` using a **short-lived ephemeral key** the
  server minted with the real key — the real key never reaches the browser. The
  server's only realtime responsibilities are (a) minting that ephemeral key
  (`POST /api/agent/session`) and (b) answering the agent's RAG **tool call**
  (ticket 24's `GET /api/rag?q=…`). **Vendor kept swappable**: the only place an
  OpenAI realtime endpoint or the mint HTTP call appears is the plgg-kit vendor
  file — swapping the realtime vendor is a one-file change behind the seam.

- **D11 / spec-line-105 — graceful degradation (the *agent-UI-hidden* gate):**
  D11's *"Graceful degradation without an API key"* and the Phase 8/9 quality
  gate (spec line 105) — *"explicit degraded behavior verified with NO API key
  configured (FTS5 fallback; **agent UI hidden/disabled**)"* — are a **hard
  requirement**, not a nicety. Ticket 24 owns the *FTS5 fallback* half; **this
  ticket owns the *agent-UI-hidden/disabled* half**. With **no** LLM API key
  configured: `mintRealtimeSession` yields a typed `Err` (never a throw), the
  `POST /api/agent/session` route reports the agent **disabled** (never a 500),
  the served page's `agentEnabled` flag is **false**, and the browser agent
  widget is **not rendered / disabled** — the CMS's *"minimal, zero-dependency
  identity"* (spec Vision) must hold for an operator who never configures a key.
  The voice feature is strictly **opt-in**, activated by configuring a key,
  exactly like ticket 24's embeddings tier.

Where each piece lands (four seams, four owners):

1. **`plgg-fetch` (streaming + cancellation, D12 "underneath"):** `RequestOptions`
   gains an optional `signal?: AbortSignal` (cancellation) threaded into the
   native `RequestInit`, and a **streaming** read path (a `ReadableStream`/async
   chunk reader) beside today's `response.text()` full-buffer path — so the
   plgg-kit seam can stream and abort. This is the *only* package touched below
   the seam.
2. **`plgg-kit` (ephemeral-key mint, D12):** a new `mintRealtimeSession` usecase
   beside ticket 24's `generateEmbedding` and the existing `generateObject`, with
   a per-vendor request builder (`reqRealtimeSessionGPT`) beside `reqObjectGPT`.
   This is the swappable realtime-vendor boundary and the *only* place the real
   key is used to mint an ephemeral one.
3. **plggpress serve mode (mint route + agent-enabled probe):** a `POST
   /api/agent/session` route mounted at ticket 14's `pressServeWeb` seam that
   mints an ephemeral session **only when a key is configured** (else reports
   disabled), plus an `agentEnabled` flag surfaced to the page. The RAG tool
   endpoint (`GET /api/rag?q=…`) is **ticket 24's**, consumed unchanged.
4. **Browser agent UI (plgg-view TEA, ticket 06's Cmd/Sub):** a plgg-view
   `application` whose `update` returns `Cmd<Msg>` to mint a session, open the
   direct-to-OpenAI realtime connection with the ephemeral key, stream mic audio,
   and — on the model's RAG **tool call** — fetch `/api/rag?q=…` and feed the
   hits back; `Sub`scriptions carry the incoming realtime events. Hidden/disabled
   when `agentEnabled` is false.

The **Phase 8/9 quality gate** the spec pins for this ticket (spec line 105):
the *agent-UI-hidden/disabled* half of *"explicit degraded behavior verified
with NO API key configured."* This ticket must **prove**, with specs and a
served smoke, that with the key **unset** the agent UI is absent/disabled and
the mint route reports disabled — never a crash — while with a key the session
mints and the browser connects.

Scope guardrails (siblings own the rest): the RAG retrieval — `ragSearch`,
`vectorSearch`, the `Rag/` domain, the `embedding BLOB` column, the FTS5
fallback, and the `GET /api/rag` endpoint — is **ticket 24's** and is
*consumed, never re-implemented*; this ticket does **not** touch embeddings,
cosine top-k, or FTS5. `generateEmbedding`, `generateObject`, the `Provider`
sum, and the vendor request builders are **plgg-kit's existing live seam**; this
ticket adds a `mintRealtimeSession` sibling in the same shape, it does **not**
introduce a second vendor abstraction. `pressServeWeb`/`pressServer`, the
`serve` verb, and the `route("/api", …)` mount are **ticket 14's**; the
delivery sub-app and `ingestFromConfig` are **ticket 16's**; the plgg-view TEA
runtime and the `Cmd`/`Sub` effects the browser loop needs are **ticket 06's**;
the plgg-view-client-served-inside-plggpress precedent is **ticket 20's** — this
ticket adds one route, one client entry, and one agent domain, it does **not**
re-architect the server or the renderer. MCP exposure of the RAG tool is
**tickets 26/27**. The Claude Code plugin export is **ticket 30**.

## Policies

- `workaholic:design` / `policies/security.md` — the realtime path handles a
  **secret** (the operator's LLM API key) and an **untrusted** browser. Four
  boundaries enforced here: (a) **the real key never reaches the browser** — it
  is used *only* server-side by `mintRealtimeSession` to mint a short-lived
  ephemeral key; the browser receives *only* the ephemeral `client_secret` (a
  time-boxed token), never the real key, never in any served HTML or JS bundle.
  (b) **key handling** — the real key is resolved only through the plgg-kit
  seam's existing discipline (the provider's `Option<apiKey>` or
  `env("OPENAI_API_KEY")` via `generateObject`/`generateEmbedding`'s pattern),
  never logged, never returned to a client. The mint HTTP call rides `postJson`,
  already `redirect: "manual"` so the `Authorization: Bearer` header cannot leak
  on a redirect. (c) **the mint route is the trust boundary** — `POST
  /api/agent/session` is the *only* place a browser can obtain a realtime
  credential; it must be behind the same session/CSRF posture ticket 19/20
  establish for authenticated routes (the voice agent is a signed-in stakeholder
  feature per the Vision), rate-limited-shaped, and mints a **narrowly-scoped,
  short-TTL** ephemeral key. (d) **no-key is a clean disabled state, never a
  500** — with no key the mint route returns a typed *disabled* response and the
  UI hides; a missing secret must degrade, not error.
- `workaholic:implementation` / `policies/recovery.md` — **D4** (Git/filesystem
  primary; DB derived) and D5 (dual-mode; the public reader stays SSG/CDN) still
  hold: the voice agent is a **served-instance-only** dynamic feature (spec
  D5) — it must be **byte-invisible to the SSG output** (the `build`/`pressRouter`
  render path is untouched; the agent client is mounted only in `pressServeWeb`).
  The realtime connection is **stateless and disposable**: a dropped connection,
  an expired ephemeral key, or a cancelled request self-heals by re-minting (the
  `AbortSignal`/cancellation path exists precisely so a stale realtime request
  is torn down cleanly, never leaking a connection). No realtime state is
  persisted here; the *accumulation* of stakeholder interactions into the DB
  (spec Vision) rides the requests/comments store (ticket 21) and the RAG index
  (ticket 24), not new tables in this ticket.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine, co-located `.spec.ts` (flat `test()`, absolute imports),
  and "test against the real engine": the plgg-kit `mintRealtimeSession` seam is
  tested with an **injected `post` fake** (no network) exactly as `generateObject`
  /`generateEmbedding`'s specs do — asserting request assembly, the ephemeral-
  token decode, the **no-key `Err`**, and the unsupported-provider `Err`. The
  plgg-fetch streaming + cancellation is tested against **real `fetch`** through
  the existing seam (a streamed body reads back chunk-for-chunk; an aborted
  request folds to a typed `ClientError`, not a hang or a throw). The browser
  agent `application` is tested through plgg-view's **pure TEA** surface
  (`init`/`update` return the right `Cmd`; the tool-call `Msg` triggers the
  `/api/rag` fetch `Cmd`; the no-key path yields the disabled model) — no live
  microphone/WebRTC in the spec; the media seam is injected. The **degraded
  path** (no key → mint `Err` → route disabled → UI hidden) is an **enumerated
  required** spec, not left to line-count luck. **plgg-kit currently ships with
  no `plgg-test.config.json`** (silently ungated — the exact D14 defect ticket 02
  hardens and ticket 24 also flags); the realtime seam lands **with** a ≥90
  config for plgg-kit (or after ticket 02/24 has already added one) so it is
  gated from its first commit. plgg-fetch is **already gated ≥90**
  (`packages/plgg-fetch/plgg-test.config.json` exists) — the new streaming/
  cancellation code must clear that gate. plggpress stays ≥90.

## Key Files

- `packages/plgg-fetch/src/Http/usecase/request.ts` — today's `RequestOptions`
  (`headers`/`query`/`body`) and `request(method, url, options)` read the whole
  body via `response.text()` (see `fromFetchResponse` in `seam.ts`) and pass no
  abort signal. This ticket: (a) add `signal?: AbortSignal` to `RequestOptions`
  and thread it into the native `RequestInit` (**cancellation**, D12); (b) add a
  **streaming** entry — e.g. `requestStream`/`stream(method, url, options)` —
  returning the response body as a `ReadableStream<Uint8Array>` (or a typed async
  chunk iterator) instead of buffering to text, so the plgg-kit seam can stream.
  Both fold transport/abort failures to the existing typed `ClientError`
  (`networkError`), never a throw. Symmetric with the buffered `request`.
- `packages/plgg-fetch/src/Http/usecase/seam.ts` — `toRequestInit` currently
  sets `method`/`headers`/`redirect: "manual"` only; extend it to include
  `signal` when present (avoid passing `undefined` under
  `exactOptionalPropertyTypes`, matching the existing `hasBody` guard style).
  `fromFetchResponse` reads `response.text()`; add a sibling that exposes
  `response.body` as the stream reader (the second, streaming seam function),
  keeping the `opaqueredirect` → `redirectError` guard.
- `packages/plgg-fetch/src/Http/usecase/index.ts`, `src/Http/index.ts`,
  `src/index.ts` — barrels to extend with the streaming entry in the existing
  `export *` style. plgg-fetch's `exports` map already carries `types`+`default`
  under both `import` and `require` (`packages/plgg-fetch/package.json`) — no
  export-map change needed there.
- `packages/plgg-fetch/plgg-test.config.json` — plgg-fetch's **existing** ≥90
  four-metric gate; the new streaming/cancellation code must clear it.
- `packages/plgg-kit/src/LLMs/usecase/mintRealtimeSession.ts` (**new**) — the
  ephemeral-key mint entry, mirroring
  `packages/plgg-kit/src/LLMs/usecase/generateObject.ts` (lines 25–108) and
  ticket 24's `generateEmbedding.ts`: signature
  `({ provider, model?, voice?, post = postJson }: { provider: Provider;
  model?: string; voice?: string; post?: typeof postJson }):
  PromisedResult<EphemeralSession, unknown>`. Resolves the key from
  `provider.content`'s `Option<apiKey>` else `env("OPENAI_API_KEY")` (the exact
  `isSome(apiKey) ? ok(apiKey.content) : match(provider)([openAI$(), () =>
  env("OPENAI_API_KEY")], …)` branch `generateObject` uses), then dispatches via
  exhaustive `match(provider)` over `openAI$()/anthropic$()/google$()` to the
  vendor builder. **No key resolvable → an `Err` on the `Result` channel** (never
  a throw) — the caller in plggpress reads that `Err` as "agent disabled".
- `packages/plgg-kit/src/LLMs/model/EphemeralSession.ts` (**new**) — the minted-
  session value (`Obj<{ token: SoftStr; expiresAt: number; model: string }>` or
  `Str`-branded per `project_str_over_softstr`) + its caster `asEphemeralSession`,
  in the `defineVariant`/`cast`/`forProp` shape of `Provider.ts`. This is the
  only shape crossing the mint route to the browser — it carries the **ephemeral**
  token, never the real key.
- `packages/plgg-kit/src/LLMs/vendor/OpenAI.ts` — add `reqRealtimeSessionGPT`
  beside `reqObjectGPT` (line 14): `POST
  https://api.openai.com/v1/realtime/sessions` with `{ model, voice }`,
  `Authorization: Bearer <apiKey>`, through the injectable `post`; decode
  `client_secret.value` (the ephemeral token) and `client_secret.expires_at` via
  `atProp`/`atIndex` + casters into an `EphemeralSession` (the same decode
  discipline `reqObjectGPT` uses for `output[0].content[0].text`). Anthropic/
  Google get a realtime builder only if their branch is exercised; an unsupported
  provider returns a typed `Err`, never a throw. **Vendor kept swappable** (D12):
  this file is the only place an OpenAI realtime endpoint appears.
- `packages/plgg-kit/src/LLMs/usecase/index.ts`, `src/LLMs/index.ts`,
  `src/index.ts` — barrels to extend with `mintRealtimeSession` and
  `EphemeralSession` in the existing `export * from …` style (mirroring how
  ticket 24 barrels `generateEmbedding`).
- `packages/plgg-kit/plgg-test.config.json` (**new, or delivered by ticket
  02/24**) — a ≥90 four-metric threshold so the realtime seam is gated (D14:
  *"gate plgg-kit"*; the missing file today is the silent-ungating default ticket
  02 fixes and ticket 24 also flags). Verify it exists before merging; add it
  here if a predecessor has not. (Confirmed absent today:
  `packages/plgg-kit/plgg-test.config.json` does not exist on the branch.)
- `packages/plggpress/src/server/pressServer.ts` — **ticket 14's** `pressServeWeb`
  mount seam (`pressServeWeb(contentDir, config, base)(paths)` returning the
  `Web`; ticket 16 mounts `route("/api", deliveryApi(...))` here, ticket 19 the
  OP/RP routes, ticket 20 the `route("/admin", …)`). This ticket adds the agent
  mounts **here and only here**: the `POST /api/agent/session` mint route and the
  agent client bundle/page. The SSG `build`/`pressRouter` path stays
  byte-untouched (D5).
- `packages/plggpress/src/DeliveryApi/usecase/deliveryApi.ts` — **ticket 16's**
  `plgg-server` `Web` sub-app wiring query functions to `GET` routes via
  `plgg-http`'s `jsonResponse` (`packages/plgg-http/src/Http/model/HttpResponse.ts`
  line 91). This ticket adds the `POST /api/agent/session` handler that calls
  `mintRealtimeSession` **only when a key is configured** (else `jsonResponse`
  with an `{ enabled: false }`-shaped body, never a 500). The RAG tool endpoint
  `GET /api/rag?q=…` is **ticket 24's** on this same sub-app — consumed unchanged.
- `packages/plggpress/src/DeliveryApi/usecase/ingestFromConfig.ts` — **ticket 16
  /24's** boot ingest; this ticket reuses the **same** one-time key probe (a key
  present at boot → `agentEnabled: true`) to surface the `agentEnabled` flag to
  the page; no key → `false`. No new config surface.
- `packages/plggpress/src/Agent/` (**new** domain in the `model/`/`usecase/`
  shape): `model/AgentState.ts` (a TEA `Model` — an exhaustive sum
  `Idle | Connecting | Listening | Thinking | Speaking | Error`, matched
  exhaustively, plus the transcript/hits it accumulates), `model/AgentMsg.ts`
  (the `Msg` union: `StartRequested`, `SessionMinted`, `RealtimeEvent`,
  `ToolCallRequested(q)`, `RagHits`, `Cancelled`, …), `client/agentApp.ts`
  (the plgg-view `application`), and `usecase/agentEnabled.ts` (the server-side
  boot probe). Lands beside ticket 16/24's `DeliveryApi/` and ticket 20's admin
  surface.
- `packages/plggpress/src/Agent/client/agentApp.ts` (**new**) — a plgg-view
  `application` (`packages/plgg-view/src/Program/usecase/application.ts`,
  `application`/`Application<Model, Msg>` with `init`/`update`/`view`) whose
  **`update` returns `[Model, Cmd<Msg>]`** (ticket 06's Cmd/Sub effects): the
  `Cmd`s (1) `POST /api/agent/session` to mint an ephemeral session (via
  `plgg-fetch`), (2) open the direct-to-OpenAI realtime connection with the
  ephemeral token (a media seam — WebRTC/WebSocket — injected so the pure
  `update` stays testable; the real seam is the browser-native surface), (3) on a
  model **tool call** `Msg`, fetch ticket 24's `GET /api/rag?q=…` (via
  `plgg-fetch`, cancellable) and feed the hits back into the realtime session,
  and (4) tear down / re-mint on cancel or expiry. `Sub`scriptions carry incoming
  realtime events. Built as a browser client entry through plgg-bundle
  (precedent: `packages/plgg-view/src/client.ts` and ticket 20's
  plgg-view-client-served-inside-plggpress). **Hidden/disabled when
  `agentEnabled` is false** (the spec-line-105 gate).
- `packages/plggpress/src/theme/shell.ts` (and/or ticket 20's served-page shell)
  — the served page mounts the agent widget **only when `agentEnabled`** is true;
  with no key the widget markup/script is not emitted at all (the UI-hidden half
  of the gate). The SSG shell/`pressRouter` reader path is untouched (D5).
- `packages/plgg-view/src/Program/usecase/application.ts` — **ticket 06's**
  TEA runtime with `Cmd`/`Sub` (the `update: (msg, model) => [Model, Cmd<Msg>]`
  plus subscriptions D2 adds). `agentApp` plugs into this. Consumed, not modified.
- `packages/plgg-view/src/client.ts` — the browser render entry (`makeRenderer`,
  `application`, `sandbox`); the agent client bundle follows this precedent.
  Consumed.
- `packages/plgg-content/src/Rag/usecase/ragSearch.ts` and the `GET /api/rag`
  route — **ticket 24's** retrieval and endpoint; the agent's tool call targets
  this HTTP endpoint (and the MCP tools in 26/27 target the same in-process
  `ragSearch`). Consumed, never re-implemented.
- `packages/plgg/src/Functionals/postJson.ts` — the injectable network seam the
  mint vendor builder threads; already `redirect: "manual"` so the
  `Authorization` header can't leak on a redirect (security policy). Consumed.
- `packages/plgg/src/Functionals/env.ts` — `env("OPENAI_API_KEY")` (returns a
  `Result`; the missing-key `Err` drives the disabled/hidden path). Consumed.
- `packages/plggpress/src/index.ts`, `packages/plggpress/package.json` — the
  barrel and manifest. plggpress's `exports` map is **import-only today**
  (concern **51**, `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`
  — the manifest's `.` export carries only an `import` branch, no `require`): if
  this ticket adds a client-entry subpath export (e.g. `./agent-client`) for the
  served bundle, it must carry `types`+`default` under **both** `import` and
  `require` for require() consumers (concern 51), mirroring plgg-view's
  `./client` export shape (`packages/plgg-view/package.json`).
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record (D12 governs; D11 + spec line 105 are this ticket's degraded-behavior
  gate; line 58 is D12's full text; line 92 enumerates this ticket; line 51 is
  D5's SSG-stays-static rule).

## Related History

- **Direct dependency — RAG retrieval (ticket 24):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143024-rag-embeddings-and-search.md`
  delivers the `ragSearch` hybrid/gracefully-degrading retrieval, its
  `vectorSearch` cosine top-k, the `Rag/` domain, and the `GET /api/rag?q=…`
  endpoint at `pressServeWeb`. Its Considerations name this exact hand-off:
  *"Realtime voice agent and ephemeral keys are ticket 25 (the other half of
  D12). This ticket delivers server-side retrieval (`ragSearch`) and its HTTP
  endpoint; it does not mint ephemeral browser keys, add `plgg-fetch` streaming,
  or build the agent UI … Keep the RAG endpoint agent-agnostic so ticket 25
  wires the browser agent to it as a plain tool-call target."* This ticket **is**
  that agent. The concrete artifacts inherited: the endpoint `GET /api/rag?q=…`
  (query `q`, bounded `limit`/`topK`, `jsonResponse` hit shape identical to
  ticket 16's `searchIndex` rows) and, for the MCP path later, the in-process
  `ragSearch(db, { q, … })`. This ticket calls the **HTTP** form as the agent's
  tool.
- **Direct dependency — serve mode (ticket 14):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  delivers the `serve` verb and the **`pressServeWeb(contentDir, config, base)`**
  mount seam in `packages/plggpress/src/server/pressServer.ts` — *"the seam's
  stated purpose"* is that all dynamic routes mount there; ticket 16 mounts
  `/api`, ticket 19 the auth routes, ticket 20 the `/admin` route, and this
  ticket the `/api/agent/session` mint route and agent client. D5 (dual-mode; the
  public reader stays SSG/CDN, byte-invisible) binds this ticket too.
- **Direct dependency — plgg-view Cmd/Sub effects (ticket 06):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143006-plgg-view-cmd-sub-effects.md`
  adds D2's `update: (msg, model) => [Model, Cmd<Msg>]` plus subscriptions to
  `plgg-view`'s TEA — the effect system the realtime browser loop (mint → connect
  → stream → tool-call → re-mint) is expressed in. Without Cmd/Sub the agent's
  async side-effects would have no typed home in the `application` runtime.
- **Direct dependency — plgg-view-in-served-plggpress (ticket 20):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143020-admin-ui-on-scheduler.md`
  establishes the precedent for serving a plgg-view `application` as a client
  bundle inside a `pressServeWeb`-mounted plggpress page, and reads the LLM key
  presence through the plgg-kit seam *"never echoing it"* — the same posture the
  agent-enabled probe uses. It also carries concern **51** (the plggpress
  `exports`-map widening) this ticket must honor for any client-entry subpath.
- **Vendor seam (existing / ticket 24):** `plgg-kit`'s live LLM seam —
  `packages/plgg-kit/src/LLMs/usecase/generateObject.ts` (the `Provider`-dispatch
  + injectable-`post` + `env` key-fallback pattern `mintRealtimeSession` mirrors,
  lines 48–107), ticket 24's `generateEmbedding.ts` sibling, `src/LLMs/model/
  Provider.ts` (the `OpenAI | Anthropic | Google` sum, `openai()/anthropic()/
  google()` constructors, `Config { model, apiKey: Option<string> }`,
  `openAI$/anthropic$/google$` patterns), and `src/LLMs/vendor/OpenAI.ts`
  (`reqObjectGPT`, the request/decode shape `reqRealtimeSessionGPT` copies). D12
  settles that plgg-kit *"is LIVE"* and is the single vendor seam; the memory
  note `project_bundle_dynamic_import` records plgg-kit's ESM/require surface, and
  `feedback_vendor_neutrality_zero_new_deps` the zero-new-deps rule the OpenAI
  HTTP mint call honors (stdlib `fetch` via `postJson`, no vendor SDK).
- **Client HTTP seam (existing):** `packages/plgg-fetch/src/Http/usecase/request.ts`
  (`request`/`get`/`post`, `RequestOptions`) and `usecase/seam.ts`
  (`toRequestInit`/`fromFetchResponse`, already `redirect: "manual"`) — the
  streaming + cancellation land here. plgg-fetch is *"symmetric with
  plgg-server"* and shares `plgg-http`'s model; it is already gated ≥90
  (`packages/plgg-fetch/plgg-test.config.json` exists).
- **Downstream consumers (not yet written):** tickets **26/27** (`plgg-mcp-*`)
  expose ticket 24's `ragSearch` as an MCP tool (the *same* retrieval the agent
  tool-calls); ticket **21** (requests-and-comments-accumulation) is where
  stakeholder interactions *"accumulate inside plggpress"* (spec Vision) persist —
  this ticket produces those interactions, ticket 21 owns their storage; ticket
  **28** (production-topology) owns hot-reload of a newly-added key (concern
  `51-hot-reload-does-not-refresh-config` — enabling the agent after boot needs a
  restart, noted below).
- **Constraints & memory:** `feedback_coverage_threshold` (>90% four-metric),
  `feedback_breaking_changes_ok` (plgg is its own only consumer — the
  `RequestOptions`/`plgg-fetch` additions are free), `project_str_over_softstr`
  (prefer `Str`/`asStr` in the new `EphemeralSession`/agent code; the plgg-kit
  `Config` and plgg-fetch `RequestOptions` still use `SoftStr` at their seams),
  and the roadmap's known constraints (spec lines 66–73): no native bindings
  (the realtime media loop is browser-native WebRTC/WebSocket, no server media
  proxy, no native module), no new dependency, no `as`/`any`/`ts-ignore`.

**Wiring note (load-bearing):** **no new package.** The work lands in three
already-wired packages — `plgg-fetch`
(`scripts/build.sh:49`, its own `test-plgg-fetch.sh`/`tsc-plgg-fetch.sh`,
`scripts/check-all.sh`), `plgg-kit` (`scripts/build.sh:21`,
`scripts/check-all.sh` `test-plgg-kit.sh`), and `plggpress`
(`scripts/build.sh:47`, `test-plggpress.sh`) — plus a new browser client entry
**inside plggpress** (not a package; a plgg-bundle client entry like
`packages/plgg-view/src/client.ts`). So **no** new `cd $REPO_ROOT/packages/<name>
&& npm run build` line enters `scripts/build.sh`/`scripts/npm-install.sh` and
**no** new `test-*.sh` enters `scripts/check-all.sh`. Build order is already
correct (plgg → plgg-kit …; plgg-view built before plggpress at `build.sh:30`;
plggpress at `:47`; plgg-fetch at `:49`, which plggpress does **not** import at
build time — the agent client uses plgg-fetch in the **browser** bundle, so
verify plgg-fetch's dist is available to plggpress's client build, and if the
client build needs plgg-fetch's dist *before* `:49`, move plgg-fetch's build line
above plggpress's and say so). The one packaging obligation is the plgg-kit
`plgg-test.config.json` (D14) — a config, not a script line — and any plggpress
client-entry `exports` widening (concern 51). A fresh `check-all.sh` is the
arbiter.

## Implementation Steps

1. **Confirm the seams exist (no code before this).** Verify on the branch that
   ticket 24 has landed `ragSearch` and the `GET /api/rag?q=…` endpoint, ticket
   14 the `pressServeWeb` mount seam in `pressServer.ts`, ticket 06 the
   `Cmd`/`Sub` effects in plgg-view's `application`, and ticket 20 the
   plgg-view-client-served-in-plggpress precedent. Confirm plgg-kit's
   `generateObject`/`generateEmbedding`/`Provider`/`reqObjectGPT` shape. Confirm
   plgg-kit's coverage config: if `packages/plgg-kit/plgg-test.config.json` is
   still absent (D14 silent-ungating defect — it **is** absent today), add it
   (≥90 four-metric), else confirm ticket 02/24 delivered it. Confirm
   `packages/plgg-fetch/plgg-test.config.json` (already present, ≥90).
2. **plgg-fetch streaming + cancellation (D12 "underneath").** Add
   `signal?: AbortSignal` to `RequestOptions` (`src/Http/usecase/request.ts`) and
   thread it into `toRequestInit` (`src/Http/usecase/seam.ts`) only when present
   (the `exactOptionalPropertyTypes`-safe pattern the existing `hasBody` guard
   uses). Add a streaming entry (`requestStream`/`stream`) returning the response
   body as a `ReadableStream<Uint8Array>` / typed async chunk iterator via a new
   streaming seam function beside `fromFetchResponse` (keep the `opaqueredirect`
   → `redirectError` guard; fold transport/abort failure to the existing
   `networkError` `ClientError` — never throw, never hang). Barrel both. Specs
   (real `fetch`): a streamed body reads chunk-for-chunk; an `AbortController`
   abort folds to a typed `ClientError`.
3. **plgg-kit `EphemeralSession` model.** Add
   `src/LLMs/model/EphemeralSession.ts` — the minted-session value
   (`token`/`expiresAt`/`model`) + `asEphemeralSession` caster in `Provider.ts`'s
   `cast`/`forProp` style (prefer `Str`/`asStr` where the seam allows). Barrel it.
4. **plgg-kit realtime vendor builder (D12).** Add `reqRealtimeSessionGPT` to
   `src/LLMs/vendor/OpenAI.ts` (`POST https://api.openai.com/v1/realtime/sessions`,
   `{ model, voice }`, bearer auth, injectable `post`, decode `client_secret.value`
   + `client_secret.expires_at` to an `EphemeralSession` via `atProp`/`atIndex`
   + casters — no `as`). Specs use an **injected `post` fake** (no network),
   asserting request assembly and the ephemeral-token decode.
5. **plgg-kit `mintRealtimeSession` usecase (D12).** Add
   `src/LLMs/usecase/mintRealtimeSession.ts` mirroring `generateObject`: resolve
   the key (`provider` `Option<apiKey>` → `env` fallback), `match(provider)` to
   the vendor builder, **return `Err` when no key is resolvable** and for any
   provider whose realtime builder is not implemented (typed, never a throw).
   Barrel it (`usecase/index.ts`, `LLMs/index.ts`, `src/index.ts`). Specs
   (injected `post`): mint on key, **no-key `Err`**, unsupported-provider `Err`.
6. **plggpress agent-enabled probe.** Add
   `packages/plggpress/src/Agent/usecase/agentEnabled.ts` — a one-time boot probe
   reusing ticket 16/24's key-presence check (key present → `true`) surfaced to
   the served page; no key → `false`. No new config surface.
7. **plggpress mint route (the trust boundary).** In ticket 16's
   `deliveryApi.ts`, add `POST /api/agent/session` calling `mintRealtimeSession`
   **only when a key is configured**; on `Err`/no-key return a typed
   `{ enabled: false }` `jsonResponse` (**never a 500**); on success return the
   `EphemeralSession` (the **ephemeral** token only). Behind ticket 19/20's
   session/CSRF posture (signed-in stakeholder feature). Mount **only** at
   `pressServeWeb` (`pressServer.ts`). The RAG tool endpoint `GET /api/rag` is
   ticket 24's — consumed, not re-added.
8. **Browser agent UI (plgg-view TEA, ticket 06 Cmd/Sub).** Add
   `packages/plggpress/src/Agent/model/AgentState.ts` (exhaustive
   `Idle|Connecting|Listening|Thinking|Speaking|Error` sum + transcript/hits),
   `model/AgentMsg.ts`, and `client/agentApp.ts` — a plgg-view `application`
   whose `update` returns `[Model, Cmd<Msg>]`: `Cmd`s to (a) mint via `POST
   /api/agent/session` (plgg-fetch), (b) open the direct-to-OpenAI realtime
   connection with the ephemeral token (media seam **injected** so `update`
   stays pure; browser-native WebRTC/WebSocket is the real seam), (c) on a model
   tool-call `Msg`, fetch ticket 24's `GET /api/rag?q=…` (plgg-fetch,
   **cancellable** via the step-2 signal) and feed hits back, (d) tear down /
   re-mint on cancel/expiry. `Sub`scriptions carry realtime events. Exhaustive
   `match` over `Model`/`Msg`. Build it as a plgg-bundle **client entry**
   (precedent: `packages/plgg-view/src/client.ts`).
9. **Hide/disable the UI with no key (the spec-line-105 gate).** In the served
   page shell (ticket 20's shell / `packages/plggpress/src/theme/shell.ts`), mount
   the agent widget + client script **only when `agentEnabled`** is true; with no
   key emit **no** agent markup/script. The SSG `build`/`pressRouter` render path
   is byte-untouched (D5). If any subpath `exports` entry is added for the client
   bundle, widen it with `types`+`default` under both `import` and `require`
   (concern 51).
10. **Runnable demo / served smoke (proof-of-value, working-style).** `npx
    plggpress serve --port <p>` on `packages/guide` with **no** key → load the
    page: the agent widget is **absent/disabled** and `curl -s -X POST
    'http://localhost:<p>/api/agent/session'` returns `{ enabled: false }` (never
    a 500) — the spec-line-105 evidence. Then with a key set → the mint route
    returns an `EphemeralSession` and the widget renders; drive the pure
    `agentApp` `update` in a spec (and, if practical, a real-browser drive of the
    connect → tool-call → hits path with the media seam faked). Quote the output
    in the PR.
11. **Specs** (co-located, flat `test()`, absolute imports): plgg-fetch
    (streaming chunk-for-chunk on real `fetch`; abort → typed `ClientError`);
    plgg-kit `mintRealtimeSession` (request assembly via injected `post`,
    ephemeral-token decode, **no-key `Err`**, unsupported-provider `Err`);
    plggpress mint route (**no key → `{ enabled: false }`, not 500**; key →
    `EphemeralSession`; CSRF/session guard); `agentApp` pure TEA (`init`/`update`
    return the right `Cmd`; tool-call `Msg` → `/api/rag` fetch `Cmd`; no-key →
    disabled model); the served-page shell (**no key → no agent markup/script**,
    the required degraded spec).
12. **House rules end to end:** no `as`/`any`/`ts-ignore`; `Option` not
    null/undefined, `Result` not throw; exhaustive `match` over `Provider` and
    every `AgentState`/`AgentMsg` case; data-last pipelines (`pipe`/`cast`/`proc`);
    prefer `Str`/`asStr` over `SoftStr` in new code where the seam allows;
    Prettier `printWidth: 50` per package; **zero new dependencies**, **no native
    bindings** (browser-native realtime media, no server media proxy, no native
    module); **no new package**; the real key **never** crosses to the browser;
    the RAG retrieval is ticket 24's (consumed, not re-implemented).

## Quality Gate

**Acceptance criteria**

1. **Degraded behavior verified (Phase 8/9 gate, spec line 105 — the
   agent-UI-hidden half):** with **no** API key configured, the served page
   renders **no** agent widget/script (a spec asserts the shell emits nothing;
   the served smoke shows the widget absent), and `POST /api/agent/session`
   returns a typed **`{ enabled: false }`** (a spec asserts it, **never a 500 /
   never a throw**). The CMS's zero-key identity holds.
2. **Ephemeral-key mint works (D12):** with a key (or an injected `post`),
   `mintRealtimeSession` returns an `EphemeralSession` carrying only the
   **ephemeral** token (a spec asserts the decode); `POST /api/agent/session`
   returns it; the browser can open the realtime connection with it.
3. **Real key never reaches the browser (security):** `grep`/inspection confirms
   the real `apiKey`/`OPENAI_API_KEY` appears **only** server-side (the plgg-kit
   seam) — never in a served HTML page, JS bundle, or `jsonResponse` body; the
   mint HTTP call rides `postJson` (`redirect: "manual"`); the key is never
   logged.
4. **Single vendor seam (D12):** every mint call goes through `plgg-kit`'s
   `mintRealtimeSession`; `grep` finds no realtime/mint HTTP endpoint or vendor
   SDK outside `packages/plgg-kit/src/LLMs/vendor/`; the seam resolves the key
   exactly as `generateObject`/`generateEmbedding` do and returns a typed `Err`
   (never a throw) when no key is resolvable or the provider is unsupported.
5. **plgg-fetch streaming + cancellation (D12 "underneath"):** `RequestOptions`
   carries `signal?: AbortSignal` threaded into the native request; a streaming
   entry returns the body as a stream/chunk iterator; a spec streams
   chunk-for-chunk on real `fetch` and a spec aborts a request into a typed
   `ClientError` (no hang, no throw). plgg-fetch stays ≥90.
6. **RAG tool wired, not re-implemented (ticket 24 not forked):** the agent's
   tool call targets ticket 24's `GET /api/rag?q=…`; `grep` finds **no** new
   embeddings/cosine/FTS5 code in this ticket; `ragSearch`/`vectorSearch`/the
   `Rag/` domain and the `/api/rag` route are unchanged.
7. **SSG byte-invisible (D5):** `npx plggpress build` into two dirs before/after
   yields an empty `diff -r`; the agent mounts **only** at `pressServeWeb`; the
   `build`/`pressRouter` reader path is untouched.
8. **Pure, disposable realtime loop (recovery):** the `agentApp` `update` is pure
   (effects are `Cmd`s, ticket 06); a cancelled/expired session tears down via
   the `AbortSignal` path and re-mints; no realtime state is persisted here and
   no connection leaks.
9. **No escape hatches, no new package, coverage:** `grep` finds no
   `as `/`any`/`ts-ignore` in new modules; **plgg-kit is gated ≥90** (its
   `plgg-test.config.json` exists — D14) and clears it; plgg-fetch and plggpress
   stay ≥90 on all four metrics; no new package (no new `cd`/`test-*` line) and
   the existing build order holds; any plggpress client-entry `exports` entry
   carries `types`+`default` under both `import` and `require` (concern 51); a
   fresh `check-all.sh` is green.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean), `scripts/test-plgg-fetch.sh`,
`scripts/test-plgg-kit.sh`, and `scripts/test-plggpress.sh` and paste the gate
lines (including the **no-key `{ enabled: false }`** route spec, the
**no-key → no agent markup** shell spec, the **abort → typed `ClientError`**
streaming spec, and the `mintRealtimeSession` no-key `Err` spec). Served smoke on
`packages/guide`: `npx plggpress serve --port <p>` with **no** key set → confirm
the agent widget is absent in the page and `curl -s -X POST
'http://localhost:<p>/api/agent/session'` returns `{ enabled: false }` (the
spec-line-105 degraded-behavior evidence); repeat with a key for the mint branch.
Byte-identity: `npx plggpress build` into two dirs before/after and paste the
empty `diff -r`. Then a **fresh** `scripts/check-all.sh` (clean rebuild — stale
dists must not mask the plgg-fetch / plgg-kit / plggpress edges) must be green
end to end.

**Gate**

All nine acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND the no-key degraded path leaves the agent UI hidden/disabled and the
mint route returning `{ enabled: false }` (the Phase 8/9 gate, spec line 105).
Any real key reaching the browser, any mint/realtime HTTP call outside the
plgg-kit vendor file, a second vendor abstraction, a native media binding or
server media proxy, a new dependency, a new package, a mint route that 500s /
throws when no key is configured (degradation broken), a re-implemented RAG
retrieval, a mutated ticket-24 `Rag/`/`/api/rag`, a non-byte-invisible SSG
output, an ungated plgg-kit, an escape hatch, or a coverage dip fails the ticket.

## Considerations

- **Realtime media is browser-native, not a server proxy (D12).** The browser
  opens its own WebRTC/WebSocket to `https://api.openai.com/v1/realtime` with the
  ephemeral key; the server never proxies audio (no native media module, no
  streaming bytes through plggpress). The media surface is an **injected seam** in
  `agentApp` so the pure `update` is testable; only the thin browser-native glue
  is untested-by-design and kept minimal. If a future vendor needs a server-side
  realtime relay, that is a seam swap behind plgg-kit, not a redesign.
- **Enabling the agent after boot needs a rebuild/restart, not a hot key toggle.**
  `agentEnabled` and the ingest key-probe are read once at boot (concern
  `51-hot-reload-does-not-refresh-config`; the served instance built its config
  at boot). Turning a key **on** later requires a restart to surface the agent —
  a watcher/reload is **ticket 28's** (production-topology), not this ticket's.
  Note the boundary in the mint-route/probe docstring so an operator knows.
- **Stakeholder-interaction accumulation is ticket 21's storage, not this
  ticket's.** The Vision's *"stakeholder interactions accumulate inside
  plggpress"* is realized by persisting transcripts/requests into the
  requests/comments store (**ticket 21**) and re-indexing them for RAG (**ticket
  24**). This ticket **produces** the interactions and can hand them to that
  store; it does **not** add new persistence tables. Keep the agent domain
  storage-agnostic so ticket 21 owns the write.
- **Ephemeral-key scope and TTL.** The minted key must be **narrowly scoped**
  (realtime session only) and **short-TTL**; the mint route is the trust boundary
  and must sit behind ticket 19/20's session/CSRF guard (the agent is a signed-in
  stakeholder feature). Do not widen the ephemeral scope beyond what the realtime
  session needs; re-mint on expiry (the cancellation path exists for this).
- **Provider coverage.** OpenAI Realtime is the first (and, for the guide,
  sufficient) vendor. Anthropic/Google realtime builders are added only when a
  consumer selects them; until then those `Provider` branches return a typed
  `Err` (surfaced as the agent staying disabled), never a throw — consistent with
  the no-key path. This keeps D12's *"vendor swappable behind the seam"* honest
  without speculatively implementing unused vendors.
- **plgg-kit gating is a D14 obligation surfaced again here.** plgg-kit ships
  today with **no** `plgg-test.config.json` (silently ungated — the exact default
  ticket 02 hardens; ticket 24 also flags it). Adding the live realtime mint seam
  to an ungated package is unacceptable; this ticket ensures plgg-kit is gated
  ≥90 (adding the config if a predecessor has not), so the new vendor code is
  covered from its first commit.
- **plggpress `exports` map is import-only (concern 51).** If the served agent
  client is exposed as a subpath export, it must carry `types`+`default` under
  both `import` and `require` (the concern-51 widening), mirroring plgg-view's
  `./client` export; a require() consumer must not hit an import-only surface.
