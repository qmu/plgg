---
created_at: 2026-07-19T04:35:47+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 4h
commit_hash: c64c33e8
category: Added
depends_on:
---

# plggpress: config loader rejects extensionless TS imports; dead-link checker has no exclude/ignore

Dogfooding feedback from attempting to migrate a real ~33-page docs set from
VitePress onto `plggpress`. Together these two gaps blocked the migration, so the
docs site was kept on VitePress pending a fix — the migration is otherwise scaffolded
and ready.

## 9. Config loader cannot resolve an extensionless relative TS import (low-medium)

`plggpress`'s `loadConfig` fails to resolve an extensionless relative TypeScript
import from the site config (e.g. `import { … } from "../some/module"`),
reporting `Cannot find module …`; only an explicit `.ts` extension resolves.
Extensionless relative imports are the idiomatic TS form (and resolve under
vite/VitePress), so requiring the explicit extension is surprising — it bites
immediately when the site config sources its IA from a shared module.

**Request:** resolve extensionless relative TS imports in `loadConfig`, or
document the required form.

## 10. Dead-link checker has no content-exclude / link-ignore and fails on links to existing non-page files (medium)

`plggpress`'s build-time dead-link checker fails the build on any internal link
that does not resolve to a built page, and offers no documented `srcExclude`-style
content filter or link-ignore. Real content routinely links from a page to a
co-located non-page artifact (a `.json` data file, a download) and keeps side
files that should not be built as pages (fixtures, drafts, redirect stubs). With
no exclude/ignore, such content cannot build without deleting or relocating the
links and files — which mangles content that must stay faithful.

**Request:** a `srcExclude`-style content filter and a link-ignore option (or
treat "link to an existing non-page file" as valid) in the dead-link checker.

## Policies

- **workaholic:implementation** (objective-documentation) — the report cites the
  exact loader error and the concrete content shapes (page→`.json`, side files)
  the checker rejects.
- **workaholic:operation** (ci-cd) — a docs build that cannot express valid
  cross-artifact links or exclude non-page files blocks the delivery pipeline.

## Quality Gate

- A site config using an extensionless relative TS import loads successfully (or
  the required form is documented).
- A docs build passes with (a) a page linking to an existing co-located non-page
  file and (b) side files excluded from page building, via a documented
  `srcExclude`/link-ignore — verified on a fixture docs tree.
