---
created_at: 2026-07-14T02:19:40+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Config, Infrastructure]
effort: 4h
commit_hash: 19ba477d
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 5: central configuration generation — the agent maintains the site's config as typed data

## Overview

Fifth PoC of mission `plggpress-technical-confidence-poc-portal`, and the sixth
of the eight mission-acceptance boxes (the `poc5` record already exists in the
portal data as `planned`). It answers the mission's **central-configuration
generation** technical question, verbatim from `packages/plgg-poc-portal/src/pocs.ts`:

> **Question:** Can the writer's agent maintain the site's central
> configuration — front-matter tag classification (name/color/emoji/description),
> path exclusions, layout and sizing themes — as generated data?
>
> **Confidence signal:** Asking the agent to reclassify tags, exclude a path,
> and switch among prefixed sizing themes produces a valid configuration the
> site renders, with ~5–10 sizing themes expressible.

This is the natural next step on the PoC 4b spine: PoC 4b proved the agent can
land a granular `edit_doc` find/replace **on the live preview** without a reload
while the same session keeps talking. PoC 5 aims the same agent-tool-call → server
→ live-preview loop at a **different write target**: instead of editing document
*content*, the agent's tool calls maintain a single **typed central configuration**
(tag registry, path exclusions, active layout + sizing theme), and the preview
re-renders to reflect it — recolored/badged tags, a now-hidden excluded path, a
resized/re-themed layout — with no full-page reload.

**Overnight scope (decided at ticket time).** This PoC is built by an unattended
`/drive`; there is no human at a microphone. So:

- The confidence signal MUST be fully exercisable by **typed** commands to the
  agent — "reclassify the `async` tag to name 'Async', color the info hue, emoji
  ⏳", "exclude `content/contributing/**`", "switch to the `spacious` sizing
  theme" — each a deterministic tool call that a morning judge (and a headless
  smoke) can replay. Live voice over the Realtime API stays wired as a **bonus**
  when `OPENAI_API_KEY` is present, exactly as poc4b does ("voice or typed").
- `/drive` builds the package to **offline-green** (strict `tsc --noEmit` with
  zero `as`/`any`/`ts-ignore`, plus a `plgg-test` smoke suite over the pure core)
  **and serves it live** at `plgg-poc5.qmu.dev`, then **stops**. It leaves the
  `poc5` record `status: "building"`, `verdict: none()`. The morning live-judgment
  is a **separate concluding-verdict ticket** (the poc2/poc3/poc4b pattern) — do
  NOT self-judge or flip the verdict from headless evidence.

## Policies

