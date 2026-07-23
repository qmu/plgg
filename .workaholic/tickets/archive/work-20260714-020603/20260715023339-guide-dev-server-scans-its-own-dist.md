---
created_at: 2026-07-15T02:33:39+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash: 1e25e317
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# FIXED: an unhandled fs.watch `error` event killed the dev server when a rebuild removed a watched directory

## STATUS (2026-07-15): fixed and container-verified

The crash that killed the guide's dev container twice is fixed in
`packages/plgg-bundle/src/Dev/node/watch.ts`, and the fix was proven against the
exact reproducer. This ticket records the real diagnosis — and the two wrong ones
that came before it, because how it was misdiagnosed is the useful part.

## The actual cause (full stack trace, captured before recreating the container)

```
Error: ENOENT: no such file or directory, scandir '/app/packages/guide/dist/packages'
    at readdirSync (node:fs:1590:26)
    at #watchFolder (node:internal/fs/recursive_watch:111:21)
    at FSWatcher.<anonymous> (node:internal/fs/recursive_watch:191:26)
    at FSWatcher.emit (node:events:519:28)
Emitted 'error' event on FSWatcher instance
```

- **node's recursive `fs.watch` has no exclusion mechanism.** `watchRoots` watches
  each root with `{recursive: true}`, so a root that contains the app's own `dist`
  is watching build output — regardless of what `discoverPaths` or `scanGraph`
  prune, because neither is involved.
- A host-side `packages/guide` build (against the bind-mounted tree) removes a
  directory the watcher is walking; the watcher `scandir`s a path that is gone.
- It arrives as an **`error` EVENT**. `watchRoots`'s `try`/`catch` only ever
  guarded the INITIAL `watch()` call ("a root that cannot be watched is skipped"),
  and an unhandled `error` on an EventEmitter **throws** — killing the process.
- A disappearing directory is normal in dev. The fix attaches an error handler:
  log it and keep serving.

## Two wrong diagnoses, and why they were wrong

1. **"The dev server scans its own dist as content."** False. `discoverPaths`
   already prunes `dist` (`EXCLUDED_DIRS = ["node_modules", "scripts", "dist"]`) and
   `scanGraph` excludes it too. Acting on this would have added a redundant
   exclusion to correct code.
2. **"Not reproducible — retract."** Also wrong, and the more instructive error.
   The reproducer was run ONCE, the container survived, and the whole ticket was
   retracted. **It is a RACE** — whether the build removes a directory the watcher
   happens to be walking. One passing trial is not disproof. Running the same build
   three times in a row reproduced it immediately once the log was read properly.

## Verification (all on the real workload) — and its ONE gap

The handler was **observed absorbing the real error exactly once**, and that run is
the evidence:

- Container force-recreated, then three consecutive host-side `packages/guide`
  builds: container **survived all three**, HTTP 200 each time, zero fatal errors.
  The log carried the exact ENOENT that used to kill it, absorbed:
  `… (ENOENT: … scandir '/app/packages/guide/dist/packages'); still serving`.
- **Hot reload still works afterwards** — measured, not assumed: editing
  `packages/guide/index.md` AFTER that error still reached the browser (marker
  0 → 1). So the error is one vanished subpath, not the end of the watch.
- `scripts/test-plgg-bundle.sh` 94 passed / 0 failed; tsc clean; check-all EXIT 0.

**The gap, stated plainly:** that observation was made with the pre-reword build.
The shipped version differs ONLY in the log message string (the reword was made
because "watcher … stopped" contradicted the hot-reload measurement above). Re-runs
of the shipped build — three more build cycles, plus a direct `rm -rf` of watched
`dist` subdirectories — left the container serving on 200 with zero fatal errors,
but **did not trip the race**, so they confirm survival without re-exercising the
handler. The race is genuinely hard to force on demand; that is the same property
that made the "not reproducible" retraction wrong.

A deterministic unit probe (emit `error` on the returned watcher and assert no
throw) was attempted and abandoned: `watch.ts` imports a self-subpath
(`plgg-bundle/vendors/nodeFs`) that bare `node` cannot resolve. **A regression spec
run under `plgg-test` is the obvious next step** if this is worth pinning.

## The wasted reloads: also FIXED, and the claim was smaller than expected

The crash fix left "watching dist is wasteful" open. Now closed: `isBuildOutput`
makes the reload decision ignore anything under the app's `outDir`, tested pure
(including that a sibling `dist-notes/` is NOT swallowed by a prefix match).

**The measurement corrected the story.** The guess was "a build writing 39 pages
storms the browser". Measured on the container: a `plggpress build` cost **2**
wasted reloads, not 39 — the watcher's 80ms debounce already collapses the burst.
So this is a correctness tidy, not a rescue; the comment in the code says so.

Two rounds were needed, and the first was wrong:
1. Testing `outDir` AFTER `toChanged` took it from 2 → **1**, not 0. `toChanged`
   probes the disk, and a build DELETES before it writes — a deleted file resolves
   to `null` and falls into the conservative "reload anyway" path.
2. Testing every root's candidate path BEFORE probing the disk → **0**. Same answer
   for a file that exists, the right one for a file that has just gone.

Verified on the container that the fix costs nothing real: a content edit still
hot-reloads (marker 0 → 1) and a theme edit under `--watch-theme` still fires.
- **Nothing watches the dev containers.** This one was dead for hours, twice, and
  `check-all` stayed green throughout because it neither builds nor runs the guide.
  A health check on the workload would turn hours into minutes.
- The `try`/`catch` around `watch()` remains for the initial failure; the new
  handler covers the later one. Both paths are effectful (`Dev/node/`, excluded
  from the coverage threshold), so neither is unit-tested — the container run IS
  the test.
