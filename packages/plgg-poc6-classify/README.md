# plgg-poc6-classify

> PoC 6 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — **non-tree file classification: tag/link
> grouping over the tree-shaped corpus**, presented as THREE comparable
> navigation variants (tag facets · link/backlink graph · multi-dimensional
> filter) rendered side by side over one corpus.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The mission asks: **does tag/link-based grouping over the tree-shaped file
system yield a multi-dimensional search UX that both humans and browser
agents can operate?** The filesystem is a tree, but knowledge is
multi-dimensional — a page belongs to several tags and links to several
others. This PoC classifies the corpus non-hierarchically and navigates it
three ways at once, so the variants can be compared, and makes each
variant's search a deterministic pure function so an agent can drive it.

## The classification (src/classify.ts)

Each page is derived — purely, offline — from its path and markdown text:

- **tags** = every directory segment of the path (so `packages/plgg/x.md`
  is both `packages` and `plgg`) plus any front-matter `tags:` — sourced
  from the tree so the PoC runs on the real guide corpus with no front
  matter required;
- **links** = the in-corpus markdown links the page makes, resolved against
  its directory (dangling/external links dropped); **backlinks** are the
  inverse adjacency.

## The three variants (src/variants.ts)

A `VariantQuery` is a closed union; `runQuery` is total and exhaustive, so
every variant's search is a deterministic pure function of `(pages, query)`:

- **tag-facets** — filter by a set of tags, combined with `and` or `or`;
- **link-graph** — the neighbors (out + back links) of a focus page;
- **multi-filter** — combine tags with a path substring.

## The deterministic heart (why it is headless-replayable & agent-drivable)

The typed path is a **pure query-command parser** (`src/command.ts`) — no
model:

```
facets <and|or> [tag …]     links <page path>     filter <text | #tag …>
```

Each line parses to exactly one `VariantQuery`, routed to its pane. Clicking
a tag runs a facet query; clicking any result page focuses the link graph on
it. The **Realtime voice session is a bonus** (`src/agent.ts`,
`src/vendors/realtime.ts`): when `OPENAI_API_KEY` is set, the assistant calls
the same three tools (`query_facets`, `query_links`, `query_filter`) — the
exact same queries. Because each query is a pure function and the state is
URL-/model-held, the same command always returns the same page set — which
is precisely what makes "an agent can drive each variant's search
deterministically" checkable.

## Layout

- `src/classify.ts` — the classification core (tree+front-matter tags, link
  resolution, tag/backlink adjacencies).
- `src/variants.ts` — the three variants and their pure query functions.
- `src/command.ts` — the deterministic query-command parser.
- `src/agent.ts` — the three query tools, session instructions, and the
  Realtime event decoder (voice bonus).
- `src/protocol.ts` — the wire casters (`unknown` → session grant / classified
  pages index).
- `src/app.ts` — the pure TEA reducer (model + `update`); `src/effects.ts`
  the IO edge; `src/view.ts` the render tree; `src/main.ts` the mount.
- `src/entrypoints/serve.ts` — the one shell server (page, `main.js`,
  `/index/pages.json` built by classify.ts, `/api/health`, `/api/session`).
- `src/entrypoints/seedContent.ts` — seed the git-ignored corpus copy of
  `packages/guide`.

## Commands

- `npm run build` — bundle `dist/main.js`.
- `npm run seed-content` — seed the git-ignored `content/` corpus copy.
- `npm run serve` — the shell server (`PORT`, default 5173). For the voice
  bonus put `OPENAI_API_KEY` in the repo-root `.env` (or export it).
- `npm run test` — strict typecheck + the offline specs (classification core,
  the three variant queries, the query-command parser, event decoding, wire
  casters, and the TEA reducer).

From the repo root: `scripts/serve-poc.sh poc6-classify` (it sources the
root `.env`; an explicit `OPENAI_API_KEY=…` prefix still overrides) —
host port **5189** → container 5173; tunnel route `plgg-poc6.qmu.dev`;
single-process — see
[`workloads/poc6-classify/`](../../workloads/poc6-classify/compose.yaml).
Build the bundle first (`npm run build`); the container auto-seeds
`content/` on first run.

Cloudflared ingress (developer-applied, `~/.cloudflared/config.yml`,
before the catch-all):

```yaml
- hostname: plgg-poc6.qmu.dev
  service: http://localhost:5189
```

## Sovereignty note

The typed query path is fully deterministic and needs no model. The optional
voice path streams to OpenAI's Realtime API, authorized by a SHORT-LIVED key
the server mints; the standing key never reaches the browser. The corpus is
a git-ignored copy of the guide.
