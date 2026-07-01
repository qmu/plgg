---
created_at: 2026-07-01T12:17:30+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category: Removed
depends_on:
---

# Remove the unused `@microsoft/api-extractor` devDependency from plgg-test

## Overview

`packages/plgg-test/package.json` declares `@microsoft/api-extractor` (`^7.58.9`)
as a devDependency, but **nothing references it** — no `api-extractor.json`
config, no script, no `.ts`/`.mjs` import, no bundler hook. plgg-test builds
through `plgg-bundle`, which emits its `.d.ts` with its OWN in-house pipeline
(`plgg-bundle/src/domain/usecase/emitDts.ts` + `rewriteDtsAliases.ts`, driving
`tsc` directly) — never api-extractor. It is a leftover from an earlier
`.d.ts`-rollup approach that plgg-bundle replaced. Discovery confirmed the only
occurrence across `packages/**` source/config is the package.json line itself.

This is the same dead-weight-removal pattern as the earlier dotenv / happy-dom
leftover pruning: shed an unused external dep with zero behavioural change,
consistent with the repo's vendor-neutrality / smaller-better posture.

## Key Files

- `packages/plgg-test/package.json` — remove the `@microsoft/api-extractor`
  line from `devDependencies`.
- `packages/plgg-test/package-lock.json` (+ any lockfile whose tree includes
  plgg-test) — regenerate so no stale api-extractor entry lingers, same
  `npm install --package-lock-only` sweep used for the happy-dom removal.

## Implementation Steps

1. Delete the `@microsoft/api-extractor` devDependency line from
   `plgg-test/package.json`.
2. Regenerate the affected lockfiles (`npm install --package-lock-only` in
   plgg-test and any package whose lockfile references it).
3. Verify nothing references it: `grep -rn "api-extractor\|@microsoft"
   packages --include="*.ts" --include="*.mjs" --include="*.json"
   --include="*.sh" | grep -v node_modules | grep -v package-lock` returns
   empty.
4. Confirm `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` (at least the
   plgg-test build/suite) stay green — they will, nothing calls it.

## Considerations

- Zero code change, zero behaviour change — pure devDep pruning.
- Do not add any replacement dependency (there is nothing to replace; the dts
  emit is already in-house).
- Lockfile hygiene: leaving a stale api-extractor entry in a lockfile is a
  consistency/CI risk; regenerate the affected ones.
- Tooling: verify via the canonical `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh`.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — shed unused
  external dependencies (smaller-better; fewer supply-chain surfaces); no new
  dep added.
