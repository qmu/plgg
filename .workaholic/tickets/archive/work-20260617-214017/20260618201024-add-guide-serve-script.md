---
created_at: 2026-06-18T20:10:24+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 0.5h
commit_hash: 74ed35f
category: Added
depends_on:
---

# Add a `scripts/` wrapper to launch the guide Docker container

## Overview

There is **no shell-script entry point** for running the plgg family guide
(VitePress) container. To serve the docs locally you must already know to type
`docker compose -f workloads/guide/compose.yaml up --build` by hand — the
command lives only in `workloads/guide/README.md` and the compose file's header
comment. Every other repeatable task in the repo is a `scripts/*.sh` wrapper
(`test-plgg.sh`, `build.sh`, `tsc-plgg.sh`, …) that `menu.sh` auto-discovers, so
the guide is the odd one out: a run path reachable only from memory.

Add `scripts/serve-guide.sh` — a thin, conventional wrapper that launches the
guide dev container, matching the house `scripts/` style so it shows up in
`menu.sh` automatically. This turns an undocumented, memorized command into a
discoverable, reproducible one.

## Key Files

- `scripts/build.sh` — the closest convention template: `#!/bin/sh -eu`,
  `REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT`, an `echo`
  banner, the command, and a trailing success line. Mirror this shape.
- `scripts/test-plgg.sh` — the minimal single-command wrapper form to copy.
- `scripts/menu.sh` — auto-discovers every `scripts/*.sh` (except itself) and
  runs the selected one, blocking until it returns. Relevant because the new
  script is a **long-running foreground** process (`docker compose up`), unlike
  the build/test scripts that complete — see Considerations.
- `workloads/guide/compose.yaml` — the compose service the script invokes
  (`-f workloads/guide/compose.yaml up --build`); serves on port 5173 with the
  repo bind-mounted for hot-reload.
- `workloads/guide/Dockerfile` — the dev image (`vitepress dev`); note it does
  **not** run `npm run docs:api`, so it serves whatever `packages/guide/api/*`
  is already on disk.
- `workloads/guide/README.md` — currently the only home of the run command;
  keep it, and (optionally) point it at the new script.
- `packages/guide/package.json` — `docs:api` (`node scripts/gen-api.mjs`),
  `dev`, `build`, `preview` scripts; relevant to the API-reference freshness
  consideration below.

## Related History

The guide container and its API autogeneration were established by the
VitePress guide epic; this ticket adds the missing ergonomic front door to that
already-built workload.

Past tickets that touched this area:

- [20260617213957-guide-scaffold-and-container.md](.workaholic/tickets/archive/work-20260617-214017/20260617213957-guide-scaffold-and-container.md) - Scaffolded the guide and its dev container (`workloads/guide/`) (same workload)
- [20260617214004-guide-api-autogen-and-ci.md](.workaholic/tickets/archive/work-20260617-214017/20260617214004-guide-api-autogen-and-ci.md) - Added API autogen + the guide deploy CI (`docs:api`, `deploy-guide.yml`) (API-freshness consideration)

## Implementation Steps

