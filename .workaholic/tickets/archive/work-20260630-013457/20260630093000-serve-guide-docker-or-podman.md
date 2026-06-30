---
created_at: 2026-06-30T09:30:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure, Config]
effort: 0.25h
commit_hash: 70d2b6e
category: Changed
depends_on:
---

# serve-guide.sh: detect docker-or-podman compose engine (works non-interactively under podman)

## Overview

Discovered while verifying the guide dev container on the host: `scripts/serve-guide.sh` runs `exec docker compose …`, but on this host `docker` is a zprofile alias to `podman` that is INTERACTIVE-ONLY — it does not resolve in a non-interactive `#!/bin/sh -eu` script, so `serve-guide.sh` fails with `docker: command not found`. The guide dev container itself works correctly under `podman compose` (verified: build siblings post-mount, `plgg-press dev` on :5181, nav + live-reload + allowedHosts 403). Only the launcher script assumes a literal `docker` binary.

Fix: make `serve-guide.sh` resolve a real compose engine — prefer `docker` if a real binary exists, else `podman` — so it runs on both CI/docker hosts and this podman host without relying on an interactive alias.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the fix stays in scripts/serve-guide.sh
- `workaholic:implementation` / `policies/coding-standards.md` — POSIX sh, sh -eu conventions, no bashisms
- `workaholic:implementation` / `policies/command-scripts.md` — the canonical serve runner must work in the actual host environment
- `workaholic:operation` / `policies/ci-cd.md` — the local serve path is part of the guide delivery story; it must be engine-portable

## Key Files

- `/home/ec2-user/projects/plgg/scripts/serve-guide.sh` - replace `exec docker compose …` with a detected `$COMPOSE` (docker-or-podman)
- `/home/ec2-user/projects/plgg/workloads/guide/README.md` - note that either docker or podman works (the script auto-detects)

## Implementation Steps

1. In serve-guide.sh, before the exec, detect the engine: `command -v docker` (a real binary) -> `docker compose`; else `command -v podman` -> `podman compose`; else error out with a clear message. Then `exec $COMPOSE -f workloads/guide/compose.yaml up --build`.
2. Keep POSIX sh (the file is `#!/bin/sh -eu`); add a short comment explaining the interactive-alias pitfall.
3. Optionally note in workloads/guide/README.md that the script works with docker OR podman.

## Considerations

- The zprofile `docker`->`podman` alias is interactive-only; scripts must resolve a real binary. Prefer docker when present (CI runners) so behavior is unchanged there; fall back to podman locally.
- The compose file itself is engine-agnostic (verified `podman compose … config` parses and `up --build` serves the guide).
- Do not launch the long-running foreground server in verification; confirm the engine resolves to `podman compose` here and that `$COMPOSE … config` parses (the container is already proven up).

## Final Report

Development completed as planned. serve-guide.sh now detects a real compose engine (prefer docker, else podman) before exec, instead of assuming a literal `docker` binary that the interactive-only zprofile alias does not provide to scripts. README notes either engine works. Verified on the host: detection resolves to `podman compose`; `podman compose -f workloads/guide/compose.yaml config` exits 0; `podman compose ... up --build` actually serves the guide (container guide_guide_1 up, curl localhost:5181 -> HTTP 200, nav + live-reload + allowedHosts 403); sh -n syntax OK.

### Discovered Insights

- **Insight**: A `docker`->`podman` zprofile alias is interactive-only and absent in `#!/bin/sh -eu` scripts, so `serve-guide.sh`'s `exec docker compose` would fail with command-not-found on this host. The fix prefers a real `docker` binary (CI/docker hosts unchanged) and falls back to `podman compose` locally. The compose file itself is engine-agnostic (podman compose config/up both work).
  **Context**: Any repo script invoking `docker` must resolve a real binary, never rely on the interactive alias; this is the local serve/dev path (deploy uses GitHub Actions docker runners, unaffected).
