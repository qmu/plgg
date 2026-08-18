---
created_at: 2026-08-18T07:20:00+00:00
status: done
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

## Final Report

Development completed as planned.

### Open Decision — resolved

**Which Worker shape the guide adopts** → **(b) Cloudflare Workers Static
Assets, with no Worker script.**

The reference the instruction names, `qmu-co-jp`'s `packages/site`, could not be
read: this session's GitHub access is scoped to `qmu/plgg`, and the attempt was
refused outright — `Access denied: repository "qmu/qmu-co-jp" is not configured
for this session. Allowed repositories: qmu/plgg`. So option (a), "mirror
whatever the reference does", is not a choice this run could make; picking it
would have meant inventing the reference's shape and calling it a mirror.

Option (b) is also the better fit on its own terms, which is why it is recorded
as a decision rather than a fallback. plggpress emits a fully static tree — 40
HTML files, one `<page>/index.html` per page plus a top-level `404.html`, with
every stylesheet and script inlined, so there is not one non-HTML asset. The two
questions that tree poses are how a directory URL resolves and what a miss
returns, and Cloudflare's Static Assets runtime answers both declaratively
(`html_handling` / `not_found_handling`). A `main` handler would only
re-implement them in code that can drift from the build; the Worker script that
does not exist is the one that cannot.

If the reference repository turns out to use a scripted Worker, converging is a
config-level change to `wrangler.jsonc`, not a rewrite — nothing else in this
ticket depends on the shape.

### Sequencing decision

`wrangler.jsonc` declares `workers_dev: true` and **no route**. The ticket's gate
requires that nothing about the live `plgg.qmu.co.jp` delivery has changed yet,
and the next ticket's own considerations ask for the Worker to be proven on
workers.dev before the production DNS record moves. A `routes` entry here would
have made the first `wrangler deploy` the cutover. Hostnames are also not this
repository's to declare: the `qmu.co.jp` zone is Terraform-managed in the
corporate repository, so wrangler owns the route and Terraform owns the record —
never `custom_domain: true`, which would have wrangler write DNS that Terraform
believes it owns.

### Discovered Insights

- **Insight**: plggpress's build writes `outDir/<path>/index.html` per page and a
  single `outDir/404.html` (`framework/Build/usecase/build.ts`, steps 4-5), and
  inlines every stylesheet and script — the guide's whole `dist` is 40 HTML files
  and nothing else.
  **Context**: this is the entire specification of the delivery surface. It is
  why `html_handling: "auto-trailing-slash"` and `not_found_handling: "404-page"`
  reproduce GitHub Pages exactly, and why no asset-hashing, caching or MIME
  configuration is needed. Any future generator change that emits sibling assets
  or `<page>.html` instead of `<page>/index.html` invalidates that config.
- **Insight**: `wrangler dev` runs the real workerd runtime against `dist` with
  no Cloudflare account and no login; only `wrangler deploy` needs credentials.
  **Context**: the delivery surface is therefore fully testable in CI and in an
  unattended run — the buildable half of every Cloudflare ticket in this mission
  can be proven here, and only the account-bound half is a genuine handoff.
- **Insight**: `npm install --workspace @plgg/guide` is the correct way to add a
  package dependency in this repo; `scripts/npm-install.sh` is one root install
  and the root `package-lock.json` is the single resolution artifact
  (`packages/*/package-lock.json` is gitignored on purpose).
  **Context**: wrangler's bin lands in the ROOT `node_modules/.bin`, which is why
  `npm run deploy --prefix packages/guide` resolves it from any working
  directory, including a bare CI runner.
