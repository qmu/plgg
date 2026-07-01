---
created_at: 2026-06-30T01:35:14+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort: 1h
commit_hash: 67363da
category: Removed
depends_on: [20260630013507-plgg-press-build-pipeline.md, 20260630013508-plgg-press-checklinks-anchor-aware.md, 20260630013509-plgg-press-dev-server-live-reload.md, 20260630013510-typedoc-drop-theme-emit-manifest.md, 20260630013511-guide-site-config-instance.md]
---

# Remove vitepress + typedoc-vitepress-theme; delete .vitepress; depend ONLY on plgg-press (+ typedoc devDeps); convert home frontmatter

## Overview

Cut VitePress out of packages/guide now that plgg-press build, checkLinks, and dev all work (dead-link checking exists before cutover, items 11 & 21): delete devDependencies vitepress and typedoc-vitepress-theme (KEEP typedoc + typedoc-plugin-markdown as build devDeps), repoint dev/build/preview scripts at `plgg-press dev` / `plgg-press build`, reduce the guide's site/runtime dependency to plgg-press ALONE (no direct six-sibling set — plgg-press encapsulates them), delete the entire .vitepress/ directory (the only `import from 'vitepress'`), refresh the lockfile, and convert index.md's `layout: home` frontmatter to the flat marker the plgg-press theme consumes (hero/features content now lives in SiteConfig.home + the theme).

**Proof of value:** After removal, `grep -r vitepress packages/guide` finds nothing, the guide's package.json lists plgg-press as its only site dependency (+ typedoc devDeps), `plgg-press build` produces dist/, and packages/guide/package-lock.json no longer contains vitepress/vite (no new third-party dep added).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — guide package layout after .vitepress removal
- `workaholic:implementation` / `policies/coding-standards.md` — package.json scripts + content edits follow conventions
- `workaholic:implementation` / `policies/vendor-neutrality.md` — remove vitepress + typedoc-vitepress-theme from deps and lockfile WITHOUT adding any third-party replacement dep; the guide's only site dep becomes the file: plgg-press, typedoc/typedoc-plugin-markdown stay

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/package.json` - remove vitepress + typedoc-vitepress-theme; repoint scripts to plgg-press; set the SOLE site dependency to plgg-press (file:); keep typedoc + typedoc-plugin-markdown devDeps; drop 'a VitePress site' from description
- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - delete the whole .vitepress directory (config + theme + dist)
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - convert layout: home frontmatter to the flat marker; the nested hero/features block is removed (content now in SiteConfig.home + the theme homeHero)
- `/home/ec2-user/projects/plgg/packages/guide/package-lock.json` - refresh the guide's own lockfile so the vitepress/vite transitive tree is gone

## Dependencies

- Depends on [20260630013507-plgg-press-build-pipeline.md](20260630013507-plgg-press-build-pipeline.md) — plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a generic static build (renders 404, asserts zero client JS)
- Depends on [20260630013508-plgg-press-checklinks-anchor-aware.md](20260630013508-plgg-press-checklinks-anchor-aware.md) — plgg-press checkLinks: anchor-aware build-time dead-link validation (404 excluded from route expectations)
- Depends on [20260630013509-plgg-press-dev-server-live-reload.md](20260630013509-plgg-press-dev-server-live-reload.md) — plgg-press dev(): node:http + fs.watch rebuild, allowedHosts from PressOptions, and DEV-ONLY SSE live-reload
- Depends on [20260630013510-typedoc-drop-theme-emit-manifest.md](20260630013510-typedoc-drop-theme-emit-manifest.md) — Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest
- Depends on [20260630013511-guide-site-config-instance.md](20260630013511-guide-site-config-instance.md) — Guide: add the typed site.config.ts INSTANCE (home data + allowedHosts; thin consumer of plgg-press SiteConfig)

## Implementation Steps

1. Edit packages/guide/package.json: delete devDeps 'vitepress' and 'typedoc-vitepress-theme'; KEEP 'typedoc' + 'typedoc-plugin-markdown'; set dependencies to plgg-press (file:../plgg-press) ONLY — remove any direct plgg/plgg-view/plgg-server/plgg-http/plgg-md/plgg-highlight entries since plgg-press encapsulates them; add devDep plgg-bundle/plgg-test/typescript/@types/node only if the guide's own specs need them; repoint scripts to dev='plgg-press dev', build='npm run docs:api && plgg-press build', preview=static serve; update the description.
2. Delete the entire packages/guide/.vitepress/ directory.
3. Convert index.md frontmatter to the flat `layout: home` marker (remove the nested hero/features YAML — that content is owned by SiteConfig.home + the theme homeHero); verify all other ::: tip/::: warning prose stays verbatim.
4. Run `npm install` in packages/guide to refresh package-lock.json; confirm the vitepress/vite transitive tree is removed and NO new third-party top-level dep was added (only the file: plgg-press link + removals).
5. Run `plgg-press build` end-to-end and confirm dist/ is produced with no vitepress reference; confirm no remaining `import ... from 'vitepress'` anywhere in packages/guide.

## Considerations

- Do this only AFTER build, checkLinks, and dev are proven (items 11 & 21: dead-link checking must exist before cutover), to avoid a broken guide mid-migration.
- The guide's SOLE site/runtime dependency is plgg-press — the facade's whole point. plgg-press's package.json carries the six sibling file: deps; the guide must NOT re-list them.
- gate-vite.sh still exempts /guide/ at this point; tightening it is the deploy-rewire ticket to avoid a red gate before CI is updated.

## Final Report

VITEPRESS REMOVED. packages/guide now depends ONLY on plgg-press (file:), keeps typedoc + typedoc-plugin-markdown devDeps, repoints dev/build/preview to plgg-press, deletes the entire .vitepress/ directory, and converts index.md to the flat `layout: home` marker. npm install removed 124 packages; lockfile has zero vitepress/vite and no new third-party top-level dep. `npm run build` emits 58 pages + 404.html with zero <script>; gate-vite and check-all both exit 0.

### Discovered Insights

- **Insight**: A latent plgg-press bug surfaced at cutover — bin/plgg-press.mjs was tracked mode 100644 while sibling bins are 100755, so the npm .bin symlink could not execute it once a consumer (the guide) invoked it via the dep bin. Fixed to 100755 (git update-index --chmod=+x); rides in this commit.
  **Context**: Any new package shipping a bin must track it executable (100755), matching plgg-bundle/plgg-test.
- **Insight**: The guide's SOLE site/runtime dependency is now plgg-press — the facade encapsulates the six sibling deps, so the guide does not list them. preview uses `python3 -m http.server --directory dist` (zero new dep). gate-vite still exempts /guide/ (tightened in the deploy-rewire ticket); deploy-guide.yml still calls vitepress build (rewired next) — do not run deploy until ticket 18 lands.
  **Context**: The goal (replace VitePress) is met for the guide source; CI/deploy + dev container rewiring (tickets 18-19) make the deployed/dev paths use plgg-press too.