1. Create `scripts/serve-guide.sh` following the `scripts/build.sh` shape:
   - `#!/bin/sh -eu`
   - `REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT`
   - an `echo` banner naming what it does and the URL (http://localhost:5173)
   - `exec docker compose -f workloads/guide/compose.yaml up --build`
     (`exec` so Ctrl-C / signals reach compose cleanly; the success-banner tail
     used by the completing scripts does not apply to a foreground server).
2. `chmod +x scripts/serve-guide.sh` so it matches the other executable wrappers.
3. Update `workloads/guide/README.md`'s "Run it" section to mention the wrapper
   as the primary path (`bash scripts/serve-guide.sh`), keeping the raw
   `docker compose` and plain-Docker forms as the underlying equivalents.
4. Verify: `bash scripts/serve-guide.sh` builds and serves the guide at
   http://localhost:5173, and the script appears in `menu.sh`'s list.

## Considerations

- **Operation policy — remove the path that lives in one person's head**
  (`workaholic:operation` → `policies/ci-cd.md`). The policy explicitly rejects
  "a path reachable only by hand" / "logic that cannot be reproduced because it
  lives in someone's memory." A repo-committed wrapper is the structural fix:
  reproducible by anyone, no recall required. (`scripts/serve-guide.sh`)
- **Vendor-neutral, reproducible locally** (`workaholic:implementation`). The
  script is a plain POSIX `sh` wrapper over `docker compose`; it adds no
  vendor-locked DSL and stays runnable on any host with Docker.
- **Long-running foreground process vs. `menu.sh`.** Unlike `build.sh`/
  `test-plgg.sh`, this script does not return until the server is stopped
  (Ctrl-C). Within `menu.sh` it will hold the screen until interrupted, then
  fall through to the "press any key" prompt — acceptable, but worth a one-line
  comment in the script so the behavior isn't surprising. (`scripts/menu.sh`)
- **API-reference freshness (decide the scope).** The dev container runs
  `vitepress dev` only — it does **not** run `npm run docs:api`, so the compact
  API reference shown is whatever is already in `packages/guide/api/*/index.md`.
  Regenerating it from the script is tempting but **depends on the
  dependency-ordered `dist` build of every package** (see the header comment in
  `packages/guide/scripts/gen-api.mjs`), which the dev workflow does not
  guarantee on the host. Recommended default: keep the script a pure launcher
  and leave API regeneration to `npm run docs:api` / the deploy CI; if freshness
  in dev is wanted, prefer an explicit opt-in (e.g. a `--api` flag) over
  silently running a step that can fail without the prebuilt dists.
- **Naming.** `serve-guide.sh` reads as a verb and sorts near the other guide
  concerns in `menu.sh`; `guide.sh` is a terser alternative. Pick one and keep
  it consistent with the `scripts/` naming the repo already uses.
- **Out of scope (possible follow-up).** `workloads/development` (the example
  demo on port 3000) also has no `scripts/` wrapper. A peer `serve-example.sh`
  would close the same ergonomic gap, but is a separate ticket.

## Final Report

Added `scripts/serve-guide.sh` as a **pure launcher** (the ticket's recommended
default): it `exec`s `docker compose -f workloads/guide/compose.yaml up --build`
after `cd`-ing to the repo root, matching the `scripts/build.sh` house style
(`#!/bin/sh -eu`, `REPO_ROOT=$(git rev-parse --show-toplevel)`). API regeneration
was deliberately left out — `npm run docs:api` depends on the dependency-ordered
`dist` build, which the dev workflow doesn't guarantee, so baking it in would add
a step that can fail silently. The script carries a comment noting it is a
long-running foreground server (Ctrl-C to stop, no success-banner tail) and that
the dev container does not refresh the API pages. `workloads/guide/README.md`'s
"Run it" section now leads with `bash scripts/serve-guide.sh`, keeping the raw
compose and plain-Docker forms as the documented equivalents.

Verified: `chmod +x` (perms match the sibling wrappers), `sh -n` parses,
`menu.sh`'s discovery loop lists it, and `docker compose … config` validates the
invocation. The server itself was not launched (foreground; would block).

### Discovered Insights

- **`menu.sh` runs scripts to completion**, so this foreground server holds the
  menu screen until Ctrl-C, then falls through to its "press any key" prompt —
  acceptable, and the script's header comment calls the behavior out.
- **Policy tension is real and was accepted by the user, not resolved.** This
  bespoke `scripts/*.sh` runs against `implementation/command-scripts` (which
  prescribes one canonical runner — npm/Makefile/Taskfile — over per-command
  shell scripts); an earlier revision of this ticket was dropped on exactly that
  ground (commit `3a24c8f`) before the user restored it (`49f3900`) and approved
  shipping it as-is. The conformant alternative (a named target in a canonical
  runner) remains available if the repo later consolidates its `scripts/`.
