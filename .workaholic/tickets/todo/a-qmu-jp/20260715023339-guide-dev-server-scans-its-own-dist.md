---
created_at: 2026-07-15T02:33:39+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# The guide dev server scans its own `dist/` as content, so a host build kills the container

## Overview

The guide's dev `contentDir` is its **package root**, and that root contains
`dist/`. So the dev server discovers, watches, and renders the guide's own build
OUTPUT as if it were source content. Any host-side `packages/guide` build then
races the running container, and when a file it is mid-scan disappears the whole
process dies.

**This is not theoretical — it is what killed the container on 2026-07-14
21:59:36:**

```
ENOENT: scandir '/app/packages/guide/dist/README'
Node.js v22.23.1  (exit 1)
```

A host-side `npm run build` in `packages/guide` (run to capture a golden baseline)
rewrote `dist/` while the container served from the same bind-mounted tree. The
container stayed down for hours, unnoticed, because nothing watches it.

## Why it matters beyond the crash

- **The rendered site is polluted.** Every page under `dist/` is a discovered
  route in dev, so the dev site does not match what `plggpress build` produces.
- **It is the same trap `plggpress dev` already guards elsewhere.** The
  `--contentDir` default deliberately prefers `docs/` precisely because a flat `.`
  "scans the whole repo (the `.workaholic/` trap)". The guide has no `docs/`, so it
  falls back to its package root and walks straight into the trap the default was
  designed to avoid. The guard is right; its coverage is incomplete.
- **The failure is silent and delayed.** `check-all` stays green (it does not
  build the guide); only loading `plgg-guide.qmu.dev` reveals the container is
  gone.

## Implementation Steps

1. Decide the fix. Options, roughly in order of preference:
   - **Exclude build output from discovery** — teach `plggpress dev` (or the
     `discoverPaths` seam it shares with `build`) to skip the config's `outDir`,
     plus the standing junk (`node_modules/`, dot-directories like `.workaholic/`).
     This fixes every consumer that authors at its package root, not just guide.
   - Give the guide a `docs/` content root — moves the guide's `.md` files and
     changes every URL. Almost certainly wrong for a corpus with published links.
   - Pass an explicit `--contentDir`/ignore flag from the guide's `dev` script —
     narrowest, but leaves the trap armed for the next consumer.
2. Add a spec pinning that discovery ignores `outDir` (and the junk dirs) when the
   content root contains them.
3. Verify in the CONTAINER, not just in specs: start
   `podman compose -f workloads/guide/compose.yaml up --force-recreate -d`, confirm
   `localhost:5181` serves, then run `(cd packages/guide && npm run build)` on the
   HOST and confirm the container SURVIVES and keeps serving. That build is the
   exact reproducer.

## Considerations

- **`plggpress build` may share the discovery path** — check whether the SSG
  already excludes `outDir` (it must, or the build would consume its own output on
  a second run); if it does, dev should reuse that exclusion rather than grow a
  second one.
- Do not "fix" this by telling people not to build while the container runs. The
  container is a dev convenience; a host build is a normal action, and an ENOENT
  crash is not an acceptable response to it.
- Related: the `dist/` in the guide's package root is also why the container needs
  the `/app/packages/guide/node_modules` anonymous volume dance — worth a look
  while in here, but not in scope.

## Related

- `20260715022802-migrate-guide-and-strategy-onto-plggpress-dev.md` — the guide is
  now on `plggpress dev --watch-theme`; this bug predates that migration (it is a
  contentDir/discovery issue, not a dev-command one) and survives it unchanged.
