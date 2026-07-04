---
created_at: 2026-07-04T14:30:30+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143016-plggpress-content-index-and-delivery-api.md, 20260704143027-plgg-mcp-http-oauth.md]
---

# plggpress exports an installable Claude Code plugin: a marketplace-manifest endpoint on the served instance, an auto-generated plugin (`.mcp.json` at the OAuth-aware `/mcp` endpoint + skills derived from the content structure), regenerated live from the content index

## Overview

Phase 10 (MCP & plugin), ticket **30** of the plggpress/plggmatic roadmap —
the capstone of the phase and the payoff of the whole MCP series: it turns a
served plggpress instance into a **thing Claude Code can install**, so a team's
stored knowledge in plggpress becomes referenceable from Claude Code. Approved
decision record: `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

The governing decision is **D17**, transcribed here so an implementer need not
open the spec: *"Claude Code integration — **plggpress exports a Claude Code
plugin**: auto-generated plugin (marketplace manifest + `.mcp.json` pointing at
the instance's MCP endpoint + skills generated from content structure).
Long-term this replaces the workaholic plugin once qmu.co.jp runs on
plggpress."* The vision (author's words, condensed in the spec) states it as a
first-class CMS feature: *"**Claude Code plugin export** — a plggpress instance
can auto-generate an installable Claude Code plugin (and/or expose its MCP
server) so a team's stored knowledge is referenceable from Claude Code. When
qmu.co.jp is implemented on plggpress, this feature replaces the workaholic
plugin."*

Concretely, after this ticket a served instance answers:

1. **A marketplace-manifest endpoint** so `claude plugin marketplace add
   <instance-url>` resolves to a valid `marketplace.json` describing one
   plugin whose `source` is this instance.
2. **The generated plugin bundle** — `plugin.json`, an `.mcp.json` pointing at
   the instance's **OAuth-aware Streamable HTTP MCP endpoint** (`/mcp`, ticket
   27), and **skills auto-generated from the content structure**: each content
   collection becomes a skill whose `SKILL.md` indexes that collection's
   articles (title → path → summary) and instructs the model to fetch full
   bodies via the MCP tools / delivery API. Optional **commands** (e.g. an
   "ask this instance" query command) are a deferred nicety recorded in
   Considerations, not shipped here.
3. **Live regeneration on content-model change** — the plugin is **derived**
   from the same content index the delivery API and MCP tools read (D4:
   git-primary, SQLite is a derived rebuildable index), so it is rendered from
   the current index at request time (or on a content-model-change signal),
   never a stale hand-committed artifact. Change a collection or add an
   article, restart/rebuild the served index, and the exported plugin updates
   with it.

**The design must record why BOTH an MCP-only path and a plugin+MCP hybrid are
offered — this is an explicit deliverable of the ticket, not an afterthought:**

- **MCP-only** (`claude mcp add --transport http <origin>/mcp`, ticket 27):
  the minimal path. The client gets the tools — `search_content` /
  `get_article` / `list_collections` (ticket 26) and the write tools
  `register_request` / `comment` (ticket 27) — but **nothing ambient**: the
  model only reaches the CMS when it decides to call a tool, and it has no map
  of what the corpus contains until it searches. Good for a lightweight,
  tools-on-demand consumer.
- **Plugin + MCP hybrid** (the D17 export, this ticket): the plugin ships the
  **same** `/mcp` endpoint via `.mcp.json` **plus** skills auto-generated from
  the content structure. The skills give the model a **discoverable map** of
  the CMS (collections and their articles, progressively disclosed) that it
  reads proactively, while the MCP tools give **live, authoritative** fetch and
  the account-holder write surface. Skills answer *"what knowledge exists and
  how is it organized"*; MCP answers *"give me the current bytes / let me
  contribute"*. Both are offered because they serve different needs, and the
  hybrid is the recommended path once a team's knowledge lives in plggpress —
  the long-term replacement for the workaholic plugin (D17).

Hard scope fences (siblings own the rest — do NOT build here):
- The **content index and the HTTP-free query functions** (`listCollections`,
  `listCollection`, `getDocument`, `searchIndex`) are **ticket 16** — consumed
  to render the skills, not reimplemented. The plugin generator reads the
  index through those same in-process functions (ticket 16's acceptance
  criterion 6, *"In-process reuse (D17)… callable with just a `Db`"* — this
  ticket is a named consumer of that seam).
- The **MCP server, its Streamable HTTP transport, the OAuth resource-server
  protection, discovery metadata, and the tools** are **tickets 26/27** — this
  ticket only *points a generated `.mcp.json` at* the `/mcp` endpoint and the
  `/.well-known/oauth-protected-resource` discovery ticket 27 stood up; it adds
  **no** MCP protocol code and **no** auth code. The plugin's `.mcp.json`
  carries only the public origin URL — the OAuth handshake is the client's,
  driven by ticket 27's discovery chain.
- The **`SiteConfig.models` content-model declaration and its `CollectionSchema`
  serialization** are **tickets 17/16** — consumed as the authoritative
  structure the skills are generated from.

This lives **entirely inside plggpress** (a new `PluginExport/` domain beside
ticket 16's `DeliveryApi/` and ticket 26's `McpServer/`) — **no new package**:
the generator needs plggpress's already-present deps (`plgg-content`,
`plgg-server`, `plgg-http`, `plgg`) and nothing else. It is **served-only**
(D5 dual-mode): the mount lands at the `pressServeWeb` seam, `plggpress build`
/ SSG emits no plugin route, so static output stays byte-identical (the
ticket-14/16/27 gate still holds).

The Phase 10 gate this ticket must satisfy (from the spec): *"MCP conformance
exercised with a real client (Claude Code) against stdio and HTTP transports"*
— here specifically **the end-to-end install**: `claude plugin marketplace add
<instance-url>`, install the plugin, confirm the generated skills load and the
wired `/mcp` server authenticates and answers, all against a running
`plggpress serve`.

## Policies

- `workaholic:operation` / `policies/delivery.md` — this ticket adds a **new
  dynamic delivery surface** (the marketplace/plugin endpoints) to the served
  instance and a **second consumer topology** for the same content (an
  installable plugin). The policy documents that the delivery pipeline has no
  preview environment (build → merge → publish) and that `scripts/build.sh`
  `cd`-lines are publish-order authority; since this ticket introduces **no new
  package** it needs no build-order change — but it must **verify** on a fresh
  `check-all.sh` that adding `PluginExport/` to plggpress does not perturb the
  export-surface probe (concern 51) or the SSG byte-identity gate. The generated
  plugin is *derived at serve time* (D4), so there is no artifact to publish or
  version separately — the served instance IS the marketplace.
- `workaholic:design` / `policies/security.md` — the marketplace and plugin
  endpoints answer **unauthenticated public GETs**, and they hand a client a
  `.mcp.json` that points at the **OAuth-protected** `/mcp`. The security
  discipline governs three things: (a) the emitted `.mcp.json` and manifests
  carry **only the public origin URL** — never a token, session id, or secret
  (the OAuth handshake is the installing client's, per ticket 27's discovery);
  (b) the skills are generated **only from public content** the SSG already
  serves anonymously (the same corpus the read tools expose — no draft/private
  collection leaks into a skill body); (c) the instance origin used in the
  emitted URLs is the **public served origin** (the `qmu.dev` tunnel origin),
  not `localhost`, so an installed plugin resolves the real endpoint — matching
  ticket 27's `aud` = public-origin rule. Revisit trigger: when private/guest
  collections ship (D4's SQLite-primary trigger), the generator must filter to
  a collection's `visibility` before emitting its skill.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer; `as`/`any`/`ts-ignore` are prohibited. The
  `marketplace.json` / `plugin.json` / `SKILL.md`-frontmatter shapes are modeled
  as **closed types built by plgg casters**, and the skill emitter folds each
  `CollectionSchema` field over an **exhaustive `match`** on its type — so a new
  content-model field kind is a `tsc` error in the generator, not a silently
  mis-rendered skill. The manifests are produced by typed serialization, never
  string concatenation of JSON. Prettier `printWidth: 50` governs every touched
  `.ts`.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine and "test against the real thing": the generator runs
  against a **real** `node:sqlite` `plgg-content` index built through ticket
  16's pipeline (fixture collections + articles), and the emitted manifests are
  **parsed back and validated** against the Claude Code plugin schema shape
  (a round-trip: emit → `JSON.parse` → re-cast → assert), the same discipline
  the plgg family applies to every serializer. plggpress stays gated ≥90 across
  statements/branches/functions/lines (D14; ticket 02 makes a missing
  `plgg-test.config.json` fail rather than silently skip).

## Key Files

**The content structure the plugin is generated from (ticket 16 — consumed, not modified):**

- `packages/plgg-content/src/Query/usecase/listCollections.ts`,
  `listCollection.ts`, `getDocument.ts` — the **HTTP-free** query functions the
  generator reads: `listCollections` enumerates the registered collections and
  their `CollectionSchema`; `listCollection` (with a large `limit`) enumerates a
  collection's documents (title, path, attributes) to build the skill's article
  index. Ticket 16 built these `Db`-only *precisely* so this plugin path can
  consume them without HTTP (its acceptance criterion 6 / D17).
- `packages/plgg-content/src/Query/model/CollectionSchema.ts` — the serializable
  `CollectionSchema` (name + fields with type/required) the skill emitter folds
  over with exhaustive `match`; one collection → one skill.
- `packages/plggpress/src/DeliveryApi/usecase/ingestFromConfig.ts` +
  `.../toCollectionSchema.ts` (ticket 16) — the boot-time `openIndex` +
  `ingestFromConfig` path; the plugin generator reuses the **same live index
  handle** built at serve startup (never opens a second one).

**The MCP endpoint the generated `.mcp.json` points at (tickets 26/27 — referenced only):**

- `packages/plgg-mcp/src/Transport/http.ts` + `.../Transport/mcpWeb.ts` (ticket
  27) — the Streamable HTTP transport mounted at `/mcp`; the generated
  `.mcp.json` is a `{ "type": "http", "url": "<origin>/mcp" }` entry pointing
  here. No code touched.
- `packages/plggpress/src/server/protectedResourceMetadata.ts` (ticket 27) —
  the `GET /.well-known/oauth-protected-resource` (RFC 9728) discovery route the
  installing client follows from the `/mcp` URL to run OAuth; the plugin relies
  on it existing, does not re-emit it.

**The mount seam (extend — the one composition point, tickets 14/16/19/27):**

- `packages/plggpress/src/server/pressServer.ts` — `pressServeWeb(...)`; ticket
  14 reserved this as the *only* place later tickets compose mounts (ticket 16
  mounts `/api`, ticket 27 mounts `/mcp` + the protected-resource metadata).
  This ticket adds the marketplace/plugin routes here and **nowhere else**.
  Serve-only; `build`/SSG never emits them.
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`,
  `get`, the `Web` combinators the plugin-export sub-app is built from.
  Consumed, not modified.
