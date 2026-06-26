---
created_at: 2026-06-27T00:23:36+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on: [20260627002334-migrate-library-builds-to-in-house-bundler.md, 20260627002335-replace-example-vite-dev-server-and-app-bundle.md]
---

# Purge direct vite, update CI/publish, final grep gate

## Overview

Once every library build (B2) and `example`'s dev/serve + app bundle (B3) run on
the in-house bundler, remove vite at the root and prove it's gone — the exact
pattern the vitest purge ticket established (grep gate proving zero references +
lockfile cleanup). Because the lockfiles' native-binding skew is what broke the
Deploy Guide in the first place, this purge also **retires the rolldown
native-binding failure mode at its source**, making the B1-era deploy-guide
lockfile workaround removable.

**Scope:** purge all *direct* vite usage. The `guide`'s VitePress (transitive
vite) is intentionally retained, so the grep gate must be scoped to exclude the
guide's transitive dependency — it asserts zero direct `vite`/`vite-plugin-dts`
devDeps, zero `vite.config.ts`, and zero `from "vite"` build imports across the
migrated packages, not zero vite anywhere in the dependency graph.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — completes the
  sovereignty move; finalize the dependency-decision log (vite shed, in-house
  bundler adopted, with monitoring + exit).
- `workaholic:operation` / `policies/ci-cd.md` — the deploy/test/publish
  workflows must build deterministically with the same commands developers run;
  update `deploy-guide.yml`, `run-tests.yml` build steps and `publish-plgg.sh`
  to the in-house bundler and **remove the lockfile workaround** added by the
  deploy-guide hotfix once the native-binding dependency is gone.
- `workaholic:implementation` / `policies/command-scripts.md` — the grep gate
  and build stay in the canonical `scripts/` runners; no bespoke per-check
  scripts (consolidate into the existing gate, mirroring the vitest grep gate).
- `workaholic:implementation` / `policies/directory-structure.md` — leftover
  config files removed; repository layout stays clean.

## Key Files

- `scripts/build.sh`, `scripts/check-all.sh` — confirm they orchestrate the
  in-house bundler in dependency order with no vite invocation.
- `scripts/publish-plgg.sh` — currently `vite build && npm publish`; repoint to
  the in-house bundler (releases stay CI-owned CalVer — no manual GitHub Release).
- `.github/workflows/deploy-guide.yml` — its build loop ran `npm run build`
  (= vite); once builds are in-house and native-binding-free, **remove the
  `rm -f package-lock.json` workaround** the deploy-guide hotfix added.
- `.github/workflows/run-tests.yml` — build steps that ran vite indirectly.
- every `packages/*/package.json` — drop `vite` + `vite-plugin-dts` devDeps.
- every `packages/*/package-lock.json` — regenerate to flush vite + rolldown
  (the darwin-only optional-binding rot that caused the CI break).
- any remaining `packages/*/vite.config.ts` — delete (guide excepted).

## Related History

- [20260624141705-u3-plgg-cleanup-and-final-grep-gate.md](.workaholic/tickets/archive/work-20260624-135934/20260624141705-u3-plgg-cleanup-and-final-grep-gate.md) — the proven purge recipe: grep gate proving zero references + lockfile cleanup. Follow it verbatim, scoped to direct vite.
- [20260626130000-fix-deploy-guide-rolldown-binding.md](.workaholic/tickets/archive/work-20260626-221353/20260626130000-fix-deploy-guide-rolldown-binding.md) — the lockfile workaround this ticket can finally remove once rolldown is gone.
- [work-20260624-135934.md](.workaholic/stories/work-20260624-135934.md) — the "final repo-wide acceptance gate" pattern (comprehensive grep + full check-all green) as the closing step.

## Implementation Steps

1. Remove `vite` and `vite-plugin-dts` from every migrated package's
   `package.json` devDeps; delete any remaining `vite.config.ts` (not the
   guide's VitePress config).
2. Repoint `scripts/publish-plgg.sh`, `.github/workflows/deploy-guide.yml`, and
   `.github/workflows/run-tests.yml` to the in-house bundler; **remove the
   `rm -f package-lock.json` workaround** from the deploy-guide build loop.
3. Regenerate all affected `package-lock.json` files to flush vite + rolldown
   (and the stale optional-binding entries).
4. Add a grep gate (in the canonical `scripts/` runner, like the vitest gate)
   asserting zero direct `vite`/`vite-plugin-dts` references — devDeps, configs,
   and build imports — scoped to exclude the guide's transitive VitePress use.
5. Run `scripts/check-all.sh` (full dependency-ordered build + all suites) and
   confirm the Deploy Guide workflow goes green on a real push, as the closing
   acceptance gate.
6. Finalize the vendor-neutrality dependency-decision log.

## Considerations

- The grep gate **must** be scoped: the guide legitimately depends on vite
  transitively via VitePress, so a naive "zero vite anywhere" gate would false-
  positive. Gate on direct devDeps / configs / build imports only.
- Removing the deploy-guide lockfile workaround is only safe **after** the
  native-binding (rolldown) dependency is actually gone — sequence step 2's
  workaround removal after step 1/3 confirm no native-binding bundler remains.
- Lockfile regeneration reintroduces the cross-platform optional-binding concern
  only if a native-binding tool is still present; verify none is.
- Depends on B2 and B3 completing — vite cannot be purged while any package
  still builds with it.