The implementing session MUST read each linked policy hard copy before writing
code and keep every change defensible against its Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:planning` / `policies/proactive-poc.md` — a PoC is a minimum
  build-out answering ONE verification question, built to discard; keep the
  config model and the demo thin, no production coupling.
- `workaholic:planning` / `policies/ux-research-prototype.md` — the served page
  is the touchable surface; the confidence signal is judged by hand on it.
- `workaholic:design` / `policies/modeless-design.md` — no hidden modes; any
  selection/preview state the page carries lives in the URL, like the portal.
- `workaholic:design` / `policies/self-explanatory-ui.md` — design the four
  states (loading / empty-config / error / applied); an unset config is an
  honest "defaults" view, not a blank.
- `workaholic:implementation` / `policies/coding-standards.md` — house
  type-driven style (Option/Result, exhaustive `match`, no escape hatches,
  Prettier printWidth 50) applies to PoC code; the config union is closed and
  rendered exhaustively.
- `workaholic:implementation` / `policies/directory-structure.md` — new
  one-directory package under `packages/`; the workload compose lives under
  `workloads/`; node built-ins confined to `src/entrypoints/` (vendor-boundary
  gate).
- `workaholic:implementation` / `policies/command-scripts.md` — no bespoke serve
  script; `scripts/serve-poc.sh poc5-config` is the only runner.
- `workaholic:operation` / `policies/ci-cd.md` — wire the package into the
  consolidated local gates (README index, build order, its test entry) so
  `check-all` stays the source of truth; a private PoC is exempt from the >90%
  coverage threshold but must typecheck + smoke.

## Key Files

- `packages/plgg-poc4b-coedit/` — **the spine to copy.** The single-process
  serve shell that renders + client-patches a live preview with NO reload, the
  agent tool-call loop, the typed+voice agent surface. PoC 5 reuses this shape,
  swapping the write target from doc content to a config object.
  - `packages/plgg-poc4b-coedit/src/agent.ts` — the agent + tool-call wiring
    (poc5 replaces `edit_doc` with config tools: `set_tag`, `exclude_path`,
    `set_sizing_theme`, `set_layout`).
  - `packages/plgg-poc4b-coedit/src/edit.ts`, `src/editPath.ts` — the pure
    applier/locator pattern to mirror: a pure function from (config, op) → config.
  - `packages/plgg-poc4b-coedit/src/view.ts`, `src/effects.ts` — the plgg-view
    live-patch + WAAPI transition seam the preview re-render reuses.
  - `packages/plgg-poc4b-coedit/src/entrypoints/serve.ts` — the single-process
    server (renders, patches, mints the Realtime session behind `/api/session`).
  - `packages/plgg-poc4b-coedit/src/vendors/realtime.ts` — the confined Realtime
    client seam (bonus voice path).
  - `packages/plgg-poc4b-coedit/package.json` — the leaf-app package shape
    (`private: true`, `type: module`, build = plgg-bundle, test = `tsc --noEmit
    && plgg-test src`, `seed-content` entry).
  - `workloads/poc4b-coedit/compose.yaml` — the single-process node:22-slim
    workload recipe (host port → 5173, host-built artifacts, `.env`-sourced key).
- `packages/plgg-poc-portal/src/pocs.ts` — the `poc5` record (already `planned`,
  port **5188**, `plgg-poc5.qmu.dev`); its final-step edit flips `status`
  `planned`→`building` when this ticket serves (verdict stays `none()`).
- `scripts/serve-poc.sh` — the canonical detached runner; `serve-poc.sh
  poc5-config` starts the workload.
- `scripts/check-all.sh`, `scripts/gate-readme.sh`, `scripts/gate-vendor-boundary.sh`,
  `scripts/gate-guide-deps.sh` — the gates the new package wires into (or is
  consistently excluded from, for the guide-container lists).
- `~/.cloudflared/config.yml` — tunnel `qmu-dev` ingress; the `plgg-poc5.qmu.dev
  → http://localhost:5188` route is **developer-applied** (system config).

## Related History

- [.workaholic/tickets/archive/work-20260713-215845/](.workaholic/tickets/archive/) — PoC 4b: the live-co-editing preview + granular ops spine this PoC extends (retired iframe, single-process shell, client-patched preview).
- [20260713193614-poc4b-live-coediting-preview.md](.workaholic/tickets/archive/) — the poc4b build ticket: the applier/span-locator/diff-builder pure-core pattern and the WAAPI transition seam to mirror.
- [20260711035317-plggpress-poc-portal-and-plan.md](.workaholic/tickets/archive/work-20260711-035119/20260711035317-plggpress-poc-portal-and-plan.md) — the PoC plan + port/hostname map + the `pocs.ts` record contract (each concluding ticket edits exactly its own entry).
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the central-configuration vision: front-matter tag classification with name/color/emoji/description, path exclusions, and the ~5–7-color minimal design system with prefixed sizing themes.

## Implementation Steps

1. Scaffold `packages/plgg-poc5-config` by copying the poc4b-coedit shape
   (`private: true`, `type: module`, build = plgg-bundle, test = `tsc --noEmit
   && plgg-test src`, `.prettierrc.json` printWidth 50, `tsconfig.json` with
   `rootDir: src`). Seed a small `content/` corpus copy (reuse the poc4b guide
   subset via a `seed-content` entry so the container auto-seeds on first run).
2. Model the central configuration as **typed data** (`src/config.ts`):
   `Config = { tags: ReadonlyArray<TagDef>, exclusions: ReadonlyArray<PathGlob>,
   layout: Layout, sizingTheme: SizingTheme }` where `TagDef = { slug, name,
   color, emoji, description }`, `SizingTheme` is a **closed union of ~5–10
   prefixed themes** (e.g. `compact | cozy | spacious | ...`) rendered with
   exhaustive `match`, and `color` draws from the roadmap's minimal 5–7-color
   scheme. All parsing via casters (Option/Result); no `as`.
3. Write the **pure config-apply core** (`src/apply.ts`, mirror poc4b's
   `edit.ts`): a total function `(config, ConfigOp) → Result<Config>` for each
   op — `SetTag`, `ExcludePath`, `SetSizingTheme`, `SetLayout` — so a tool call
   is one addressable, testable transition. Invalid ops return a typed error,
   not a throw.