- `packages/plgg-http/src/Http/model/HttpResponse.ts` — `jsonResponse` (the
  marketplace manifest / plugin.json / .mcp.json responses) and a text/markdown
  response for `SKILL.md` bodies. Consumed, not modified.

**Files created (new, all in plggpress — the design step may amend names):**

- `packages/plggpress/src/PluginExport/model/MarketplaceManifest.ts` — the
  closed `marketplace.json` shape (`name`, `version`, `description`, `owner`,
  `plugins: [{ name, description, version, source, category, skills[] }]`),
  mirroring `/home/ec2-user/projects/workaholic/.claude-plugin/marketplace.json`,
  plus `asMarketplaceManifest` caster for the round-trip spec.
- `packages/plggpress/src/PluginExport/model/PluginManifest.ts` — the closed
  `plugin.json` shape (`name`, `description`, `version`, `dependencies`,
  `author`), mirroring
  `/home/ec2-user/projects/workaholic/plugins/workaholic/.claude-plugin/plugin.json`.
- `packages/plggpress/src/PluginExport/model/SkillDoc.ts` — a `SkillDoc` =
  frontmatter (`name`, `description`, `user-invocable`) + Markdown body; a
  `skillMarkdown(doc)` serializer emitting the `---`-fenced YAML head + body
  (the `SKILL.md` format:
  `/home/ec2-user/projects/workaholic/plugins/workaholic/skills/explain/SKILL.md`).
