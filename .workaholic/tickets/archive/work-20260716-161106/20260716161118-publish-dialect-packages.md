---
created_at: 2026-07-16T16:11:18+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: plggmatic-ai-native-ui-toward-a-dsl
---

# Publish the dialect exports: bump plgg-ir-language and plgg-ir-manifest to 0.0.2

## Overview

PR #74 landed `manifestDialect` / derived `manifestLanguage` (plgg-ir-manifest) and
`mapDialect` / exported `contextOf` (plgg-ir-language) on main, but both packages
still sit at 0.0.1 on the npm registry — the plggmatic consumer cannot import the
compose seam from the published packages. The deferred concern
`new-exports-are-not-yet-on.md` records exactly this.

This ticket is the version bump that makes the ship-time npm gate fire: bump both
packages 0.0.1 → 0.0.2. The publish itself is the developer-driven pre-merge gate
in `/ship` (`publish-npm.sh`, token/2FA) — the agent preflights and awaits, per
`.workaholic/deployments/` npm contract.

## Implementation Steps

1. `packages/plgg-ir-language/package.json`: version 0.0.1 → 0.0.2.
2. `packages/plgg-ir-manifest/package.json`: version 0.0.1 → 0.0.2.
3. Gates: `scripts/tsc-plgg.sh`, both packages' tests, fresh `scripts/check-all.sh`.
4. Archive + `/report` + `/ship`; at the npm gate the developer runs the publish.

## Quality Gate

- Preflight (`PREFLIGHT=1 scripts/publish-npm.sh`) lists exactly
  plgg-ir-language@0.0.2 and plgg-ir-manifest@0.0.2 as the publish set.
- After the developer publish: `npm view plgg-ir-manifest@0.0.2` resolves and the
  scratch-consumer install/import check in publish-npm.sh passes.
- check-all green.

## Policies

- `workaholic:operation` / release flow — publishing is the developer-driven gate;
  the agent never handles the token.
