# plgg-poc5-config

> PoC 5 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — **central configuration generation:
> the writer's agent maintains the site's config as typed data**. A tag
> classification (name/color/emoji/description), path exclusions, and the
> layout + a prefixed sizing theme are one typed `Config` value; changing
> it re-renders the sample site live, no reload.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The mission asks: **can the writer's agent maintain the site's central
configuration — front-matter tag classification (name/color/emoji/
description), path exclusions, layout and sizing themes — as generated
data?** This PoC answers it on the PoC 4b spine, aimed at a new write
target: instead of editing document *content*, the agent's requests
maintain a single **typed central configuration**, and the sample site
re-renders to reflect it — recolored/badged tag chips, hidden excluded
paths, a re-laid-out and re-sized grid.

## The deterministic heart (why it is headless-replayable)

PoC 4b's typed path still ran every turn through the live model. PoC 5's
confidence signal must be replayable with **no model at all**, so the
typed path is a **pure command parser** (`src/command.ts`):

```
tag <slug> [name=..] [color=..] [emoji=..] [desc=..]
exclude <glob>          include <glob>
theme <sz-…>            layout <single-column|multi-column|wide>
```

Each line parses to exactly one `ConfigOp` (`src/apply.ts`), applied by the
one total `applyOp`. The clickable theme/layout switches emit the same
ops. The **Realtime voice session is a bonus** (`src/agent.ts`,
`src/vendors/realtime.ts`): when `OPENAI_API_KEY` is set, the assistant
calls the same five tools (`set_tag`, `exclude_path`, `include_path`,
`set_sizing_theme`, `set_layout`) — the exact same ops, a second way in.

Every dial is a **closed union** rendered with an exhaustive `switch`
(`src/config.ts`): the 7-color scheme, the seven `sz-` sizing themes, and
the three layouts. Adding a value without handling it is a compile error —
the durable-core guarantee the plggpress vision leans on.

The configuration is **client state the sample site renders live** — a
deliberate sacrificial-PoC bound: the durable-core question the mission
asks (can the agent maintain config AS TYPED DATA the site renders) is
answered by the typed model plus the two write paths funnelling through
the one pure `applyOp`, without a disk-persistence seam.

## Layout

- `src/config.ts` — the central-configuration model, the closed dials
  (colors / sizing themes / layouts) with their exhaustive label/scale
  lookups, the string→union guards, and the seeded `DEFAULT_CONFIG`.
- `src/apply.ts` — `ConfigOp` / `ConfigError` and the one total applier.
- `src/command.ts` — the deterministic typed-command parser.
- `src/pages.ts` — the sample site as data: tree-derived tags, the glob
  exclusion matcher, the visible-page filter.
- `src/agent.ts` — the five config tools, the session instructions, and
  the Realtime event decoder (voice bonus).
- `src/protocol.ts` — the wire casters (`unknown` → session grant / pages
  index).
- `src/app.ts` — the pure TEA reducer (model + `update`); `src/effects.ts`
  the IO edge; `src/view.ts` the render tree; `src/main.ts` the mount.
- `src/entrypoints/serve.ts` — the one shell server (page, `main.js`,
  `/index/pages.json`, `/api/health`, `/api/session`); no write seam.
- `src/entrypoints/seedContent.ts` — seed the git-ignored sample-site copy
  of `packages/guide`.

## Commands

- `npm run build` — bundle `dist/main.js` (in-house bundler, `target:app`).
- `npm run seed-content` — seed the git-ignored `content/` sample-site copy.
- `npm run serve` — the shell server (`PORT`, default 5173). For the voice
  bonus put `OPENAI_API_KEY` in the repo-root `.env` (or export it).
- `npm run test` — strict typecheck + the offline specs (config model,
  applier, command parser, page derivation/exclusion, event decoding, wire
  casters, and the TEA reducer).

From the repo root: `scripts/serve-poc.sh poc5-config` (it sources the
root `.env`; an explicit `OPENAI_API_KEY=…` prefix still overrides) —
host port **5188** → container 5173; tunnel route `plgg-poc5.qmu.dev`;
single-process — see
[`workloads/poc5-config/`](../../workloads/poc5-config/compose.yaml).
Build the bundle first (`npm run build`); the container auto-seeds
`content/` on first run.

Cloudflared ingress (developer-applied, `~/.cloudflared/config.yml`,
before the catch-all):

```yaml
- hostname: plgg-poc5.qmu.dev
  service: http://localhost:5188
```

## Sovereignty note

The typed command path is fully deterministic and needs no model. The
optional voice path streams to OpenAI's Realtime API, authorized by a
SHORT-LIVED key the server mints; the standing key never reaches the
browser. The sample site is a git-ignored copy of the guide corpus; the
configuration is client state.
