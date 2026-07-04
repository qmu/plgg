---
created_at: 2026-07-04T22:56:13+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: []
---

# CARRY CHECKPOINT — roadmap /drive: tickets 05–06 done; resume at ticket 07

## Overview

Carry checkpoint, **not** implementation work. A `/drive` session on branch
`work-20260704-130317` implemented roadmap tickets **05** (plggmatic non-color
design tokens) and **06** (plgg-view Cmd/Sub effects); a fresh session should
read this, then continue the `/drive` from **ticket 07**. Source of truth for
the whole plan: `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`
(decisions D1–D18, per-phase gates, coordination notes). The prior checkpoint
(tickets 01–04) was archived at `0f5d690`.

**Done & committed this session:**

| Ticket | Feat commit | Archive commit | What |
|---|---|---|---|
| 05 plggmatic-non-color-design-tokens | `8949b37` | `0f5d690` | typography scale, breakpoints (TS constants), shell metrics (`--pm-*`), z-index bands, reduced-motion; hover derivation decision; migrated heading/prose/button/example; site design-tokens page (D3) |
| 06 plgg-view-cmd-sub-effects | `c00e29a` | `4904dfe` | `Cmd`/`Sub` as pure data + effects engine (injectable `SubEnv`); breaking `update: (msg,model)=>[Model,Cmd]`, optional `subscriptions`; ALL consumers migrated; toast auto-dismiss demo (D2) |

Working tree is clean. A fresh `scripts/check-all.sh` was **EXIT 0** at `c00e29a`
(0 test failures, plgg-view coverage gate passed 98.70/91.51/95.71/98.70 all
>89; SSR untouched). Ticket 06's toast auto-dismiss was additionally verified in
a real browser (toast rendered, then the runtime's `cmdEffect` removed it after
4s). Both tickets carry a full `## Final Report` in their archived files.

## Policies

- `workaholic:implementation` / `objective-documentation` — every claim here is
  verifiable against the named commits and the git tree.
- `workaholic:implementation` / `operational-planning` — a recovery checkpoint
  so a fresh session resumes the exact priority without this conversation.

## Key Files

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the plan. Read first.
- `.workaholic/tickets/todo/a-qmu-jp/` — 25 remaining roadmap tickets (07–31)
  + 3 vendor-boundary side-track tickets (`185201`/`185202`/`185203`, committed
  in `94b9620`) + this checkpoint = 29 files.
- `.workaholic/tickets/archive/work-20260704-130317/` — tickets 01–06 archived,
  each with a `## Final Report`.

## Related History

- Tickets 05/06 Final Reports carry the design rationale, per-ticket
  verification, and discovered insights (e.g. `Sub<Msg>` invariance forcing
  explicit `<Msg>` at empty/`none()`-returning call sites; the `SubEnv`
  injection seam mirroring the renderer's `Play`).

## Implementation Steps

1. Read the roadmap spec, then `git log --oneline -8` to see the four landed
   commits (two feat + two housekeeping).
2. Run `/drive`. Next drivable roots (deps satisfied): **07**
   (plggpress theme on plggmatic — deps 03✓/04✓/05✓ all archived), plus **31**
   (durable-core spine, gates 09/16/17/18), **14** (plggpress serve-mode),
   **15** (plgg-sql FTS5), and the **vendor-boundary side-track** (`185201`
   root). D3 sequencing favors the design-system track: **07 → 08** land the
   theme-first demo before the heavier data/domain tickets.
3. Honor the verification discipline below.

## Quality Gate

**Acceptance criteria**
- A fresh session resumes from this file + the spec with no dependence on the
  prior conversation.
- The remaining tickets stay valid (8 frontmatter fields, bare `depends_on`,
  edges resolve, graph acyclic).

**Verification method**
- `ls .workaholic/tickets/todo/a-qmu-jp/*.md | wc -l` → 29 (25 roadmap 07–31 +
  3 vendor + this checkpoint).
- **Read the `"N passed, M failed"` line AND the process exit code from a
  FOREGROUND run** — see the discipline below.

**Gate**
- Capture-only; the gate is simply that `/drive` finds the priority and the
  tickets are intact. No build/commit/archive is part of /carry.

## Considerations

- **Ticket 07 is session-sized, release-touching, and visually gated** — budget
  for it as its own session:
  - **Release-affecting build change:** adds `plggmatic` as a plggpress dep and
    **reorders `scripts/build.sh` + `scripts/npm-install.sh`** so plggmatic
    builds before plggpress. `publish-npm.sh` sed-derives the npm publish order
    from build.sh's `cd`-lines, so keep the exact
    `cd $REPO_ROOT/packages/<name> && npm run build` line format byte-exact and
    re-read the derived order once. Also update the guide container provisioning
    (`workloads/guide/dev-entrypoint.sh` + `compose.yaml`) or
    `scripts/gate-guide-deps.sh` fails (which is the point).
  - **Full theme cutover (D16):** port the ~600-line
    `packages/plggpress/src/theme/baseCss.ts` and the components
    (`shell`/`navBar`/`callout`/`page`/`sidebarTree`/`notFound`) onto plggmatic
    tokens/components, delete `themeScript.ts` (use ticket 04's appearance
    contract at the two injection call sites: `router/pressRouter.ts` ~176,
    `Press/usecase/appSpecs.ts` ~42), and clean-cut every `--vp-*` → `--pm-*`
    with **zero** remnants in source AND built `dist/`. Callouts move onto the
    D9 `success`/`warning`/`danger` role tokens (drop the hardcoded Tailwind
    hexes). Compose plggmatic's `schemeCss` + `metricCss` + `reducedMotionCss`
    into `shell.ts`'s escaped `<style>` node. `vp-appearance` key preserved
    verbatim via `appearanceStorageKey` (never re-typed). `vp-*` CLASS names may
    stay (only custom PROPERTIES cut over).
  - **Escape-safety** must be spec-asserted on the fully composed sheet (no `<`,
    `>`, `&`; no child `>` combinators).
  - **Mandatory pre-merge Playwright visual-regression gate** (no preview env):
    build main's baseline + this branch, serve both, screenshot-compare guide
    AND site across desktop+mobile × light+dark, enumerating every intentional
    diff (ticket 03's dark-ink alpha-flattening is the named revisit point).
    This can't land partially — the greps + visual gate need the complete
    cutover.
- **VERIFICATION DISCIPLINE (carried from the whole drive):**
  - The authoritative signals are the `"N passed, M failed"` line and the
    process **exit code** / the `sh -eu` "All shell scripts…" success trailer
    from a FOREGROUND run — NOT the orthogonal `"Coverage gate passed"` line.
  - This zsh shell has **`noclobber`**: `cmd > existing.log` fails silently →
    stale log. Use `>|` or a fresh filename.
  - Prefer FOREGROUND `check-all.sh` with the Bash-tool `timeout` raised (~4–5
    min); backgrounding + piping masks exit codes.
  - `git mv` moves the STAGED blob — after appending a ticket's Final Report,
    `git add` the archived path before the housekeeping commit or the edit is
    left unstaged (the R100-vs-R08x tell).
  - For an effect the tests can only prove structurally (ticket 06's
    auto-dismiss), a real browser drive is the honest confirmation.
- **Commit convention:** feat commit carries the code; a separate housekeeping
  commit git-mv's the ticket into archive with its Final Report + `commit_hash`.
- Once `/drive` is underway on ticket 07, this checkpoint can be archived.
