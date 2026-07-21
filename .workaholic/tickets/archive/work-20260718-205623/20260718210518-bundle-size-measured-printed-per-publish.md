---
created_at: 2026-07-18T21:05:18+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Domain]
effort: 2h
commit_hash:
category: Added
depends_on: [20260718210514-publish-structured-output-sub-60s.md]
mission: modernize-plgg-bundle
---

# Measure and print published bundle size per publish (no minifier)

## Overview

Published bundles are unminified with **no size accounting** — the only trim is
`removeComments: true` in the transpiler (`vendors/transpiler.ts` line ~33, the
explicit stand-in for a rejected minifier dependency), and no size is printed
anywhere (the CLI prints only a file count; `publish-npm.sh`/`build.sh` print no
bytes). Concern 47/51-published-library.

Developer decision 2026-07-18: **measure and print, do not add a minifier**
(vendor-neutrality forbids the dependency). Print per-artifact size on every
publish and accept the numbers in the release story.

## Key files

- `packages/plgg-bundle/src/domain/usecase/build.ts` — `writeOut`
  (lines ~243–259), the emitted `index.es.js`/`index.cjs.js` artifacts.
- `packages/plgg-bundle/src/entrypoints/cli.ts` — the `wrote N file(s)` print
  (lines ~37–39).
- `scripts/publish.ts` — the publish/verify summary (from the structured-output
  ticket) where per-package size is surfaced.

## Approach

- When plgg-bundle writes artifacts, compute per-file **raw + gzip** byte size
  and print it in the build output (extend the `wrote N file(s)` line into a
  compact per-artifact size table). Gzip size via Node's `zlib` (already
  available — no new dep).
- Surface the published package's total artifact size in `publish.ts`'s
  compact publish summary, so every publish reports size.

## Quality Gate

- **Acceptance:** every publish prints the published artifacts' **raw and
  gzipped** sizes (per artifact and a package total); a build likewise prints
  per-artifact size. Demonstrate on a real `plgg-bundle` build and a
  `publish-npm.sh` run — size lines appear, structured (not banner spew).
- **No minifier / no new dep:** size is measured with `zlib`; no minification
  library is added (the pillar). `removeComments` stays as the only trim.
- The size numbers are accurate (spot-check a printed gzip size against `gzip
  -c <file> | wc -c`); `scripts/check-all.sh` green.

## Policies

- `workaholic:design` / `vendor-neutrality` (measure instead of adding a
  minifier dep); `history-structures` (sizes recorded in the release story).
- `workaholic:implementation` / `objective-documentation` (size is a measured
  number, printed).
