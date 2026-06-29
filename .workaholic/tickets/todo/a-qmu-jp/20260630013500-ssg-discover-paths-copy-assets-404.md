---
created_at: 2026-06-30T01:35:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Grow plgg-server/Ssg with discoverPaths, copyAssets, and write404 (colocated fs helpers, exported via the ssg entry NOT the neutral barrel)

## Overview

Close the SSG gaps a real doc site needs while preserving the pure-render / node:fs-seam split: (1) discoverPaths recursively walks a content directory and returns route paths (index.md -> directory root, foo.md -> /foo/); (2) copyAssets mirrors a static assets dir into outDir; (3) write404 emits 404.html so GitHub Pages serves a not-found page for unknown deep paths (VitePress parity) — the 404 HTML itself is produced by the plgg-press theme shell and passed in. New fs code lives ONLY alongside writeStatic.ts and is exported via the plgg-server `./ssg` entry (ssgEntry.ts) — NOT the runtime-neutral Ssg/usecase/index.ts barrel, which must stay node:fs-free. renderRoutes/writeStatic/SsgPage/SsgError are reused unchanged. These helpers are consumed by plgg-press's build pipeline.

**Proof of value:** plgg-test spec: discoverPaths over a fixture dir returns the expected route paths, copyAssets mirrors a fixture asset (and no-ops on missing dir), write404 emits 404.html, and the runtime-neutral Ssg barrel imports no node:fs — green via the plgg-server runner (`npm run test` in packages/plgg-server).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — new fs helpers belong in the Ssg/usecase fs-seam beside writeStatic and are surfaced via the ssg entry, never the runtime-neutral barrel
- `workaholic:implementation` / `policies/coding-standards.md` — tryCatch-lifted fs into Result, no throw, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — reuse/extend the SsgError Box union for new failure modes
- `workaholic:implementation` / `policies/test.md` — plgg-server coverage; specs for the new fs helpers

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/writeStatic.ts` - the canonical node:fs/node:path seam; add discoverPaths + copyAssets + write404 beside writePage, reusing safeTarget guards and tryCatch
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/model/Ssg.ts` - SsgError union + SsgConfig; reuse writeFailed; optionally extend SsgConfig with assetsDir / notFoundPath
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/index.ts` - the RUNTIME-NEUTRAL barrel — must NOT re-export the new node:fs helpers; keep it fs-free
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` - unchanged pure core that consumes discovered paths; confirms the new helper output feeds it

## Implementation Steps

1. Add discoverPaths(rootDir): PromisedResult<ReadonlyArray<SoftStr>, SsgError> using node:fs/promises readdir (recursive), mapping *.md to a route path (index.md -> dir root, foo.md -> /foo/), skipping EXCLUDED_DIRS (node_modules, scripts, dist); lift fs errors via tryCatch into a writeFailed-style SsgError.
2. Add copyAssets(srcDir) => (outDir): PromisedResult<ReadonlyArray<SoftStr>, SsgError> recursively mkdir+copyFile each asset into outDir, reusing the path-traversal guard from safeTarget; treat a missing srcDir as an empty no-op.
3. Add write404(outDir)(html): PromisedResult<SoftStr, SsgError> writing outDir/404.html (the html string is rendered by the plgg-press theme shell and passed in) for GitHub Pages.
4. Export the new helpers from the plgg-server `./ssg` entry (ssgEntry.ts) ONLY; DO NOT add them to the runtime-neutral Ssg/usecase/index.ts barrel (it must stay node:fs-free); keep renderRoutes/writeStatic/generateStatic signatures untouched.
5. Add colocated .spec.ts: discoverPaths over a temp tree yields the expected route set; copyAssets mirrors files (and no-ops on a missing dir); write404 emits 404.html; bad paths return typed SsgError; AND a spec/assertion that index.ts does not import node:fs.
6. Run scripts/tsc-plgg-server.sh and the plgg-server runner green.

## Considerations

- Keep ALL node:fs confined to the existing seam files and surfaced via ssgEntry.ts; the runtime-neutral barrel and renderRoutes stay pure (item 9).
- Route-path convention must match the discovered tree exactly so plgg-press's dead-link check and build handler agree.
- copyAssets is speculative for the current guide (no public/ dir) but kept generic; the no-op-on-missing-dir behaviour keeps the build green.
- write404 only writes bytes; the 404 page MODEL/render lives in the theme + build tickets (item 14 is spread across Ssg/theme/build/checkLinks).
