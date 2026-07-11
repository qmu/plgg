# plgg-poc2-agent

> PoC 2 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — a **reader-side embedded browser agent**
> answering questions grounded in the shipped document index, with cited
> answers judged side-by-side against their retrieved evidence.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The plggpress vision puts a browser agent on every generated static site so
the reader can ask the docs questions. This PoC collects the confidence that
the answers can be **grounded and honest** with the smallest possible moving
parts:

- **Retrieval is PoC 1's proven FTS arm, in the browser.** The build entry
  chunks the real plgg guide by heading path and ships one `fts.json`; the
  page ranks it with the same from-scratch BM25 (`src/poc1.ts` is the single
  reuse seam onto `plgg-poc1-search`'s source). No search backend, no network
  for retrieval.
- **The model call is the ONE server seam.** `POST /api/answer` receives the
  question plus the browser-retrieved chunks and calls plgg-kit's
  `generateObject` (OpenAI Responses API structured output — a single
  completion, not a tool-calling loop) with `OPENAI_API_KEY` from the server
  process env. **The key never reaches the browser or the repo**: the shipped
  bundle contains no provider code, and with no key the route answers an
  honest 404 the page announces up front (mirroring plgg-cms's `agentWeb`
  "agent hidden with no key" contract).
- **Citations are the proof.** The model must cite the numbered sources it
  used; the server maps those onto chunk ids (dropping hallucinated numbers),
  and the page renders every answer **next to the retrieved evidence**, cited
  chunks marked, each citation a heading-path link into the live guide
  (`https://plgg.qmu.co.jp/…`). An empty citation list renders as the honest
  "the sources do not contain this answer" state.

The confidence signal (mission `plggpress-technical-confidence-poc-portal`):
a ten-question canned set runs the whole proof in one click, so the developer
judges grounding quality live in a browser — the same "citations + canned
set" bar PoC 1 used.

## Commands

- `npm run build` — bundle the client (`build:app`), then build the index
  (`build:index`; order matters — the bundler's atomic publish replaces
  `dist/`).
- `npm run serve` — serve page/bundle/index **and the answer API** on `PORT`
  (default 5173). Export `OPENAI_API_KEY` first for live answers; without it
  the PoC serves its honest "agent not configured" state.
- `npm run test` — strict typecheck + the offline smoke specs (wire-contract
  casters, the full answer path against an injected fake `postJson` — no
  network in tests — the reducer lifecycle, and the citation-link scheme).

From the repo root: `OPENAI_API_KEY=… scripts/serve-poc.sh poc2-agent` (host
port **5185** → container 5173; tunnel route `plgg-poc2.qmu.dev`,
developer-applied — see the portal README's cloudflared snippet).

## Sovereignty note

Stated honestly either way, on the page itself: **the reader's question and
the retrieved excerpts leave the device** for the provider on each answer —
through this site's server seam, never directly from the browser. Unlike PoC
1's fully-local search, that is inherent to the model call. The corpus, the
index, and retrieval itself stay on-device, and the key stays server-side.

## Status vocabulary

The verdict is recorded on the portal's PoC 2 record
(`../plgg-poc-portal/src/pocs.ts`, currently `building`) after the developer
judges the canned side-by-side grounded answers in a real browser.
