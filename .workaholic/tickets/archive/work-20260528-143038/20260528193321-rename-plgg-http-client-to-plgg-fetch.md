---
created_at: 2026-05-28T19:33:21+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 0.5h
commit_hash: 444f0e9
category: Changed
depends_on: [20260528193320-rename-plgg-http-router-to-plgg-server.md]
---

# Rename `plgg-http-client` → `plgg-fetch`

## Overview

Rename the client-side HTTP package from `plgg-http-client` to `plgg-fetch`. Pure rename mirroring the `plgg-http-router` → `plgg-server` ticket: directory move, package metadata, path aliases, internal self-imports, downstream `file:` workspace link in `src/example/package.json`, every `sh/*-plgg-http-client.sh` script, and user-facing README references all flip in lockstep. Zero references to `plgg-http-client` remain in live code (`src/`, `sh/`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`). Historical `.workaholic/` artifacts are preserved verbatim.

Depends on the sibling rename of `plgg-http-router` → `plgg-server` because `plgg-http-client/package.json` declares `file:../plgg-http-router`; that link must already be `plgg-server` before this rename lands, otherwise the moved `src/plgg-fetch/package.json` would still reference the old upstream.

## Key Files

**Package being renamed:**

- `src/plgg-http-client/` → `src/plgg-fetch/` (whole directory via `git mv`).
- `src/plgg-http-client/package.json` - `name`, `description` (currently "Typed HTTP client built from scratch on the plgg framework, symmetric with plgg-http-router" — both halves change).
- `src/plgg-http-client/tsconfig.json` - `paths["plgg-http-client*"]` → `paths["plgg-fetch*"]`.
- `src/plgg-http-client/vite.config.ts` - `resolve.alias["plgg-http-client"]` and `build.lib.name` if encoded.
- `src/plgg-http-client/src/index.ts` and every internal `index.ts` - self-imports `"plgg-http-client/..."` flip to `"plgg-fetch/..."`. Specifically `Http/index.ts`, `Http/model/index.ts`, `Http/usecase/index.ts`, plus every `*.spec.ts` file (`request.spec.ts`, `decode.spec.ts`, `seam.spec.ts`, `ClientError.spec.ts`) and the seam files (`decode.ts`, `seam.ts`, `request.ts`).
- `src/plgg-http-client/example.ts` - imports from `"plgg-http-client/index"` and (post-sibling-rename) `"plgg-server"`.
- `src/plgg-http-client/README.md` - title, `npm install plgg-http-client` snippet, prose reference to the symmetric server, sh-script names.

**Downstream consumers:**

- `src/example/package.json` - `"plgg-http-client": "file:../plgg-http-client"` → `"plgg-fetch": "file:../plgg-fetch"`; description string mentions `plgg-http-client` too.
- `src/example/src/client/main.ts` - imports `from "plgg-http-client"`.
- `src/example/README.md` - several narrative mentions.

**Shell scripts (rename file AND update `cd` body):**

- `sh/tsc-plgg-http-client.sh` → `sh/tsc-plgg-fetch.sh`
- `sh/tsc-watch-plgg-http-client.sh` → `sh/tsc-watch-plgg-fetch.sh`
- `sh/test-plgg-http-client.sh` → `sh/test-plgg-fetch.sh`
- `sh/test-watch-plgg-http-client.sh` → `sh/test-watch-plgg-fetch.sh`
- `sh/build.sh` - echo line and `cd src/plgg-http-client` reference; preserve the inline build-order comment but update names.
- `sh/check-all.sh` - `./sh/test-plgg-http-client.sh` invocation.
- `sh/npm-install.sh` - echo line and `cd src/plgg-http-client` reference.

**Root docs:**

- `README.md` - sub-package listing (line ~85), install snippets, code samples (lines 14, 43–44), section headers (lines 285, 291), prose ("symmetric companion of plgg-http-router" — coordinate with the sibling rename's copy), dev-script hints (lines 318–319).

## Related History

This ticket re-uses the procedure pioneered by `plgg-web → plgg-http-router` and immediately applies it to the second half of the http pair. The sibling ticket renaming `plgg-http-router` → `plgg-server` is filed alongside this one and is its hard prerequisite.

- [20260528193320-rename-plgg-http-router-to-plgg-server.md](.workaholic/tickets/todo/20260528193320-rename-plgg-http-router-to-plgg-server.md) — Direct prerequisite. Must land first; this ticket's package depends on the renamed upstream via `file:../plgg-server`.
- [20260527142355-rename-plgg-web-to-plgg-http-router.md](.workaholic/tickets/archive/plgg-http-client/20260527142355-rename-plgg-web-to-plgg-http-router.md) — Procedural template (dist-rebuild gotcha, `.workaholic/` archive policy, `git mv` for blame preservation).
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) — Creation ticket; documents the original name choice and the `HttpError` cross-package import pattern that survives the rename (only the upstream string changes).

## Implementation Steps

1. Pull in the prerequisite: `20260528193320-rename-plgg-http-router-to-plgg-server.md` is committed. Otherwise stop — `file:../plgg-server` won't resolve in step 7.
2. `git mv src/plgg-http-client src/plgg-fetch`.
3. Edit `src/plgg-fetch/package.json`: `name` → `plgg-fetch`, `description` → e.g. "Typed HTTP client built from scratch on the plgg framework, symmetric with plgg-server" (or rephrase per the copy decision in the sibling ticket). The `dependencies."plgg-server"` entry was already set by the prerequisite ticket; verify it points at `file:../plgg-server`.
4. Edit `src/plgg-fetch/tsconfig.json`: `paths["plgg-http-client*"]` → `paths["plgg-fetch*"]`.
5. Edit `src/plgg-fetch/vite.config.ts`: `resolve.alias["plgg-http-client"]` → `resolve.alias["plgg-fetch"]`; `build.lib.name` if encoded. (The `isFrameworkDep` predicate already matches `plgg-server` after the prerequisite landed.)
6. Sweep every `.ts/.tsx` under `src/plgg-fetch/` (src/, example.ts, all `*.spec.ts`): replace `"plgg-http-client` with `"plgg-fetch` in import strings.
7. Edit `src/plgg-fetch/README.md`: title, install snippet (`npm install plgg-fetch`), prose mentioning the symmetric server, sh-script names.
8. Edit `src/example/package.json`: rename `"plgg-http-client": "file:../plgg-http-client"` → `"plgg-fetch": "file:../plgg-fetch"`. Update description prose.
9. Sweep `src/example/**`: `client/main.ts` import, `README.md` mentions.
10. `git mv` the four `sh/*-plgg-http-client.sh` scripts to `*-plgg-fetch.sh` and update their `cd $REPO_ROOT/src/plgg-http-client` → `src/plgg-fetch`.
11. Edit `sh/build.sh`, `sh/check-all.sh`, `sh/npm-install.sh` to reference the new directory and new script filenames; update the build-order comment from "plgg-http-client after plgg-http-router" to "plgg-fetch after plgg-server".
12. Edit root `README.md` for the ~6–7 mentions of `plgg-http-client` (sub-package listing, install/import samples, section headers, prose).
13. Regenerate `package-lock.json` in `src/plgg-fetch` and `src/example` after the dep-key flip. Run `npm install` per the affected packages.
14. Rebuild dist in dependency order: `plgg`, `plgg-view`, `plgg-server`, `plgg-fetch`, `plgg-sql`, `example`.
15. Verify with `grep -rn "plgg-http-client" src sh README.md CHANGELOG.md CLAUDE.md` — must return zero hits. Do **not** grep `.workaholic/`.
16. Run `sh/tsc-plgg.sh`, `sh/test-plgg.sh`, then the renamed `sh/test-plgg-fetch.sh`, then `sh/check-all.sh` if available.

## Considerations

- **Hard ordering** — this ticket cannot land before the sibling `plgg-http-router` → `plgg-server` rename. The `depends_on` frontmatter is the contract; `/drive` will refuse to start this one until the prerequisite's `commit_hash` is filled in.
- **Append-only `.workaholic/` archives** — same constraint as the sibling ticket; verification grep scoped to live code only.
- **Dist-rebuild gotcha** — `file:../plgg-server` resolves through `dist/`. After this rename, rebuild `plgg-server` first, then `plgg-fetch`, then `example`. The `sh/build.sh` aggregator preserves the correct order if the comment + invocations are updated together.
- **Atomicity** — directory move, package.json rename, and `src/example/package.json` flip must commit together; otherwise `npm install` in `src/example` fails.
- **No `as`/`any`/`@ts-ignore`** per `CLAUDE.md` — rename type errors are fixed by updating import strings, never by casts.
- **Naming-symmetry copy** — `README.md` line ~293 says "symmetric companion of plgg-http-router"; after both renames the most natural rephrase is "plgg-fetch ↔ plgg-server" or simply "symmetric companion of plgg-server". Decide once and apply consistently across `README.md`, `src/plgg-fetch/README.md`, and the package.json `description` (`README.md`, `src/plgg-fetch/package.json`).
- **Version stays at 0.0.1** — unpublished experimental package; no semver bump.
- **Subpath imports** — unlike the server rename, the client has no `/client`-style subpath; only the bare name is exported. Less risk of missed subpath references.

## Final Report

Development completed as planned. The procedure mirrored Ticket 1 (`plgg-http-router → plgg-server`) exactly, just with a smaller blast radius (one fewer downstream consumer, no `/client` subpath, no `isFrameworkDep` predicate to retune). The "symmetric companion" copy in `README.md` and the package `description` strings were resolved by simple find-replace — the resulting prose ("plgg-fetch ↔ plgg-server", "symmetric companion of plgg-server") reads naturally without needing a manual rephrase.

### Discovered Insights

- **Insight**: The blanket token-swap pattern (`find … | xargs sed -i 's/<old>/<new>/g'`) established in Ticket 1 worked the second time with no surprises — the new name `plgg-fetch` is also a unique token across the live codebase. Two passes with the same shape of rename suggest this is the canonical procedure to document, not a one-off.
  **Context**: Future plgg-* renames can follow the same 16-step playbook these two tickets used. A consolidated "package rename" guide in `.workaholic/policies/` would save the ticket author from re-deriving it each time.
- **Insight**: `src/plgg-view/README.md` had a stale cross-reference to `plgg-http-client` that the sweep caught — the cross-reference wasn't visible from any dependency graph (plgg-view doesn't depend on plgg-fetch). README narratives across sibling packages are a quiet rename surface that only `grep -rln` reliably finds.
  **Context**: Confirms the Ticket 1 insight: "include any package whose docs cross-link the renamed one, not just direct dependents." A pure grep is the source of truth.
- **Insight**: The mid-rename detour to add a `jsxImportSource` clarification to `src/plgg-view/README.md` (commit `0ac3989`) is the kind of side-quest the precedent ticket (plgg-web → plgg-http-router) did not encounter. Documenting *why* a config exists (not just *what* to set) pays back when future contributors hit the same confusion.
  **Context**: Worth folding the JSX/jsxImportSource explanation into the canonical "TS gotchas" section of the root README on a later branch, so plgg-view's README isn't the only place future contributors find it.
