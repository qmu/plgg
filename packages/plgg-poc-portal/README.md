# plgg-poc-portal

> The plggpress PoC portal for the [plgg monorepo](../../README.md) — the
> index app of the `plggpress-technical-confidence-poc-portal` mission's
> confidence-collection fleet.

Each open technical question on the road to the next plggpress (SSG + Browser
RAG for both Writer and Reader) gets one small, discardable PoC app, developed
on its own local port and exposed at its own `*.qmu.dev` hostname through the
shared cloudflared tunnel. This package renders the fleet's **index page**:
one card per PoC with the question it answers, the observation that counts as
"proven" (the confidence signal), its status, and the verdict once measured —
plus the fleet's hostname/port allocation table.

The page is **pure static output**: the PoC records are typed data in
[`src/pocs.ts`](src/pocs.ts), the page is one pure view
([`src/view.ts`](src/view.ts)), and the build renders it to
`dist/site/index.html` with plgg-server's SSG surface. There is no client
bundle — the only interactions are links. A concluding PoC ticket edits
exactly its own record (status + verdict) in `src/pocs.ts` and rebuilds.

## Commands

- `npm run build` — render `dist/site/index.html` (SSG via plgg-server).
- `npm run serve` — serve the built page on `PORT` (default 5173) with a
  node-builtins-only static server.
- `npm run test` — strict typecheck + the smoke specs (data invariants,
  exhaustive status rendering, honest empty/absent states).

From the repo root, `scripts/serve-poc.sh poc-portal` starts the containerized
workload (host port **5183** → container 5173).

## Fleet allocation

Ports **5183–5190** are reserved for this fleet (5173, 5181, 5182, and
5191–5196 are taken by other qmu.dev workloads). The tunnel ingress is
**developer-applied** — system configuration is never edited by agents. Add to
`~/.cloudflared/config.yml` under the `qmu-dev` tunnel's `ingress:` (before
the catch-all rule), then restart cloudflared:

```yaml
- hostname: plgg-poc.qmu.dev
  service: http://localhost:5183
- hostname: plgg-poc1.qmu.dev
  service: http://localhost:5184
- hostname: plgg-poc2.qmu.dev
  service: http://localhost:5185
- hostname: plgg-poc3.qmu.dev
  service: http://localhost:5186
- hostname: plgg-poc4.qmu.dev
  service: http://localhost:5187
- hostname: plgg-poc4b.qmu.dev
  service: http://localhost:5190
# 5188–5189 reserved for plgg-poc5..6 — add each hostname when its PoC ships.
```

| Hostname | Port | App |
| --- | --- | --- |
| `plgg-poc.qmu.dev` | 5183 | this portal |
| `plgg-poc1.qmu.dev` | 5184 | PoC 1 — browser search core |
| `plgg-poc2.qmu.dev` | 5185 | PoC 2 — reader-side browser agent |
| `plgg-poc3.qmu.dev` | 5186 | PoC 3 — writer-side voice assistant |
| `plgg-poc4.qmu.dev` | 5187 | PoC 4 — agent file edits + hot reload |
| `plgg-poc4b.qmu.dev` | 5190 | PoC 4b — live co-editing preview |
| (reserved) | 5188–5189 | PoC 5–6 |

## Status vocabulary

`planned` → `building` → one of `proven` / `disproven` / `needs-another-round`.
A concluded status must carry a verdict; an unconcluded one must not (the
`pocConsistent` invariant, pinned by the specs). Planned PoCs render a
reserved hostname as text — the portal never links to something not serving.
