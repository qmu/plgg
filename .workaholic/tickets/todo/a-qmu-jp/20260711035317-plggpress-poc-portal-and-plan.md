---
created_at: 2026-07-11T03:53:17+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC portal: the plggpress confidence-collection index app + port/hostname map

## Overview

First ticket of mission `plggpress-technical-confidence-poc-portal`. plggpress is heading toward SSG + Browser RAG (embedded reader agent, writer voice assistant, central configuration generation, non-tree classification), and each open technical question gets its own small PoC app, developed on its own local port and exposed at its own `*.qmu.dev` hostname through the existing cloudflared tunnel (`qmu-dev`). This ticket builds the **PoC portal** — the index app that makes the fleet reviewable in one place — and records the **PoC plan** and the **port/hostname allocation map**, satisfying mission acceptance items 1–2.

The portal is a small static browser app (scaffolded like `packages/example`) whose content is **typed data**: one record per PoC carrying its name, the technical question it answers, the confidence signal (what observation counts as "proven"), its status/verdict (`planned | building | proven | disproven | needs-another-round`), and its `*.qmu.dev` link. PoC verdicts land in this data as later PoCs conclude — the portal is the durable map from open question → running proof → verdict.

**Port/hostname map** (5183–5190 is a clean unused block adjacent to the plgg guides; 5173/5181/5182/5191–5196 are taken):

| Hostname | Port | App |
|---|---|---|
| `plgg-poc.qmu.dev` | 5183 | this portal |
| `plgg-poc1.qmu.dev` | 5184 | PoC 1 — browser search core (next ticket) |
| (reserved) | 5185–5190 | PoC 2–7 (reader agent, voice assistant, agent file-editing + hot reload, central config generation, non-tree classification) |

**PoC plan** (recorded on the portal as its initial data): 1. browser search core — indexed FTS vs browser vector-DB RAG on the plgg guide corpus; 2. reader-side embedded browser agent on a generated static site; 3. writer-side voice assistant over the OpenAI Realtime API; 4. browser-agent tool-calling that edits local files via the dev server with hot reload keeping the websocket; 5. central configuration generation by the agent; 6. non-tree classification / multi-dimensional search UX. Each entry states its question and confidence signal per the mission's Acceptance section.

## Policies

The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — the portal is a new one-directory package under `packages/`; workload compose lives under `workloads/`
- `workaholic:implementation` / `policies/coding-standards.md` — house type-driven style (no `as`/`any`/`ts-ignore`, Option/Result, exhaustive `match`, printWidth 50) applies to PoC code too
- `workaholic:planning` / `policies/proactive-poc.md` — PoCs are minimum build-outs answering a verification question, built to discard; the portal is deliberately thin
- `workaholic:planning` / `policies/ux-research-prototype.md` — the portal is the touchable surface making each prototype reachable for hands-on verification
- `workaholic:design` / `policies/modeless-design.md` — portal state (selected PoC, any filter) lives in the URL; no modes
- `workaholic:design` / `policies/self-explanatory-ui.md` — design the four states; an empty verdict is an honest "not yet run", not a blank
- `workaholic:implementation` / `policies/command-scripts.md` — one canonical serve runner for the PoC fleet (`scripts/serve-poc.sh <name>` style), not one bespoke script per PoC
- `workaholic:operation` / `policies/ci-cd.md` — the new package wires into the consolidated local gates (README index, build order, its test entry) so check-all stays the source of truth

## Key Files

- `packages/example/bundle.config.ts` - the canonical `target: "app"` browser-bundle config the portal copies
- `packages/example/src/main.ts` - CSR entry mounting a plgg-view `application` onto `#root`; the portal's UI template
- `packages/example/src/build.ts` - static-HTML generation via plgg-server `generateStatic`; the portal can be fully static
- `packages/example/package.json` - leaf-app package shape: `build` = plgg-bundle, `test` = `tsc --noEmit && plgg-test src`
- `workloads/guide/compose.yaml` - the per-workload compose precedent (host port → container 5173) behind the cloudflared tunnel
- `scripts/serve-guide.sh` - the detached serve pattern; generalize rather than clone per PoC (command-scripts policy)
- `scripts/check-all.sh`, `scripts/gate-readme.sh`, `scripts/gate-guide-deps.sh` - the gates a new package must be wired into (or explicitly scoped out of, for the guide-container lists)
- `~/.cloudflared/config.yml` - tunnel `qmu-dev` ingress map (`*.qmu.dev` → local ports); **developer-applied** change, outside the repo

## Related History

The plggpress family already carries a completed server-side roadmap (dual-mode topology, served instance behind cloudflared) whose serving precedent this ticket reuses; the browser-side + benchmark framing is new.

