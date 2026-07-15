---
created_at: 2026-07-15T02:33:39+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# Unexplained: the guide container died once on `ENOENT dist/README` — NOT reproducible, diagnosis retracted

## STATUS: this ticket's original diagnosis was WRONG and has been retracted

It was filed claiming "the guide dev server scans its own `dist/` as content, so a
host build kills the container", and proposed teaching discovery to exclude
`outDir`. **That was wrong on both counts, and acting on it would have "fixed"
code that already works.** Retained as a record of the crash and of what was ruled
out, so nobody re-files the same wrong theory.

## What is actually KNOWN (verified)

- **The crash happened.** `guide_guide_1` died 2026-07-14 21:59:36 with exit 1:
  `ENOENT: scandir '/app/packages/guide/dist/README'`. It stayed down for hours,
  unnoticed. It was almost certainly triggered by host-side `packages/guide` builds
  running at that time (a golden baseline capture) against the bind-mounted tree.
- **`dist` is ALREADY excluded on both sides** — the theory's premise is false:
  - `packages/plgg-server/src/Ssg/usecase/writeStatic.ts`:
    `EXCLUDED_DIRS = ["node_modules", "scripts", "dist"]`, pruned DURING the
    `discoverPaths` walk.
  - `packages/plgg-bundle/src/Dev/node/scanGraph.ts` likewise excludes
    `node_modules` and `dist` from the watched module graph.
- **The reproducer does NOT reproduce.** With the container up and serving
  (`localhost:5181` → 200), running `(cd packages/guide && npm run build)` on the
  host leaves it **alive and still serving 200, with no ENOENT in its log**. Run
  2026-07-15 against the migrated `plggpress dev --watch-theme` setup.
- **The original log is GONE** — the container was `--force-recreate`d during the
  migration, so the real stack trace can no longer be read. That is why this stays
  open as "unexplained" rather than closed as "fixed".

## What that leaves

Two possibilities, neither confirmed:

1. **The old path had a gap the new one does not.** The crash happened under the
   RETIRED wiring (`plgg-bundle dev` against `bundle.config.ts` with
   `watch: [".", "../plggpress/src"]`). The guide is now on `plggpress dev`, whose
   plan is assembled from conventions rather than that hand-written watch list. If
   the gap lived in the old watch config, the migration (`2ec28d27`) already
   removed it — accidentally, not by design.
2. **Something else scandir'd `dist/README`** — an unidentified third path. Nothing
   in discovery or the graph scan should reach it.

## Implementation Steps

1. **Do nothing to discovery.** It already excludes `outDir`. Do not add a second
   exclusion for a bug that is not there.
2. **Watch for recurrence.** If the guide container dies on ENOENT again, capture
   `podman logs guide_guide_1` FIRST — the full stack trace is the only thing that
   will identify the caller. Do not recreate the container before saving the log.
3. If it never recurs, close this as fixed-by-migration.

## Considerations

- **The real lesson is operational, not a code bug**: nothing watches the guide
  container. It was dead for hours and `check-all` stayed green throughout, because
  check-all neither builds nor runs the guide. A health check on the workload would
  have caught in minutes what took hours to notice by accident.
- The crash's timing relative to host builds is suggestive but not evidence — the
  reproducer says a host build alone is not sufficient under the current setup.