4. Wire the **agent tool-call loop** (`src/agent.ts`, from poc4b): expose the
   four config ops as agent tools; a **typed** command box is the primary surface
   (deterministic, replayable), the Realtime voice path the bonus when the key is
   present. The server applies the op to the config and pushes the new config to
   the client.
5. Render the **live preview** (`src/view.ts`) so applying a config visibly
   re-renders WITHOUT a full-page reload: tag badges recolor/re-emoji, an excluded
   path drops from the nav/index, a sizing-theme switch resizes the layout, a
   layout switch reflows — reuse poc4b's plgg-view patch + transition seam.
   Design the loading/empty/error/applied states.
6. Single-process serve entry (`src/entrypoints/serve.ts`, node built-ins only)
   that renders the shell, patches the preview, and mints the Realtime session
   behind `/api/session` (honest 404 without the key). Add
   `workloads/poc5-config/compose.yaml` (single-process node:22-slim, host **5188**
   → container 5173, `../..` bind-mount, `${OPENAI_API_KEY:-}`), copied from
   `workloads/poc4b-coedit/compose.yaml`.
7. `serve-poc.sh poc5-config` starts it detached (no new script). Wire the package
   into the repo gates: README package index (gate-readme), `scripts/build.sh`
   order, a test entry reachable from check-all, and the guide-container exclusion
   lists (gate-guide-deps) consistent with the other PoC packages.
8. Prepare the developer-applied cloudflared ingress lines in the package README
   (`plgg-poc5.qmu.dev → http://localhost:5188`, plus DNS route if needed) — do
   NOT edit `~/.cloudflared/config.yml` (system-safety).
9. **Final data edit:** flip the `poc5` record in `packages/plgg-poc-portal/src/pocs.ts`
   from `status: "planned"` to `status: "building"` (verdict stays `none()` —
   the concluding verdict is a separate morning ticket). Keep `pocConsistent` and
   the portal specs green.
10. Serve live and stop for morning judging: build (`npm run build`), seed, start
    the container, confirm `curl -s http://localhost:5188/` returns the shell and
    a typed op round-trips (config changes render). Leave it serving at
    `plgg-poc5.qmu.dev` for the developer's live judgment.

## Quality Gate

Captured from the developer at ticket time (2026-07-14). PoC packages meet
**typecheck + smoke**, not the >90% coverage gate; the "proven" verdict comes
from **live judgment via the qmu.dev URL** — and because this runs unattended
overnight, the drive stops at *served-and-ready*, not *judged*.

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-poc5-config` typechecks strictly (`scripts/tsc-plgg.sh` /
  package `tsc --noEmit` green); **zero `as` / `any` / `ts-ignore`**.
- A `plgg-test` smoke suite covers the pure core: the `Config` model validates,
  the `SizingTheme` union renders exhaustively (~5–10 themes), and every
  `ConfigOp` apply transition is proven (valid op → new config; invalid op → typed
  error). Verdict rendering / empty-config state handled.
- The confidence signal is **typed-replayable**: a documented typed command
  reclassifies a tag (name/color/emoji/description), a typed command excludes a
  path, and a typed command switches the sizing theme — each visibly re-renders
  the preview with **no full-page reload**. Voice works as a bonus when the key
  is present.
- The package is `private: true`, excluded from the >90% coverage threshold,
  introduces **zero third-party runtime deps**, and confines node built-ins to
  `src/entrypoints/` (vendor-boundary gate green).
- `workloads/poc5-config/compose.yaml` serves on host **5188**; `scripts/serve-poc.sh
  poc5-config` starts it detached; the `poc5` `pocs.ts` record is `building`,
  verdict `none()`, and `pocConsistent` + the portal specs stay green.
- Fresh `check-all` passes with the new package wired in.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` and the package `plgg-test src` smoke suite are green.
- `scripts/check-all.sh` green with the package included (run scheduled around
  any live preview per house rule).
- After `serve-poc.sh poc5-config`: `curl -s http://localhost:5188/` returns the
  shell; a headless smoke drives the typed config ops and asserts the config
  changes (the deterministic replay of the morning demo).

**Gate** — what must pass before "proven":

- All the above green **and** the package is serving at `plgg-poc5.qmu.dev`,
  ready for the developer to open it in the morning and confirm live: a typed
  request reclassifies a tag, excludes a path, and switches among the prefixed
  sizing themes, each re-rendering in place. That live judgment is recorded by a
  **separate concluding-verdict ticket** that flips `poc5` to a concluded status
  — NOT by this ticket or the overnight drive.

