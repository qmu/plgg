---
created_at: 2026-07-15T02:28:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Removed
depends_on:
mission: modernize-plgg-bundle
---

# Retire the hand-wiring: move guide and strategy onto `plggpress dev`

## Overview

`plggpress dev` shipped (`c6761c06`) and was proven in a real consumer: with
`bundle.config.ts`, `devEntry.ts` and the `plgg-bundle` devDependency all removed,
`npx plggpress dev` served `../strategy` and an edit hot-reloaded with no rebuild.
But **both consumers still carry the old hand-wiring** — the point of the command
is to delete it, and until that happens the friction it removes is still being
paid every day.

This ticket does the deletion. It was deliberately split out of the dev-command
ticket: that one shipped the capability, this one retires what the capability
replaces. Splitting kept a live guide container out of a large feature change.

## Key Files

- `packages/guide/{bundle.config.ts,devEntry.ts,package.json}` — delete the first
  two; the `dev` script becomes `plggpress dev --watch-theme`; drop the
  `plgg-bundle` devDependency.
- `../strategy/{bundle.config.ts,devEntry.ts,scripts/dev.sh,package.json}` — same,
  without `--watch-theme` (a consumer does not co-develop the theme). NOTE: these
  are UNTRACKED/uncommitted in that repo and sit alongside the developer's own
  in-progress edits to `docs/index.md` — coordinate before touching it.
- `workloads/guide/dev-entrypoint.sh` — ends in `exec npm run dev`, so **no
  compose/Dockerfile change is needed**; only its stale `plgg-bundle dev` comments.
- `scripts/gate-guide-deps.sh` — re-check after the guide's `package.json` changes;
  it reconciles the container's install/volume/build lists against plggpress's
  runtime deps.

## Findings from the dev-command session (do not re-derive)

- **Guide migrates cleanly, with one must**: `--watch-theme` is REQUIRED to preserve
  today's theme hot reload (guide watches `../plggpress/src`). Everything else
  already lines up: guide has no `docs/`, so the convention picks its package root
  (matching today's `devEntry.ts`); its `site.config.ts` already declares
  `plgg-guide.qmu.dev`, so the `allowedHosts` duplication in `bundle.config.ts`
  disappears; and the default port 5173 is already the container's internal port.
- **`sourceAliases` is always empty**, even under `--watch-theme` — the `plggpress`
  bin registers its own `plggpress/*` → `src/*` resolver at process entry, so the
  theme already loads from source; only the watch trigger was ever missing.

## Considerations

- **The guide container is DOWN** (`guide_guide_1`, Exited (1) since 2026-07-14
  21:59) — it died of `ENOENT: /app/packages/guide/dist/README` when a host-side
  `packages/guide` rebuild pulled `dist` out from under it, NOT of anything in the
  guide's own config. Bring it back with
  `podman compose -f workloads/guide/compose.yaml up --force-recreate -d` (a plain
  restart does not re-establish port forwarding) and allow a 20–60s cold start.
  **Verify the migration by actually starting the container and loading
  `plgg-guide.qmu.dev`** — a green `check-all` will NOT tell you the container's dev
  path works.
- **Do not rebuild `packages/guide` on the host while that container serves** — that
  is exactly what killed it.
- `plggpress build` (SSG + dead-link check) and `plgg-cms serve` must stay
  non-regressed; they share the render path but not the dev path.
- Deleting `../strategy`'s wiring touches a SIBLING repo with uncommitted developer
  work in it. Confirm before editing, and never `git add -A` there.
