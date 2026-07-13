# plgg-poc4-edit

> PoC 4 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — **agent file edits with live hot
> reload over a surviving Realtime session**: the assistant's `edit_file`
> tool call lands on disk through the dev server, the edited page
> hot-reloads inside an iframe, and the SAME session (voice **and** typed
> text) continues uninterrupted.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The plggpress vision's writer mode lets the browser agent update local
files while the page hot-reloads and the realtime websocket stays alive.
This PoC collects confidence in exactly that seam, on PoC 3's proven
voice scaffold, with two locked design decisions (ticket, 2026-07-12):

- **Iframe isolation.** plgg-bundle's dev live-reload script does
  `location.reload()`, which would tear down the module-level WebRTC
  state. So the session-bearing **shell** is its own page served WITHOUT
  that script (`src/entrypoints/serve.ts`, no-store), and the
  plggpress-rendered doc page lives in an **iframe** under `/docs/*`,
  proxied to an INTERNAL `plgg-bundle dev` server (`npm run dev:docs`,
  :5175) — including the `/__plgg_reload` SSE stream, piped raw so it is
  never buffered. Only the iframe reloads when an edit lands.
- **The agent edits a COPY.** `npm run seed-content` seeds `content/`
  (git-ignored) from `packages/guide`'s markdown + `site.config.ts`; the
  real guide never accumulates uncommitted AI edits; reset = re-seed
  (`npm run reset-content`).

The write path is layered (defense-in-depth): `POST /api/edit` validates
the body inward (`unknown` → `asEditRequest`), the ONE authoritative pure
guard `resolveEditPath` (`src/edit.ts`) authorizes the path (relative
only, no traversal, `.md` only — exhaustively spec'd), the fs boundary
re-checks realpath containment (symlink escape), and the write itself is
temp+rename (the plgg-cms `exportFs` pattern) so the hot-reload watcher
never reads a torn file. After a landed edit the serve process rebuilds
its in-memory FTS index and the browser refetches it — the very next
`search_docs` sees the new text.

Both writer input paths share one session: the microphone from PoC 3,
plus a typed turn sent as an `input_text` conversation item over the same
data channel — no second mint. The standing `OPENAI_API_KEY` stays in the
serve process behind `POST /api/session` (honest 404 without it).

## Commands

- `npm run seed-content` / `npm run reset-content` — (re)seed the
  agent-editable `content/` copy from `packages/guide`.
- `npm run build` — bundle the shell client (`dist/main.js`).
- `npm run dev:docs` — the INTERNAL plggpress dev server over `content/`
  (:5175; set `DOCS_BASE=/docs/` so rendered hrefs stay behind the shell's
  proxy).
- `npm run serve` — the shell server on `PORT` (default 5173): page,
  bundle, in-process index, `/api/*` seams, and the `/docs` proxy
  (`DOC_PORT`, default 5175). For live sessions put `OPENAI_API_KEY`
  in the repo-root `.env` (see `.env.example`) — or export it, which
  wins over the file.
- `npm run test` — strict typecheck + the offline specs (the edit-path
  security boundary, event decoding for both tools, the session/edit/text
  reducer, the wire casters).

From the repo root: `scripts/serve-poc.sh poc4-edit` (it sources the
root `.env`; an explicit `OPENAI_API_KEY=…` prefix still overrides)
(host port **5187** → container 5173; tunnel route `plgg-poc4.qmu.dev`;
the container runs both processes — see
[`workloads/poc4-edit/`](../../workloads/poc4-edit/compose.yaml)).

Cloudflared ingress (developer-applied, `~/.cloudflared/config.yml`,
before the catch-all):

```yaml
- hostname: plgg-poc4.qmu.dev
  service: http://localhost:5187
```

## Sovereignty note

Voice and typed turns stream to OpenAI's Realtime API, authorized by a
SHORT-LIVED key the server mints; the standing key never reaches the
browser. Search runs locally over the shipped index; edits write only the
git-ignored `content/` copy, never the real guide.
