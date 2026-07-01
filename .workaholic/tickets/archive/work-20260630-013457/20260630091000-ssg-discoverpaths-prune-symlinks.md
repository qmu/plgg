---
created_at: 2026-06-30T09:10:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash: 9f47e25
category: Changed
depends_on:
---

# plgg-server Ssg discoverPaths: prune excluded/symlinked dirs DURING the walk (no recursive readdir explosion)

## Overview

Discovered during the guide render-verification: `discoverPaths` in `packages/plgg-server/src/Ssg/usecase/writeStatic.ts` applies its `EXCLUDED_DIRS` (`node_modules`/`scripts`/`dist`) filter as a POST-filter over `readdir(dir, { recursive: true })`. But Node's recursive `readdir` FOLLOWS directory symlinks during the walk, so pointing `--contentDir` at a package root whose `node_modules` is full of `file:`-link symlink cycles (every plgg package) makes the crawl explode — OOM at the 4 GB default heap (~280 s) or `ELOOP` at 12 GB — before the post-filter ever runs. The intended behavior ("skip node_modules") is never reached.

Fix: replace the recursive readdir + post-filter with an explicit walk that prunes `EXCLUDED_DIRS` and skips symlinked directories DURING traversal, so excluded/cyclic subtrees are never entered. Keep the same route-path output and `SsgError` channel.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the fix stays in the Ssg node:fs seam (writeStatic.ts), exported via ssgEntry
- `workaholic:implementation` / `policies/coding-standards.md` — tryCatch-lifted fs into Result, no throw, exhaustive handling, printWidth 50
- `workaholic:implementation` / `policies/test.md` — a spec proving a symlink-cycle fixture does NOT explode and excluded dirs are skipped

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/writeStatic.ts` - discoverPaths: replace `readdir(recursive:true)` + post-filter with a manual walk that prunes EXCLUDED_DIRS and symlinked dirs during traversal
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/discoverPaths.spec.ts` - add a symlink-cycle + excluded-dir fixture asserting no explosion and correct route set

## Implementation Steps

1. Rewrite discoverPaths to walk explicitly: for each dir, `readdir(dir, { withFileTypes: true })` (non-recursive), recurse into subdirs ONLY when the entry is a real directory whose name is not in EXCLUDED_DIRS and is NOT a symlink (use `dirent.isSymbolicLink()` / lstat as needed); collect `*.md` and map to route paths exactly as today (index.md -> dir root, foo.md -> /foo/). Lift fs errors via tryCatch to the existing SsgError.
2. Preserve the existing route-path convention and ordering so plgg-press's build + checkLinks are unaffected.
3. Add a spec: a temp tree containing a `node_modules` dir with a symlink CYCLE plus normal `.md` pages — discoverPaths returns ONLY the real page routes, does not follow the symlink, and completes promptly (no OOM/ELOOP).
4. Run scripts/tsc-plgg-server.sh + the plgg-server runner green.

## Considerations

- Keep node:fs confined to the seam; the runtime-neutral barrel stays fs-free.
- Symlinked directories are skipped entirely (a doc tree should not need to traverse symlinks); if a future case needs following non-cyclic symlinks, add cycle detection then — for now, skip is correct and safe.
- This unblocks running `plgg-press build --contentDir <guide root>` directly, which the deploy/dev tickets rely on.

## Final Report

Development completed as planned. discoverPaths now prunes EXCLUDED_DIRS and symlinked dirs DURING the walk (explicit per-dir readdir + recurse), replacing the recursive-readdir + post-filter that followed node_modules file:-link cycles into OOM/ELOOP. Route output byte-identical. Verified: tsc-plgg-server clean; 96 passed/0 failed; coverage 99.41/91.35/96.02/99.41 (writeStatic.ts 100%); barrel fs-free; no as/any/ts-ignore.

### Discovered Insights

- **Insight**: Node's `readdir(dir,{recursive:true})` FOLLOWS directory symlinks during the walk, so a post-filter on EXCLUDED_DIRS never prevents descending into node_modules symlink cycles — the crawl OOMs (4GB ~280s) / ELOOPs (12GB) first. The fix walks explicitly: a symlink dirent yields [], a real non-excluded dir recurses, an .md file maps to its route. A symlink-cycle spec (node_modules/self->.. + loop->root) proves termination.
  **Context**: This unblocks `plgg-press build --contentDir <package root>` directly (the deploy/dev path); any recursive-readdir over a content tree with file:-link node_modules must prune during the walk.
