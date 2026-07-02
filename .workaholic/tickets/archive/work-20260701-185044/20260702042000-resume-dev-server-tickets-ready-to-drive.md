---
created_at: 2026-07-02T04:20:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# RESUME: drive the two dev-server tickets (A→B); qmu theme done + guide live; plggmatic chain still blocked

## Position (verify first)

**Branch `work-20260701-185044`, HEAD `6a18fcb`, working tree clean.** This is a `/carry` checkpoint written mid-`/ticket` (the tickets are written + committed; the intended next step was `/drive`). Do NOT implement *this* ticket — it is a map. Verify the baseline, then act on the priority queue below.

Baseline checks: `git log --oneline -1` = `6a18fcb`; `git status` clean; `packages/plgg-press` → `npm run test` = **84 passed**, tsc clean; `packages/plggmatic` → **25 passed**, ≥90% coverage.

## What is DONE this session (committed, green)

- **211839 + 211840** — plgg-press re-skinned to qmu.co.jp: monochrome tokens/typography, callouts (info/note/emerald-tip), hover-invert links, badge code, 404; sidebar-first app shell (chrome rail, always-expanded sidebar, left prose, centred footer, left hero no-CTA, CSS-only mobile drawer). Archived.
- **20260702034500** — home page now carries the sidebar (articles reachable from `/`); a direct author fix after 211840 left the landing page nav-less. Archived (`e6e5afa`).
- **213410** — `plggmatic` framework scaffolded + generic seam extracted; additive, plgg-press untouched. Archived (`2c6839b`).
- Two infra fixes surfaced by a container restart writing dists onto the bind-mounted tree: **`bb41c15`** (latent `build.ts` `copyAssets` stage missing `| Defect`, from 211838's proc migration, masked by a stale dist) and **`cc0b65a`** (backed `plggmatic` out of `scripts/build.sh` — nothing consumes its dist yet and the guide container doesn't provision it). See [[project_bundle_dynamic_import]] memory + the two commits.

## PRIORITY QUEUE for the fresh `/drive`

**1 → 2 are the immediate work the author queued ("expand plgg-bundle and replace plgg-press with it"):**

1. **`20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md`** — expand `plgg-bundle` into a toolchain dev server with **true code hot-reload** via a from-scratch **module-runner** (watch source → invalidate transitive importers using a loader `?v=` version scheme → re-import the app's dev entry → SSE reload), serving over its **own `node:http`** with a standard `Fetch`. Hard constraints: `plgg-bundle` **stays plgg-free**, **zero new deps**, runs from source (so the `__require` blocker does NOT gate it). No dependency — drive first.
2. **`20260702041501-replace-plgg-press-dev-with-plgg-bundle.md`** (depends on 1) — guide/plgg-press consume `plgg-bundle dev`; **delete** plgg-press `dev.ts`/`dev.spec.ts` + `dev` command/export; **strip** plggmatic's `Dev/usecase/dev`; switch the guide dev-container command. Full gate: edit a theme `.ts` → guide refreshes in the browser with **no restart** within ~2s, content still reloads, **prod build byte-identical**, zero new deps.

**Settled decisions behind 1–2 (honor them):** dev/hot-reload is a **toolchain** concern (in `plgg-bundle`), NOT plgg-press (app) nor plggmatic (framework); mechanism is a **true module-runner** (author rejected process-restart as a workaround); the **full** quality gate applies. These came from an explicit author `AskUserQuestion` this session.

**Blocked chain (do NOT start until the prerequisite lands):**

3. **`20260702032000`** — fix `plgg-bundle`'s `__require` dynamic-import rewrite (native `import()` fallback in `externalFallback()`, `packages/plgg-bundle/src/domain/usecase/emitBundle.ts` ~line 113) — the prerequisite for 213411/213412. Shared-shim change: full `scripts/build.sh` rebuild + `scripts/check-all.sh` mandatory.
4. **`20260701213411`** — reimplement plgg-press on plggmatic (config/router/build rewire only; its **dev-loop portion is superseded** by tickets 1–2 — see the UPDATE note appended to it). Blocked on 3.
5. **`20260701213412`** — rename plgg-press → plggpress. Blocked on 4.

## Pending HUMAN (not code)

- **Visual sign-off** of the qmu theme (211839/211840 + the home sidebar) — Playwright light/dark, lg/mobile — is a human step the tickets reserved ("don't self-approve the visual match"). The guide builds and renders correctly (verified via a throwaway local dev server + screenshots this session).
- **The live guide (`plgg-guide.qmu.dev`) only refreshes on `docker restart guide_guide_1`** today — the running dev process caches theme code at startup and the agent is not permitted to restart that pre-existing container. **This is exactly what tickets 1–2 remove**: once landed, theme edits hot-reload with no restart.

## Considerations / gotchas (carried)

- **Shared-dist hazard**: the guide dev container bind-mounts the repo and its entrypoint runs `scripts/build.sh`, writing dists onto the host tree — a restart can overwrite host `.d.ts` and, if any package's declaration emit `DtsError`s, break host `tsc`. `bb41c15` fixed the one that bit us; keep `plgg-bundle` out of `build.sh` until a consumer needs its dist ([[project_bundler_flake_atomic_publish]], [[project_bundle_dynamic_import]]).
- **Shell aliases** in the Bash tool break `>` (noclobber) and alias `diff`→editor — use `command diff` / `>|` when re-verifying the byte-identical guide diff ([[reference_shell_interactive_aliases]]).
- **Ticket-first** discipline holds ([[feedback_ticket_first_workflow]]): tickets 1–2 exist; `/drive` implements.