- `packages/plggpress/src/PluginExport/model/McpJson.ts` — the closed
  `.mcp.json` shape; `httpMcpEntry(origin)` emits
  `{ "<server-name>": { "type": "http", "url": "<origin>/mcp" } }`.
- `packages/plggpress/src/PluginExport/usecase/collectionSkill.ts` — one
  `CollectionSchema` + its documents (from `listCollection`) → one `SkillDoc`:
  a `description` naming the collection's subject, a body that lists each
  article (title → path → attribute summary) and instructs the model to fetch
  full content via the MCP `get_article` tool or `GET <origin>/api/:collection/
  :path`. Folds the schema fields over an exhaustive `match`.
- `packages/plggpress/src/PluginExport/usecase/generatePlugin.ts` — the
  orchestrator: given the live index `Db` + serve config (origin, plugin name),
  build the `MarketplaceManifest`, the `PluginManifest`, the `McpJson`, and one
  `SkillDoc` per collection (via `listCollections` → `collectionSkill`). Pure
  over its inputs (a `Db`-taking `PromisedResult`), HTTP-free — so it is
  unit-testable and reusable by a future `plggpress plugin` CLI dump command.
- `packages/plggpress/src/PluginExport/usecase/pluginExportWeb.ts` — a
  `plgg-server` `Web` sub-app exposing the bundle over GET routes: the
  marketplace manifest at the path `claude plugin marketplace add` resolves
  (see step 3), `plugin.json`, `.mcp.json`, and each generated `SKILL.md`. Every
  response `jsonResponse`/markdown; every error folds to a typed response (no
  throw escapes). Read-only, unauthenticated by design (public content) — state
  it in the sub-app docstring.
