---
created_at: 2026-07-03T23:57:11+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 4h
category: Removed
---

# Erase `plggmatic` from this repo; `plggpress` absorbs it

## Overview

`plggmatic` now lives in its own repository (`projects/plggmatic`, a separate
monorepo with its own `plggmatic`, `site`, and `example`). This repo should stop
hosting `plggmatic`. Its only in-repo consumer is `plggpress`, whose **sole
runtime deps are `plgg` + `plggmatic`**: `plggpress` reaches the entire web
stack (`plgg-view`, `plgg-server`, `plgg-http`, `plgg-md`, `plgg-highlight`)
*exclusively through plggmatic's facade barrel*, and calls plggmatic's framework
logic (`build`, `loadConfig`, `buildRouter`, `runApp`, `resolveOptions`).

**Decision (chosen over alternatives): `plggpress` absorbs `plggmatic`.** Inline
plggmatic's framework core into `plggpress` and rewire the barrel imports to the
underlying `plgg-*` packages directly, so `plggpress` becomes self-contained on
the plgg foundation and this repo no longer contains `plggmatic`. The guide
(`packages/guide`, served by `plggpress`) keeps working.

Alternatives rejected:
- *Depend on external plggmatic* (`file:` into `projects/plggmatic` or npm):
  couples this monorepo to a sibling path / release and risks the two plggmatics
  diverging.
- *Move plggpress out too* (into `projects/plggmatic` next to its `site`):
  larger move than asked; also relocates the guide. Not now.

Note the design consequence: plggmatic's facade barrel (one dep aggregating the
whole stack) goes away for the in-repo consumer. `plggpress` will import each
`plgg-*` library directly — a deliberate, explicit dependency surface.

## Rewire map (barrel symbol → real package)

| symbol `plggpress` imports from `plggmatic*` | rewire target |
| --- | --- |
| `asHighlighter` | `plgg-highlight` |
| `frontmatter`, `type MarkdownDoc` | `plgg-md` |
| `renderToString`, `toFetch`, `type Fetch`, `type Web` | `plgg-server` |
| `type SsgError` (from `plggmatic/ssg`) | `plgg-server/ssg` |
| `style_`, `p` (from `plggmatic/style`) | `plgg-view/style` |
| `build`, `buildRouter`, `loadConfig`, `runApp`, `resolveOptions`, `configPathOf`, `type AppOptions`, `type BuildSpec`, `type BuildReport`, `type AppRunContext`, `type AppDefinition`, `ConfigLoadError`/`configLoadError`/`configLoadError$` | absorbed plggmatic framework (new local module in `plggpress`) |

## Key Files

**Absorb (source):** `packages/plggmatic/src/` — 14 impl `.ts` (+5 spec):
`App/model/AppOptions.ts`, `App/model/AppError.ts`,
`Config/usecase/loadConfig.ts`, `Routing/usecase/buildRouter.ts`,
`Build/usecase/build.ts`, `Cli/usecase/resolveOptions.ts`,
`Cli/usecase/runApp.ts`, and their specs/fixtures. Its `index.ts` barrel is NOT
absorbed wholesale — only the framework exports; the `export *` mid-library
re-exports are dropped (plggpress imports those libs directly instead).

**Rewire (consumer):** the ~20 `packages/plggpress/src/**` files importing
`plggmatic` / `plggmatic/style` / `plggmatic/ssg` — notably `build.ts`,
`cli.ts`, `devEntry.ts`, `router/pressRouter.ts`, `Press/usecase/appSpecs.ts`,
`Press/model/*`, `Config/usecase/loadConfig.ts`, `CheckLinks/usecase/collectPageLinks.ts`,
and `theme/*` (`shell`, `page`, `navBar`, `sidebarTree`, `callout`, `notFound`,
+ specs).

**Manifests/config:**
- `packages/plggpress/package.json` — drop `plggmatic`; add direct deps:
  `plgg-view`, `plgg-server`, `plgg-http`, `plgg-md`, `plgg-highlight`,
  `plgg-cli` (the set plggmatic pulled in and plggpress now needs directly).
- `packages/plggpress/bundle.config.ts`, `tsconfig.json` — externals/paths for
  the new direct deps; drop `plggmatic`.