- [20260704143028-production-topology-and-operations.md](.workaholic/tickets/archive/work-20260704-130317/20260704143028-production-topology-and-operations.md) - canonical serving/hosting precedent: `workloads/<name>/` compose behind the existing cloudflared tunnel (same pattern)
- [20260619063054-guide-host-port-5181.md](.workaholic/tickets/archive/work-20260617-214017/20260619063054-guide-host-port-5181.md) - concrete port-allocation precedent; documents the tunnel config and the 5173 collision to avoid
- [20260709110456-split-plggpress-ssg-and-plgg-cms.md](.workaholic/tickets/archive/work-20260706-120449/20260709110456-split-plggpress-ssg-and-plgg-cms.md) - the current package reality: plggpress = SSG, plgg-cms = dynamic CMS (which package later integration targets)

## Implementation Steps

1. Scaffold `packages/plgg-poc-portal` (private) from `packages/example`: `package.json` (`private: true`, build = plgg-bundle `target:"app"`, test = `tsc --noEmit && plgg-test src`), `bundle.config.ts`, `tsconfig.json` with `rootDir: src`, no `type: module` (per new-package scaffold gotchas).
2. Model the PoC record as typed data (`src/pocs.ts`): `Poc = { id, name, question, confidenceSignal, status, verdict: Option<Verdict>, url }` with the six planned PoCs as initial entries (PoC 1 `building`, others `planned`), statuses as a closed union rendered with exhaustive `match`.
3. Build the portal view with plgg-view: a list/table of PoC cards showing question, confidence signal, status badge, verdict (or honest "not yet run"), and the `plgg-pocN.qmu.dev` link; any selection/filter state reflected in the URL. Design loading/empty/error/success states.
4. Emit the static site (build.ts + client bundle) into `dist/`; add `workloads/poc-portal/compose.yaml` mapping host **5183** → container 5173 following `workloads/guide/compose.yaml`.
5. Add a single generic `scripts/serve-poc.sh <workload>` runner (detached, serve-guide.sh style) rather than per-PoC scripts; `serve-poc.sh poc-portal` starts the portal.
6. Wire the package into the repo gates: README package index (gate-readme), `scripts/build.sh` order and a test entry reachable from check-all; decide and record whether PoC packages join the guide container's three provisioning lists (they should not need to — record the exclusion where gate-guide-deps expects it).
7. Ask the developer to apply the tunnel change (`~/.cloudflared/config.yml` ingress: `plgg-poc.qmu.dev` → `http://localhost:5183`, plus DNS route if needed) — system config stays developer-applied; record the applied map in the portal README.
8. Verify live: portal reachable at `https://plgg-poc.qmu.dev`, all six planned PoCs listed with question + confidence signal, PoC 1 linking to `plgg-poc1.qmu.dev` (may 404 until the next ticket ships).

## Quality Gate

Captured from the developer at ticket time (2026-07-11): PoC packages meet **typecheck + smoke**, not the full >90% coverage gate; approval happens **via the qmu.dev URLs**.

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-poc-portal` typechecks strictly (`scripts/tsc-plgg.sh` green, or the package's `tsc --noEmit`); zero `as`/`any`/`ts-ignore`.
- A smoke spec (plgg-test) covers the portal's pure core: PoC record data validates, status union renders exhaustively, verdict rendering handles `none`.
- The portal is `private: true`, excluded from the >90% coverage threshold enforcement, and introduces zero third-party runtime deps.
- The six planned PoCs render with name, question, confidence signal, status, and link; state (selection/filter) is URL-held.
- `workloads/poc-portal/compose.yaml` serves on host port 5183; `scripts/serve-poc.sh poc-portal` starts it detached.
- check-all passes with the new package wired in (README gate, build order, test entry).

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` and the package's `plgg-test src` smoke suite are green.
- `scripts/check-all.sh` green with the package included (run scheduled around any live preview per house rule).
- `curl -s http://localhost:5183/` returns the portal HTML after `serve-poc.sh poc-portal`.

**Gate** — what must pass before approval:

- All of the above green, plus the developer opens `https://plgg-poc.qmu.dev` in a browser and confirms: the PoC list renders with questions/signals/verdict slots, and the PoC 1 link points at `plgg-poc1.qmu.dev`. The cloudflared exposure is part of the gate.

## Considerations

- The `~/.cloudflared/config.yml` edit is host/system configuration: the agent prepares the exact ingress lines but the developer applies them (workaholic system-safety; also the tunnel serves unrelated production hostnames).
- Do not add per-PoC serve scripts as the fleet grows — `serve-poc.sh <workload>` is the single canonical runner (command-scripts policy; `scripts/serve-guide.sh` predates it and may stay as-is).
- The portal's verdict data is the durable record mission acceptance reads; later PoC tickets update `src/pocs.ts` as their final step — keep the record shape stable and total so those edits are one-line data changes (`packages/plgg-poc-portal/src/pocs.ts`).
- PoC packages are sacrificial by design (proactive-poc policy): keep the portal free of production coupling so discarding or promoting a PoC never ripples (`packages/plgg-poc-portal/`).
- gate-guide-deps reconciles three hand-maintained guide-container lists; a PoC package that isn't a guide dependency must be excluded consistently or the gate goes red on the next fresh check-all (`scripts/gate-guide-deps.sh`).
