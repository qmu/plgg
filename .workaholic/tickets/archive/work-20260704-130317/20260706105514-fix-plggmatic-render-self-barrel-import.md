---
created_at: 2026-07-06T10:55:14+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 0.5h
commit_hash: a5f46905
category: Changed
depends_on: []
---

# Fix plggmatic's Render self-barrel imports that break dts emit on the clean CI runner (PR #60 check-all RED)

## Overview

The "Run Tests" (`check-all`) GitHub Actions workflow is **failing on PR #60**
(clean runner only — local check-all masks it). plgg-bundle's dts emit for
plggmatic fails:

```
plgg-bundle: DtsError: tsc declaration emit failed
src/Render/model/screen.ts(8,8): error TS2307: Cannot find module 'plggmatic'
src/Render/usecase/{multiColumn,parts,renderMode,singleColumn}.ts: same
```

**Root cause:** five files in plggmatic's own `src/Render/` import from the bare
`"plggmatic"` root barrel. `tsconfig.json` maps `"plggmatic/*" → "./src/*"` but
NOT the bare name, so `"plggmatic"` falls back to `node_modules/plggmatic/dist/
index.d.ts` — which does not exist during plggmatic's OWN dts emit (circular).
The rest of the package (and the barrel itself) self-references by subpath; these
five are the outliers.

## Key files (rewrite `from "plggmatic"` → subpath)

- `packages/plggmatic/src/Render/model/screen.ts`
- `packages/plggmatic/src/Render/usecase/parts.ts`
- `packages/plggmatic/src/Render/usecase/renderMode.ts`
- `packages/plggmatic/src/Render/usecase/multiColumn.ts`
- `packages/plggmatic/src/Render/usecase/singleColumn.ts`

Symbol → subpath (confirmed against `src/index.ts`):
- `Scene`, `Level`, `ConfirmPrompt`, `ActionButton`, `RowLink`, `MenuLink`,
  `QueryState`, `menuLevel$`, `listLevel$`, `detailLevel$` →
  `plggmatic/Schedule/model/Scene`
- `SchedulerMsg`, `queryInput`, `requestAction`, `confirmAction`,
  `cancelAction` → `plggmatic/Schedule/model/Msg`
- `Row`, `Field` → `plggmatic/Declare/model/Row`

Also fix the sibling `*.spec.ts` files with the same bare self-import
(`Render/model/screen.spec.ts`, `Render/usecase/singleColumn.spec.ts`), and grep
the repo for the same smell elsewhere.

## Implementation steps

1. Rewrite the bare `from "plggmatic"` imports in the 5 source files (+ the 2
   specs) to the subpaths above.
2. `scripts/tsc-plgg.sh` green; `cd packages/plggmatic && npm run build`
   (plgg-bundle dts emit) succeeds locally on a clean dist.
3. Prettier (printWidth 50); no as/any/ts-ignore.
4. Commit + push; confirm PR #60 "Run Tests" goes GREEN.

## Considerations

- The fix must be verified on a **clean-runner-equivalent**, not just local
  check-all (which masks it — `project_bundle_clean_runner_deps`). The authoritative
  signal is the PR's "Run Tests" workflow going green after push.
- Do not add a bare-`plggmatic` self-import lint yet; out of scope. Note it as a
  follow-up (a gate that bans `from "plggmatic"` inside `packages/plggmatic/src`).

## Quality Gate

Approval requires: `scripts/tsc-plgg.sh` green; a clean `plgg-bundle` build of
plggmatic emits dts with no TS2307; no bare `from "plggmatic"` remains under
`packages/plggmatic/src`; and **PR #60's "Run Tests" (check-all) workflow is
GREEN** after the fix is pushed.

## Final Report

Development completed as planned. Rewrote the seven files under
`packages/plggmatic/src/Render/` that imported from the bare `"plggmatic"` root
barrel to import from the specific subpaths (`plggmatic/Schedule/model/Scene`,
`plggmatic/Schedule/model/Msg`, `plggmatic/Declare/model/Row`) that
`tsconfig.json`'s `"plggmatic/*" → "./src/*"` map resolves without a dist
dependency — matching how the barrel and the rest of the package self-reference.
Fixed both the 5 source files (screen.ts, parts.ts, renderMode.ts,
multiColumn.ts, singleColumn.ts) and the 2 specs (screen.spec.ts,
singleColumn.spec.ts).

### Verification (Quality Gate cleared)

- Swept all packages: only plggmatic's Render had the dts-breaking bare
  self-import (plgg-server has spec-only self-imports that don't hit the dts
  emit and whose CI is green — left as a noted follow-up).
- `scripts/tsc-plgg.sh` **green**; Prettier applied; no as/any/ts-ignore.
- **Reproduced the clean-runner condition locally**: `rm -rf packages/plggmatic/dist`
  then `npm run build` (plgg-bundle) — the dts emit now **succeeds** (exit 0,
  `dist/index.d.ts` written, no TS2307). Before the fix this is the exact emit
  that failed on CI.
- Follow-up: add a gate banning bare `from "plggmatic"` inside
  `packages/plggmatic/src` so this cannot regress (and audit plgg-server's
  spec self-imports).

**Note:** authoritative confirmation is PR #60's "Run Tests" going green after
push — recorded on the ship after this lands.