**Build/tooling:** `scripts/build.sh` (remove the `plggmatic` build line + its
comment; keep order so plgg-cli/server/etc. precede plggpress),
`scripts/check-all.sh`, `scripts/npm-install.sh`, delete
`scripts/coverage-plggmatic.sh` + `scripts/test-plggmatic.sh`.

**Guide container:** `workloads/guide/dev-entrypoint.sh` (drop `plggmatic` from
the install loop; ensure plggpress's new direct deps are covered),
`workloads/guide/compose.yaml` (drop `plggmatic` node_modules volume; add any
newly-needed ones). NB this intersects the queued ticket
`20260703210529-guide-container-list-drift` — reconcile the two.

**Docs:** `README.md`, `packages/guide/site.config.ts`,
`packages/guide/packages/plggmatic.md` (remove/redirect),
`packages/guide/packages/plggpress.md`.

## Implementation Steps

1. Create a framework home in plggpress (e.g. `packages/plggpress/src/framework/`)
   and move plggmatic's absorbed impl + specs there, preserving the
   Domain/usecase layout. Fix intra-module import paths.
2. Rewire every `from "plggmatic"` / `"plggmatic/style"` / `"plggmatic/ssg"` in
   `plggpress/src` per the rewire map: framework symbols → the new local module;
   mid-library symbols → their real `plgg-*` package (and `/style`, `/ssg`
   subpaths).
3. `packages/plggpress/package.json`: remove `plggmatic`; add `plgg-view`,
   `plgg-server`, `plgg-http`, `plgg-md`, `plgg-highlight`, `plgg-cli`. Update
   `bundle.config.ts` externals + `tsconfig.json` paths to match.
4. Delete `packages/plggmatic/` entirely.
5. Purge `plggmatic` from `scripts/build.sh`, `check-all.sh`, `npm-install.sh`;
   delete `coverage-plggmatic.sh` + `test-plggmatic.sh`.
6. Update the guide container (`dev-entrypoint.sh` install loop + `compose.yaml`
   volumes) to drop plggmatic and cover plggpress's new direct deps; reconcile
   with the list-drift ticket.
7. Update docs (`README.md`, guide `site.config.ts`, the two
   `packages/guide/packages/*.md`).
8. Follow the house style (`plgg-coding-style`): no `as`/`any`/`ts-ignore`;
   Option/Result; Prettier printWidth 50.

## Quality Gate

**Objective pass condition — from this worktree:**

1. **plggmatic is gone:** `packages/plggmatic/` does not exist, and
   `grep -rn plggmatic --include='*.ts' --include='*.json' --include='*.sh'
   --include='*.yaml' packages scripts workloads` (excluding `node_modules`,
   `dist`, `.workaholic`) returns **0** matches.
2. **Types/tests green (fresh):** `scripts/tsc-plgg.sh` and
   `scripts/test-plgg.sh` pass; a fresh `scripts/check-all.sh` (clean rebuild —
   stale dists must not mask drift) is **green**, including plggpress coverage
   >90% (statements/branches/functions/lines).
3. **plggpress is self-contained on plgg-\*:** its `package.json` no longer lists
   `plggmatic`; it lists the direct `plgg-*` deps and builds via the in-house
   bundler.
4. **Guide serves end-to-end:** `./scripts/serve-guide.sh` from this worktree →
   container **Up**, no missing-module / export-surface errors in logs,
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181/` = **200**,
   body is the guide HTML. Cleanup: `podman compose -f workloads/guide/compose.yaml down`.

## Considerations

- This repo's absorbed framework and `projects/plggmatic` will **diverge** by
  design — intentional (that repo owns the standalone framework; this repo owns
  plggpress + the plgg libs). Call it out in the PR so it's not read as a mistake.
- Reconcile with the two queued guide-container tickets
  (`20260703210528` Dockerfile-git, `20260703210529` list-drift): both enumerate
  `plggmatic`; their package lists change once plggmatic is gone and plggpress
  gains direct deps. Update or supersede them as part of this work.
- `plgg-cli` was just added to the guide container (ticket `20260703191649`)
  because `plggmatic` needed it; after absorb, `plggpress` needs it directly —
  keep it provisioned.
- Breaking changes are acceptable (plgg is its own only consumer); prefer the
  cleanest resulting design over preserving the old facade shape.