- Colocated `.spec.ts` beside every module above.

**Manifests / wiring (verify — no new package, no new third-party dep):**

- `packages/plggpress/package.json` — **widen the `exports` map to
  `types`+`default` under both `import` and `require`** (currently import-only,
  lines ~16–24) per concern 51:
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`. Copy the
  dual-condition block from `packages/plgg-sql/package.json` (lines 8–22). No
  new dependency is added (`plgg-content` arrived in ticket 16, `plgg-mcp` in
  ticket 27).
- `scripts/check-all.sh` — already runs `./scripts/test-plggpress.sh`; no new
  script needed (no new package). Cited as the verification harness.
- `packages/plggpress/plgg-test.config.json` — threshold 90; unchanged, cited
  by the gate.
- `packages/guide/site.config.ts` — the real served instance the end-to-end
  install gate runs against (`plggpress serve` from `packages/guide`).

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  built `plgg-content` and its HTTP-free query functions **specifically** so the
  MCP/plugin path is "callable in-process… not only over HTTP" (its Overview,
  its acceptance criterion 6 "In-process reuse (D17)") — this ticket is that
  plugin consumer, reading `listCollections`/`listCollection` to render skills.
  `.workaholic/tickets/todo/a-qmu-jp/20260704143027-plgg-mcp-http-oauth.md`
  put the MCP server on Streamable HTTP at `/mcp`, protected as an OAuth
  resource server with `/.well-known/oauth-protected-resource` discovery, and
  its Considerations note the downstream tie explicitly: *"ticket 30
  (`claude-code-plugin-export`, D17) generates a `.mcp.json` pointing at this
  `/mcp` endpoint; keep the endpoint path and the discovery metadata stable so
  the exported plugin resolves it."* This ticket honors that contract and adds
  no MCP/auth code of its own.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143026-plgg-mcp-stdio.md`
  (transitive, via 27) — the read tools (`search_content` / `get_article` /
  `list_collections`) the generated skills reference in their "fetch full
  content" instructions.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  (transitive) — the `serve` verb and the `pressServeWeb` mount seam (D5
  dual-mode); the marketplace/plugin routes land there, serve-only, so SSG
  output stays byte-identical.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — established
  plggpress's direct-deps + `framework/` seam layout and the `cli.ts` dispatch
  this ticket adds `PluginExport/` beside (with `DeliveryApi/` and `McpServer/`)
  without disturbing.
