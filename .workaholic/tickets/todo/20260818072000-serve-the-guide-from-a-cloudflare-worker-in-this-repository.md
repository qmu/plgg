---
created_at: 2026-08-18T07:20:00+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission: deliver-the-guide-from-cloudflare-workers-with-a-staging-surface
merge_policy:
verification_handoff: 
---

# Serve the guide from a Cloudflare Worker in this repository

## Overview

PROPOSED. The guide's built output (`packages/guide/dist`, produced by
`npx plggpress build --config site.config.ts --contentDir . --outDir dist`)
currently reaches the world only as a GitHub Pages artifact — nothing in this
repository describes a Cloudflare Worker, and `grep -ril wrangler` over the tree
returns no configuration, only prose about the `cloudflared` tunnel that fronts
the always-on plggpress deployments (`packages/plggpress/OPERATIONS.md`). This
ticket adds the delivery surface itself: a Worker, defined in this repository,
that serves the guide's static build, deployable by hand with `wrangler deploy`.
It deliberately stops short of wiring CI and of the staging hostname — those are
the mission's next two tickets — so that the Worker can be proven locally before
anything about the live site changes.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` — delivery paths and runtime behavior: this ticket introduces a new one
- `plgg-coding-style` — if any TypeScript is written for the Worker entry point

## Key Files

- `packages/guide/package.json` — the guide package; the `build` script that
  produces `dist`, and where a `deploy` script would sit beside it.
- `packages/guide/site.config.ts` — `base` is read from `DOCS_BASE` and defaults
  to `/`; a Worker serving at the domain root needs no base override, so this
  file is expected to stay as it is (confirm rather than assume).
- `packages/guide/.gitignore` / repo root ignores — `dist` must stay untracked
  while becoming the Worker's upload directory.
- `.github/workflows/deploy-guide.yml` — read-only here: the build commands this
  ticket must reproduce (`./scripts/npm-install.sh`, `./scripts/build.sh`, then
  the plggpress build) live in it. It is retired by the next ticket, not this one.
- `packages/plggpress/OPERATIONS.md` — the existing delivery story, so the new
  surface is documented next to it rather than in a second, divergent place.

## Implementation Steps

1. Read how the guide's `dist` is actually produced today, end to end, on a clean
   tree: `./scripts/npm-install.sh`, `./scripts/build.sh`, then the plggpress
   build in `packages/guide`. Record what the output tree looks like (entry file,
   asset paths, whether directory URLs need an `index.html` fallback) — the
   Worker's correctness is entirely a question of that shape.
2. Add the Worker's configuration to `packages/guide` (a `wrangler.toml` or
   `wrangler.jsonc`, matching whichever form the toolchain version in use
   documents), naming the production Worker and pointing its static-asset
   directory at the guide's `dist`.
3. Resolve the Open Decision below on how assets are served, then implement that
   shape — including the not-found behavior the guide needs (plggpress emits
   directory-style URLs, so a missing trailing-slash request must not 404).
4. Add an explicit deploy entry point to `packages/guide/package.json` (e.g.
   `"deploy": "wrangler deploy"`) so CI in the next ticket calls a script this
   repository owns rather than embedding the command in a workflow file.
5. Verify locally with `wrangler dev` against the real `dist`: the landing page,
   a nested concept page, a generated package-reference page, and a deliberately
   missing path all behave as they do on the Pages site today.
6. Document the new surface in `packages/plggpress/OPERATIONS.md` (or the guide's
   own README, whichever the reviewer prefers) — one short section, so the next
   reader does not have to infer the topology from a config file.

## Open Decisions

<!-- Recorded verbatim rather than resolved: this session cannot ask, and the
     fork changes the artifact's shape. -->

- **Which Worker shape the guide adopts.** The instruction names
  `qmu-co-jp`'s `packages/site` as the reference — "既に wrangler deploy で
  Worker 配信している形が参考になる" — and that repository is outside this
  session's reach, so its actual shape could not be read. The two candidates are
  (a) mirror whatever `qmu-co-jp/packages/site` does, keeping the two sites
  operationally identical, or (b) adopt Cloudflare Workers Static Assets
  independently with a minimal or absent Worker script. The driving session must
  open the reference repository and state which it chose, and why, in its Final
  Report — do not pick silently.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/guide` carries a committed Worker configuration that names the
  production Worker and its static-asset source.
- `npm run build` followed by the repository-owned deploy script publishes the
  guide's `dist` to a Cloudflare Worker with no hand-typed command.
- A `wrangler dev` session serves the landing page, a nested page, a generated
  package-reference page, and a not-found path with the same behavior the live
  Pages site has today.

**Verification method** — the commands/tests/probes that prove them:

- `./scripts/npm-install.sh && ./scripts/build.sh`, then
  `npm run build --prefix packages/guide`.
- `npx wrangler dev` in `packages/guide`, with the four URLs above requested
  against it.
- `node scripts/typecheck.ts` and `scripts/test-plgg.sh` if any TypeScript was added.

**Gate** — what must pass before approval:

- The four-URL `wrangler dev` check passes, the Open Decision above is answered in
  the Final Report, and nothing about the live `plgg.qmu.co.jp` delivery has
  changed yet (the Pages workflow is still the publisher until the next ticket).

## Considerations

- Nothing in this repository has ever run `wrangler`; the local check needs a
  Cloudflare login only for a real `deploy`, not for `wrangler dev`, so the
  buildable half of this ticket is verifiable without the account.
- The guide's `dist` is a build product, not tracked content — keep it ignored,
  and let the Worker read it at deploy time rather than committing it.
