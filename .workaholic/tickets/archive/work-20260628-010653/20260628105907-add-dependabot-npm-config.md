---
created_at: 2026-06-28T10:59:07+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.25h
commit_hash: 8993dfc
category: Added
depends_on:
---

# Add `.github/dependabot.yml` npm config to fix the failing Dependabot security-update job

## Overview

Dependabot's security-update job is failing on the server side with:

```
ERROR Error during file fetching; aborting: Private npm registries require either
a .npmrc file in your repository, or explicit `scope`/`replaces-base` configuration
in dependabot.yml. Registry: npm.pkg.github.com

Type: private_registry_config_not_found   source: npm.pkg.github.com
```

Root cause: the repo has **no `.github/dependabot.yml` and no `.npmrc`**. With no config present, Dependabot falls back to its default security-update flow, and because its `automatic-github-packages-auth` experiment is on, it injects an `npm.pkg.github.com` credential into the job — then the file-fetcher aborts before opening any security PR because there is no registry config to go with that credential. The repo does **not** use GitHub Packages at all: `npm.pkg.github.com` appears nowhere, and every real dependency resolves from `registry.npmjs.org`.

The fix is a single new file, `.github/dependabot.yml`, declaring the **npm** ecosystem across the `packages/*` workspaces. An explicit `package-ecosystem: "npm"` declaration short-circuits the failing experiment, so Dependabot resolves each manifest against the public registry and skips the GitHub Packages credential path. This unblocks the currently-stuck `happy-dom` security advisory (present at `^15.0.0` in `plgg-test`, `example`, `plgg-view`) and enables future security/version update PRs.

This is a pure Config-layer change — no runtime code, no existing workflow, and no new dependency is touched.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout; the new config belongs at the `.github/` root alongside `workflows/`, `ISSUE_TEMPLATE/`, and `release-drafter-config.yml` (applies to all code/config work).
- `workaholic:implementation` / `policies/coding-standards.md` — house style/formatting conventions (applies to all work; keep the YAML minimal and conventional).
- `workaholic:operation` / `policies/ci-cd.md` — dependency vulnerability scanning is a default CI inspection that must surface regressions at PR time and be kept functional; CI/config files stay thin and declarative, with reproducible logic living in `scripts/` rather than vendor DSL. A Dependabot config is exactly such a thin declarative inspection.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — Conservative Vendor Dependence: Dependabot is the *sanctioned* automated mechanism for monitoring whether a dependency can still be depended on; configuring it preserves the repo's zero-new-dependency posture and must not deepen lock-in.
- `workaholic:implementation` / `policies/command-scripts.md` — no bespoke per-command shell logic may be smuggled into CI/tooling config; the file is pure declarative configuration, not a place for embedded scripts.

## Key Files

- `.github/dependabot.yml` — **NEW FILE.** Dependabot v2 config declaring the npm ecosystem across `packages/*`. Its absence is the direct cause of the `private_registry_config_not_found` abort.
- `.github/workflows/run-tests.yml` — canonical source of the Node version (`22.x`) and the per-package `npm ci` model (`packages/plgg`, `plgg-bundle`, `plgg-test`). Confirms each package directory is an independent install root and that no `engines`/version pin needs to go in the Dependabot config.
- `packages/plgg-test/package.json` — declares `happy-dom: ^15.0.0` (the blocked advisory); has its own `package-lock.json`, so `/packages/plgg-test` is its own scan target.
- `packages/example/package.json` — declares `happy-dom: ^15.0.0`; own lockfile → independent scan target.
- `packages/plgg-view/package.json` — declares `happy-dom: ^15.0.0`; own lockfile → independent scan target.
- `packages/*/package.json` + `packages/*/package-lock.json` (13 packages: `example`, `guide`, `plgg`, `plgg-bundle`, `plgg-fetch`, `plgg-foundry`, `plgg-http`, `plgg-kit`, `plgg-router`, `plgg-server`, `plgg-sql`, `plgg-test`, `plgg-view`) — there is **no root `package.json`/workspaces**; each package is a self-contained install root, so the config must target package directories, not the repo root.

## Related History

No prior ticket ever proposed a Dependabot config or an npm-ecosystem setup — this is net-new Config work — but two archived tickets are directly adjacent: the CI security ticket already recommended Dependabot (for the `github-actions` ecosystem) as a deferred fix, and the just-archived happy-dom removal ticket confirms which workspaces still legitimately carry `happy-dom`.

Past tickets that touched similar areas:

- [20260610122931-ci-workflow-shell-injection.md](.workaholic/tickets/archive/work-20260531-003055/20260610122931-ci-workflow-shell-injection.md) - Only prior ticket mentioning Dependabot; its Discovered Insights defer action-SHA pinning and recommend `package-ecosystem: github-actions` (see Considerations re: whether to co-locate).
- [20260628010700-remove-unused-dotenv-and-happy-dom-devdeps.md](.workaholic/tickets/archive/work-20260628-010653/20260628010700-remove-unused-dotenv-and-happy-dom-devdeps.md) - Confirms `happy-dom ^15.0.0` is legitimately retained in `plgg-test`, `example`, `plgg-view` (only the `plgg-server` declaration was unused/removed) — exactly the workspaces this config must cover.
- [20260627002336-purge-vite-and-final-grep-gate.md](.workaholic/tickets/archive/work-20260626-221353/20260627002336-purge-vite-and-final-grep-gate.md) - Establishes the vendor-neutrality / "smaller is better" dependency posture and the per-package `package.json` + lockfile layout this config must enumerate.

## Implementation Steps