- **Concern 51** — two facets both apply here:
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md` (this ticket
  is the natural moment to fix plggpress's import-only export map, since the
  package now surfaces a generator other tooling may `require()`), and
  `.workaholic/concerns/51-hot-reload-does-not-refresh-config.md` (the derived
  plugin has the same boot-time-index freshness constraint as the delivery API —
  see Considerations).
- **The concrete shape to emit** (study, do not copy verbatim — the generator
  produces its own values):
  `/home/ec2-user/projects/workaholic/.claude-plugin/marketplace.json`,
  `/home/ec2-user/projects/workaholic/plugins/workaholic/.claude-plugin/plugin.json`,
  `/home/ec2-user/projects/workaholic/plugins/workaholic/skills/*/SKILL.md`,
  and the plugin `hooks/hooks.json` / `commands/*.md` layouts — the canonical
  Claude Code plugin structure the exported manifests must conform to. The
  long-term goal (D17): once qmu.co.jp runs on plggpress, this generated plugin
  **replaces** the hand-authored workaholic plugin studied here.
- Reference: the `.workaholic/` cloudflared-tunnel note — the served instance is
  reachable over the `qmu.dev` tunnel (`plgg-guide.qmu.dev` → `:5181`); the
  origin the generator bakes into the emitted URLs must be that public origin,
  not `localhost`, so an installed plugin resolves the real marketplace and MCP
  endpoints (matching ticket 27's `aud` rule).

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Write a short design
   note (PR description or a `.workaholic/specs/` sketch) fixing: (a) the
   **marketplace-add resolution shape** — confirm the exact URL/path
   `claude plugin marketplace add <instance-url>` fetches and the JSON it
   expects, and pin the served route(s) that satisfy it (see step 3 — verify
   against a real `claude plugin marketplace add` run, do not guess the
   contract); (b) the **MCP-only vs plugin+MCP hybrid comparison** — record why
   both are offered (Overview), which is recommended, and what each gives the
   client, as the ticket's decision artifact; (c) the **skill granularity** —
   one skill per collection with an article index body (chosen default) vs one
   skill per article (rejected: explodes for large corpora) vs one root skill
   (rejected: no progressive disclosure) — justify the collection-level choice;
   (d) the **freshness model** — render from the live index per request vs a
   cached bundle invalidated on content-model change (default: render from the
   live boot-time index, matching ticket 16's delivery API). Present at the
   drive approval gate; implement after agreement.

2. **Manifest + skill models (`src/PluginExport/model/`).** Author the closed
   types and their casters/serializers: `MarketplaceManifest` +
   `asMarketplaceManifest`; `PluginManifest`; `McpJson` + `httpMcpEntry(origin)`
   emitting `{ type: "http", url: "<origin>/mcp" }`; `SkillDoc` +
   `skillMarkdown(doc)` emitting the `---`-fenced YAML frontmatter
   (`name`/`description`/`user-invocable`) + Markdown body. All built by typed
   construction/serialization — **no string-concatenated JSON**, **no `as`**.
   Mirror the workaholic manifests' field sets exactly (name/description/
   version/owner|author/plugins|dependencies).

3. **Marketplace + plugin endpoints (`src/PluginExport/usecase/
   pluginExportWeb.ts`).** A `plgg-server` `Web` sub-app serving, from the
   generated bundle: the **marketplace manifest** at the path the design step
   (1a) pinned as what `claude plugin marketplace add <instance-url>` resolves
   (candidate: `GET /.well-known/claude-plugin/marketplace.json` and/or a
   `route("/plugin", …)` prefix — settle it against a real client in step 1);
   `GET .../plugin.json`; `GET .../.mcp.json`; and `GET .../skills/:name/SKILL.md`
   for each generated skill. Every response is `jsonResponse` (or a
   text/markdown response for `SKILL.md`); every error folds to a typed JSON
   error — no thrown exception escapes. Document in the sub-app that it is
   **read-only and unauthenticated by design** (public content), and that the
   `/mcp` endpoint it advertises is the OAuth-protected one (ticket 27) whose
   handshake is the installing client's.

4. **Collection → skill (`src/PluginExport/usecase/collectionSkill.ts`).** Given
   a `CollectionSchema` and its documents (from ticket 16's `listCollection`
   with a generous `limit`), fold the schema fields over an **exhaustive
   `match`** and build a `SkillDoc`: a `description` naming the collection's
   subject/domain (so Claude Code's skill-selection reads it), and a body that
   (i) states what knowledge this collection holds, (ii) lists each article as
   `title → collection/path → one-line attribute/summary`, and (iii) instructs
   the model to fetch a full article via the MCP `get_article` tool or
   `GET <origin>/api/:collection/:path`, and to search via `search_content` /
   `GET <origin>/api/search?q=`. This is the progressive-disclosure map:
   skill index → article coordinate → live MCP/API fetch. Pure function.

5. **Generator (`src/PluginExport/usecase/generatePlugin.ts`).** Orchestrate:
   take the **live** index `Db` (the same handle serve startup built via ticket
   16's `openIndex` + `ingestFromConfig`) and the serve config (public origin,
   plugin name/description/version, owner). Call `listCollections`, and for each
   call `listCollection` + `collectionSkill`; assemble `MarketplaceManifest`
   (one plugin entry, `source` = this instance, `skills` = the generated skill
   names), `PluginManifest`, `McpJson` (via `httpMcpEntry(origin)`). Returns a
   `PromisedResult<GeneratedPlugin, …>` — HTTP-free, so `pluginExportWeb` is a
   thin adapter over it and a future CLI dump command can reuse it verbatim.

6. **Mount at the seam (`src/server/pressServer.ts`).** Add the marketplace/
   plugin routes inside `pressServeWeb` — **only** here (the seam's stated
   purpose; tickets 14/16/27 own it). Build the bundle from the live index
   handle already open at serve startup (D4: derived, current). `pressRouter`
   and the SSG (`build`) render path stay byte-untouched (SSG byte-identity
   gate). Confirm the origin threaded into the emitted URLs is a **serve-config
   value** = the public origin (step 1d / security policy), never a hard-coded
   `localhost`.

7. **Fix the plggpress export map (concern 51).** Widen
   `packages/plggpress/package.json` `exports` to carry `types`+`default` under
   both `import` and `require` (copy plgg-sql's dual-condition block). Verify a
   fresh `check-all.sh` still passes the export-surface probe (concern 51's
   clean-runner discovery).

8. **Runnable demo (a `plggpress plugin` CLI dump or an `example`-style
   script).** Prove value with a runnable artifact (working-style): from a
   plggpress site (`packages/guide`), invoke the generator against the live
   index and **print** the emitted `marketplace.json`, `plugin.json`,
   `.mcp.json`, and one generated `SKILL.md` — the proof-of-value the PR quotes.
   (A `plggpress plugin` subcommand on `cli.ts` that dumps the bundle to stdout
   is the natural home and doubles as an offline export; keep it a thin call
   into `generatePlugin`. If deferred, use a standalone `example.ts` instead —
   record which.)

9. **Specs (colocated, flat `test()`, absolute imports, real `node:sqlite`):**
   - `collectionSkill.spec.ts`: a fixture `CollectionSchema` + documents →
     a `SkillDoc` whose body lists every article with its coordinate and the
     fetch instruction; exhaustive field-kind coverage (a new field kind is a
     compile error).
   - `generatePlugin.spec.ts`: run against a **real** `plgg-content` index built
     through ticket 16's pipeline (two collections, several articles); assert
     one skill per collection, the `.mcp.json` URL = `<origin>/mcp`, the
     marketplace `source` = the instance, and the origin is the injected public
     origin (not `localhost`).
   - **Round-trip validation:** emit each manifest → `JSON.parse` → re-cast via
     `asMarketplaceManifest` (and the plugin/`.mcp.json` casters) → assert the
     shape conforms to the Claude Code plugin schema (the test.md "serializer
     round-trip" discipline).
   - `pluginExportWeb.spec.ts`: drive the sub-app end-to-end via `handle`/
     `toFetch` — the marketplace path returns the manifest, `plugin.json` /
     `.mcp.json` / `SKILL.md` routes return their bytes with correct
     content types, an unknown skill → 404, and **no write verb** is registered.
   - **SSG byte-identity:** `plggpress build` output unchanged (no marketplace/
     plugin route emitted).

10. **House rules end to end:** no `as`/`any`/`ts-ignore`; Option not null,
    Result not throw, exhaustive `match` over `CollectionSchema` field kinds and
    any method union; data-last pipelines; prefer `Str`/`asStr` over `SoftStr`
    where seams allow; Prettier `printWidth: 50`; **zero new third-party
    dependencies** (only already-present plggpress `file:` deps + Node stdlib);
    no native bindings; verify no build-order churn (no new package).

## Quality Gate

**Acceptance criteria**

1. **Marketplace add resolves:** `claude plugin marketplace add
   <instance-url>` against a running `plggpress serve` fetches a valid
   `marketplace.json` describing one plugin sourced at this instance — verified
   with the real Claude Code CLI, not a hand-mocked contract.
2. **Generated plugin is well-formed:** the served `plugin.json`, `.mcp.json`,
   and per-collection `SKILL.md` files conform to the Claude Code plugin schema
   (round-trip parse+re-cast passes); the plugin installs into Claude Code and
   its skills load.
3. **`.mcp.json` points at the OAuth-aware `/mcp` (tickets 26/27):** the emitted
   entry is `{ "type": "http", "url": "<public-origin>/mcp" }`; installing the
   plugin and using its MCP server drives ticket 27's discovery + OAuth
   handshake and answers `search_content` / `get_article` / `list_collections`.
   This ticket adds **no** MCP/auth code.
4. **Skills are derived from the content structure (D17):** one skill per
   content collection, its body indexing that collection's articles (title →
   `collection/path` → summary) with the MCP/API fetch instruction; regenerating
   after a content-model / corpus change (rebuilt index) yields updated skills —
   the plugin is **derived, never a stale committed artifact** (D4).
5. **MCP-only vs hybrid comparison recorded:** the design note states why both
   an MCP-only path (`claude mcp add --transport http <origin>/mcp`) and the
   plugin+MCP hybrid are offered, which is recommended, and what each gives the
   client — the ticket's decision artifact.
6. **No secret leaks, public origin only:** the emitted manifests/`.mcp.json`
   carry only the public served origin (the tunnel origin, not `localhost`) and
   **no** token/session/secret; skills are generated only from public content
   the SSG already serves.
7. **Served-only, one seam, SSG untouched:** all routes mount **only** in
   `pressServeWeb` (`pressServer.ts`); `pressRouter`/`buildSpecOf`/the theme are
   untouched; `plggpress build` output is byte-identical before/after (empty
   `diff -r`); no marketplace/plugin route in static output.
8. **No new package, no cycle, export map fixed:** the generator lives entirely
   in plggpress `PluginExport/`, reuses ticket 16's HTTP-free query functions
   and the live index handle, adds **no** new package and **no** new third-party
   dependency; plggpress's `exports` map now carries `types`+`default` under
   both `import` and `require` (concern 51).
9. **No escape hatches, coverage:** `grep` finds no `as `/`any`/`ts-ignore` in
   new modules; no string-concatenated JSON manifests; plggpress clears its ≥90
   four-metric gate including every new module.

**Verification method**

Run `scripts/tsc-plgg.sh` (where applicable) and `./scripts/test-plggpress.sh`
and paste the gate lines. Run the step-8 demo (`plggpress plugin` dump or the
`example` script) and paste the emitted `marketplace.json`, `plugin.json`,
`.mcp.json`, and one `SKILL.md`. **End-to-end install (Phase 10 gate):** from
`packages/guide`, `npx plggpress serve --port <p>` (over the public tunnel
origin), then:
`curl -s '<origin>/.well-known/claude-plugin/marketplace.json'` (or the pinned
path) returns the manifest; `claude plugin marketplace add <origin>` succeeds;
install the plugin and confirm the generated skills load and its `/mcp` server
completes the OAuth handshake (ticket 27) and answers a `search_content` /
`get_article` call — paste the transcript. Byte-identity: `npx plggpress build`
into two dirs before/after and paste the empty `diff -r`. Then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask the export map
change or the export-surface probe, concern 51) must be green end-to-end, with
plggpress above the >90 threshold across statements/branches/functions/lines.

**Gate**

All nine acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green AND the real Claude Code `marketplace add` → install → skills-load →
`/mcp` OAuth session is demonstrated. Any MCP/auth code added here (that belongs
to tickets 26/27), any secret or `localhost` in an emitted manifest, a
string-concatenated JSON manifest, a route mounted outside `pressServer.ts`, a
non-empty SSG diff, a new package or third-party dependency, an import-only
plggpress export map left unfixed, an `as`/`any`/`ts-ignore`, a throw where a
`Result` belongs, or a coverage dip fails the ticket.

## Considerations

- **The `marketplace add` contract must be verified, not assumed.** The exact
  URL/path and JSON body `claude plugin marketplace add <instance-url>` fetches
  is the load-bearing unknown — pin it against a real `claude plugin marketplace
  add` run in the design step (1a), including whether it expects a
  `.claude-plugin/marketplace.json` suffix, a bare marketplace JSON at the URL,
  or a git-style source. If the CLI only accepts a git repo or local path (not a
  live URL), the fallback is to serve the bundle as a downloadable tree the user
  points a local `marketplace add <path>` at — record which the client actually
  supports and design to it, do not ship a guessed endpoint.
- **Freshness = boot-time index (same constraint as ticket 16/26).** The plugin
  is rendered from the index built at serve startup; a long-running instance
  serving a mutated corpus is the hot-reload/operations concern (ticket 28, and
  concern 51's "hot reload does not refresh site.config.ts"). "Regeneration on
  content-model change" here means *derived from the current index* — when the
  index is rebuilt (restart, or a future `syncDocument`/watch signal), the
  exported plugin updates with it. A file-watcher that regenerates on change is
  ticket 28's job, not this ticket's; the API contract does not change.
- **Skill granularity is a corpus-scale tradeoff.** One skill per collection
  (with an article-index body) is chosen so the skill count stays bounded and
  progressive disclosure works (skill → article coordinate → MCP fetch). One
  skill per article would explode for a large corpus and defeat skill selection;
  a single root skill loses the map. Revisit trigger: a very large collection
  whose article index outgrows a readable `SKILL.md` — then paginate the index
  body or split by a sub-facet, a generator parameter, not a reshape.
- **Optional commands deferred.** D17 lists skills as the content-derived
  surface; an "ask this instance" slash command (a thin wrapper over
  `search_content` / the RAG agent) is a plausible nicety but is **not** shipped
  here — record it as a follow-up once a concrete need appears (ticket 25's
  voice agent or a real consumer earns it). Do not half-build commands.
- **The workaholic-plugin replacement is a long-term goal, not this ticket's
  deliverable.** D17's *"replaces the workaholic plugin once qmu.co.jp runs on
  plggpress"* depends on ticket 29 (qmu replacement) and on qmu content living
  in plggpress; this ticket ships the **mechanism**, and the cutover is assessed
  in ticket 29. Note the goal; do not attempt the migration here.
- **Write tools in the hybrid.** The generated `.mcp.json` exposes ticket 27's
  full tool set, including the account-holder write tools (`register_request` /
  `comment`) gated by `plggpress:write`. The skills describe the read surface;
  whether/how to surface the write tools in a skill body (so a collaborator's
  Claude Code knows it can contribute) is a small content decision — default to
  documenting them in the skill body's "contribute" note, gated by the reader
  understanding they need an account-holder token (the OAuth flow enforces it).
- **Export-surface concern (51).** Adding `PluginExport/` to plggpress widens
  the surface plgg-bundle discovers by execution; keep the barrel clean and the
  export map dual-condition (step 7), and confirm on a fresh clean-runner
  `check-all.sh`. A surface-probe misbehavior is concern 51, not this ticket's
  bug — record and route it there.
