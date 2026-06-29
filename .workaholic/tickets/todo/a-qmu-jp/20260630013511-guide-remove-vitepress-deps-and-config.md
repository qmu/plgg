---
created_at: 2026-06-30T01:35:11+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort:
commit_hash:
category:
depends_on: [20260630013507-guide-build-router-static.md, 20260630013510-guide-dev-server.md]
---

# Remove vitepress + typedoc-vitepress-theme; delete .vitepress; set full file: dep set; convert home frontmatter

## Overview

Cut VitePress out of packages/guide now that the build/dev path works: delete devDependencies vitepress and typedoc-vitepress-theme (keep typedoc + typedoc-plugin-markdown), repoint dev/build/preview scripts at the new tool, declare the FULL file: dependency set the new tool needs, delete the entire .vitepress/ directory (the only `import from 'vitepress'`), refresh the lockfile, and convert index.md's `layout: home` frontmatter to the flat marker the theme's homeHero consumes (hero/features content now lives in the theme).

**Proof of value:** After removal, `grep -r vitepress packages/guide` finds nothing, `npm run build` produces dist/ via the plgg-native tool, and packages/guide/package-lock.json no longer contains vitepress/vite (no new third-party dep added).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — guide package layout after .vitepress removal
- `workaholic:implementation` / `policies/coding-standards.md` — package.json scripts + content edits follow conventions
- `workaholic:implementation` / `policies/vendor-neutrality.md` — remove vitepress + typedoc-vitepress-theme from deps and lockfile WITHOUT adding any third-party replacement dep; only file: links + the existing typescript

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/package.json` - remove vitepress + typedoc-vitepress-theme; repoint scripts; add the FULL file: dep set; drop 'a VitePress site' from description
- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - delete the whole .vitepress directory (config + theme + dist)
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - convert layout: home frontmatter to the flat marker; the nested hero/features block is removed (content now in the theme homeHero)
- `/home/ec2-user/projects/plgg/packages/guide/package-lock.json` - refresh the guide's own lockfile so the vitepress/vite transitive tree is gone

## Dependencies

- Depends on [20260630013507-guide-build-router-static.md](20260630013507-guide-build-router-static.md) — Guide build.ts + guideRouter: wire parse→highlight→theme→Ssg into a static build
- Depends on [20260630013510-guide-dev-server.md](20260630013510-guide-dev-server.md) — Guide dev server: node:http + fs.watch rebuild with Host allowlist

## Implementation Steps

1. Edit packages/guide/package.json: delete devDeps 'vitepress' and 'typedoc-vitepress-theme'; keep 'typedoc' + 'typedoc-plugin-markdown'; add dependencies plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight (file: links) and devDeps plgg-bundle, plgg-test, typescript ^6.0.3, @types/node (mirroring plgg-view); repoint scripts to dev='node src/serve.js' (or type-stripped), build='npm run docs:api && node src/build.js', preview=static serve; update the description.
2. Delete the entire packages/guide/.vitepress/ directory.
3. Convert index.md frontmatter to the flat `layout: home` marker (remove the nested hero/features YAML — that content is owned by the theme homeHero); verify all other ::: tip/::: warning prose stays verbatim.
4. Run `npm install` in packages/guide to refresh package-lock.json; confirm the vitepress/vite transitive tree is removed and NO new third-party top-level dep was added (only file: links + removals).
5. Run the new build end-to-end and confirm dist/ is produced with no vitepress reference; confirm no remaining `import ... from 'vitepress'` anywhere in packages/guide.

## Considerations

- Do this only AFTER build (ticket 10) + dev (ticket 13) are proven, to avoid a broken guide mid-migration.
- The full file: dep set is mandatory — build.ts imports plgg-server/plgg-http/plgg-view/plgg-md/plgg-highlight and serve.ts imports plgg-server; listing only plgg-md/plgg-highlight would leave unresolved imports.
- gate-vite.sh still exempts /guide/ at this point; tightening it is ticket 15 to avoid a red gate before CI is updated.