## Considerations

- **Do not self-judge overnight.** The verdict flip needs the developer's live
  judgment (poc2/poc3/poc4b pattern); the drive leaves `poc5` `building` /
  `none()`. Self-flipping from headless evidence was explicitly declined.
- **The `~/.cloudflared/config.yml` route is developer-applied** — prepare the
  exact ingress lines in the README, never edit the host tunnel (system-safety;
  it also serves unrelated production hostnames).
- **Sacrificial by design** (proactive-poc): keep the config model and preview
  free of production plggpress coupling — this is proving *feasibility of
  agent-maintained config*, not building the production config system.
- **Keep the `pocs.ts` record edit a one-liner** (status only) — the record shape
  is the mission's durable acceptance data; don't reshape it.
- **Container churn watch** (standing concern): the guide-container recipe rewrites
  a sibling `package-lock.json` on some runs; if it appears, `git restore` it —
  it is not this PoC's work.
- **Corpus reuse:** seed the same guide subset poc4b uses so tag classification
  has real front-matter to operate on; `content/` stays git-ignored and
  auto-seeded (don't commit the corpus copy).

## Final Report

Built autonomously as part of the overnight `/drive` batch (2026-07-14), stopped
at **served-and-ready** per the agreed gate: `poc5` stays `building` / `none()`
in `pocs.ts` for the morning live-judgment (a separate concluding-verdict
ticket flips it — NOT this drive).

Delivered `packages/plgg-poc5-config` on the PoC 4b spine, with two deliberate
design decisions against the ticket sketch, both to serve the overnight/headless
gate:

- **The typed path is a deterministic, model-free command parser**
  (`src/command.ts`), not a model round-trip. PoC 4b's typed path still ran every
  turn through the live model, so it was not replayable without a key. Here a
  one-line command (`tag <slug> …`, `exclude <glob>`, `theme sz-…`, `layout …`)
  parses to exactly one `ConfigOp` applied by the one total `applyOp`
  (`src/apply.ts`); the clickable theme/layout switches emit the same ops; the
  Realtime voice session (`src/agent.ts` + `src/vendors/realtime.ts`) is a bonus
  that calls the same five tools. So the confidence-signal loop is proven offline
  by the reducer specs (the "headless smoke drives the typed path" the gate
  asks) and voice just adds a second way in.
- **The configuration is client state the sample site renders live** — no disk
  write seam (a sacrificial-PoC bound). The durable-core question (agent
  maintains config AS TYPED DATA the site renders) is answered by the typed
  model + the two write paths funnelling through `applyOp`; the sample-site pane
  re-renders in place — recolored tag chips, hidden exclusions, a re-laid-out /
  re-sized grid — with no reload.

Verification against the Quality Gate: `tsc --noEmit` EXIT 0 with **zero
`as`/`any`/`ts-ignore**` (the one place a cast was reached for — the string→union
guards — was rewritten as a user-defined type predicate `oneOf`); **46 offline
specs green** covering config model + catalogs, the applier and its typed
errors, the command parser, page derivation + glob exclusion, the event decoder
+ tool decoding, the wire casters, and the TEA reducer; **coverage gate passed**
(statements 98.9%, branches 95.9%, functions 97.7%, lines 98.9% — every pure
module 96–100%). `gate-readme`, `gate-vendor-boundary` (node:* confined to
`entrypoints/`, browser to `vendors/` — no exemption needed), and the portal
invariant specs (`poc5` = building) all green. `dist/main.js` built (234 KB);
`npm run seed-content` seeded 38 markdown files; the host serve answered 200 on
`/`, listed 38 pages at `/index/pages.json`, an honest 404 at `/api/session`
without a key. The containerized workload (`scripts/serve-poc.sh poc5-config`,
`workloads/poc5-config/compose.yaml`, node:22-slim, no image build) answered
**200 on host 5188** with `configured:true` (the root-`.env` key reached it, so
the voice bonus is live). The full fresh `check-all.sh` runs once at the end of
this night batch. The `~/.cloudflared/config.yml` ingress lines for
`plgg-poc5.qmu.dev → :5188` are prepared in the package README for the developer
to apply (system config is never agent-edited); `https://plgg-poc5.qmu.dev`
review is the morning gate.