1. Create `.github/dependabot.yml` with `version: 2` and a single `updates:` entry for `package-ecosystem: "npm"`.
2. Cover every workspace lockfile using the Dependabot v2 `directories:` glob form — `directories: ["/packages/*"]` — rather than 13 explicit `directory:` entries. This is concise and stays in sync as packages are added/removed. (Fallback if the glob form misbehaves: enumerate each `/packages/<pkg>` directory explicitly.)
3. Set `schedule: { interval: "weekly" }`.
4. Do **not** add any `registries:` block or `.npmrc` — nothing in the repo uses GitHub Packages, and the explicit `package-ecosystem: npm` declaration is what short-circuits the failing `automatic-github-packages-auth` path.
5. Keep the config minimal and declarative; no embedded shell logic (command-scripts policy).
6. Verify the YAML is well-formed and conforms to the Dependabot schema (see Considerations for verification limits). Once merged to `main`, confirm a Dependabot run no longer reports `private_registry_config_not_found` and that the `happy-dom` security PR(s) open.

## Patches

Speculative — the concrete config to create. The `directories` glob is the recommended default; confirm Dependabot accepts it for this repo at the approval gate.

### `.github/dependabot.yml`

```diff
--- /dev/null
+++ b/.github/dependabot.yml
@@
+# Dependabot configuration.
+# Declaring the npm ecosystem explicitly resolves every manifest against the
+# public registry (registry.npmjs.org) and short-circuits the automatic
+# GitHub Packages auth path that was aborting security updates with
+# `private_registry_config_not_found`. The repo does not use GitHub Packages.
+version: 2
+updates:
+  - package-ecosystem: "npm"
+    # No root package.json/workspaces: each packages/* dir is its own
+    # install root (own package.json + package-lock.json). The glob covers
+    # them all and stays in sync as packages are added or removed.
+    directories:
+      - "/packages/*"
+    schedule:
+      interval: "weekly"
```

## Considerations

- **Verification is limited locally.** A `dependabot.yml` is validated by GitHub's Dependabot config parser, not by the repo's vitest suite or `scripts/*.sh` gates. `/drive` can only confirm the YAML is well-formed and schema-conformant; the real proof is the next server-side Dependabot run after merge to `main`. State this honestly in the drive report rather than claiming the failure is "fixed" pre-merge. (`.github/dependabot.yml`)
- **`directories` glob vs explicit list.** The v2 `directories: ["/packages/*"]` glob is the chosen default for conciseness/self-maintenance. If Dependabot does not expand the glob as expected for this repo, fall back to one `/packages/<pkg>` entry per package across the full 13-package set. (`.github/dependabot.yml`)
- **Scope is npm-only, per the request.** The archived `ci-workflow-shell-injection` ticket separately deferred adding `package-ecosystem: "github-actions"` for action-SHA pinning. That remains its own concern and is intentionally **out of scope** here to avoid scope creep — but the new `dependabot.yml` is the natural home for it, so a follow-up ticket should add the `github-actions` ecosystem later. (`.github/workflows/*`)
- **`file:../<pkg>` links are ignored by Dependabot.** Internal cross-package deps are local path links and never resolve from a registry, so they generate no update PRs — only true external deps (`happy-dom`, `typescript`, `vitepress`, etc.) will. No special handling needed. (`packages/*/package.json`)
- **PR volume.** Enabling version updates across 13 packages may open several PRs on the first weekly run (notably duplicate `happy-dom` bumps across `plgg-test`/`example`/`plgg-view`). This is expected and acceptable; do not add grouping config unless the user later asks for it. (`.github/dependabot.yml`)
- **Zero-new-dependency invariant.** Resolving the `happy-dom` advisory (whenever the bump PR lands) must be by update or removal only — never by swapping in a new dependency or native binding (vendor-neutrality / `feedback_vendor_neutrality_zero_new_deps`). (`packages/{plgg-test,example,plgg-view}/package.json`)
- **Must not collide with the CalVer release flow.** The config only opens dependency PRs; it must not interfere with the CI-owned `prepare-release`/`release` CalVer pipeline. (`.github/workflows/prepare-release.yml`, `.github/workflows/release.yml`)

## Final Report

Development completed as planned. Created `.github/dependabot.yml` exactly as specified (npm ecosystem, `directories: ["/packages/*"]`, weekly). YAML validated locally as well-formed and schema-correct via a `yaml.safe_load` + field-assertion check; no `registries`/`.npmrc` block added.

### Discovered Insights

- **Insight**: The failing job was Dependabot's GitHub-managed **security-update** flow, not any file in `.github/workflows/`. There is no repo-side workflow to inspect for it — the only on-disk lever is the presence/shape of `.github/dependabot.yml`.
  **Context**: When a Dependabot job goes red, grepping the workflows directory finds nothing; the fix lives in the (previously absent) `dependabot.yml`, and the diagnosis comes from `gh run view --log-failed`, not the workflow YAML.
- **Insight**: The `private_registry_config_not_found` abort was self-inflicted by Dependabot's `automatic-github-packages-auth` experiment injecting an `npm.pkg.github.com` credential into a repo that never uses GitHub Packages. Simply declaring `package-ecosystem: "npm"` explicitly is enough to take the public-registry path — no `.npmrc` or `registries:` block is needed.
  **Context**: The error message suggests adding a `.npmrc` or `scope`/`replaces-base`, which would wrongly imply the repo depends on GitHub Packages. The minimal, correct fix is just an explicit npm ecosystem declaration.
- **Insight**: This change is only verifiable server-side. Local checks confirm YAML/schema validity but cannot prove the Dependabot run succeeds — that requires a real run after merge to `main`.
  **Context**: The drive report should not claim the failure is "fixed" until a post-merge Dependabot run is confirmed green and the blocked `happy-dom` security PR(s) open.
