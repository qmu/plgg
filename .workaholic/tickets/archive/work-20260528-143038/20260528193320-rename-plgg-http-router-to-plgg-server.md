---
created_at: 2026-05-28T19:33:20+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 1h
commit_hash: ed61963
category: Changed
depends_on:
---

# Rename `plgg-http-router` → `plgg-server`

## Overview

Rename the server-side HTTP package from `plgg-http-router` to `plgg-server`. Pure rename: directory move, package metadata, path aliases, internal self-imports, downstream `file:` workspace links, sibling consumers (`plgg-http-client`, `src/example`, `src/plgg-sql`), every `sh/*-plgg-http-router.sh` script, and user-facing README references all flip in lockstep. Zero references to `plgg-http-router` remain in live code (`src/`, `sh/`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`). Historical `.workaholic/` archives (stories, release-notes, archived tickets, concerns) are preserved verbatim per the append-only history policy.

This is the foundation ticket — must land before the sibling rename of `plgg-http-client` → `plgg-fetch`, because `plgg-http-client/package.json` declares `file:../plgg-http-router`.

## Key Files

**Package being renamed (everything moves):**

- `src/plgg-http-router/` → `src/plgg-server/` (whole directory, via `git mv`)
- `src/plgg-http-router/package.json` - `name`, `description` (mentions plgg-http-router); `homepage`/`repository`/`bugs` stay (they point at the monorepo URL).
- `src/plgg-http-router/tsconfig.json` - `paths` key `"plgg-http-router*"` → `"plgg-server*"`. `tsconfig.build.json` inherits; no edits.
- `src/plgg-http-router/vite.config.ts` - `resolve.alias["plgg-http-router"]` and `build.lib.name`.
- `src/plgg-http-router/src/index.ts` and every `src/**/index.ts` - self-imports `from "plgg-http-router/..."` flip to `from "plgg-server/..."` (Http/Routing/Serving/View and their nested usecase/model barrels, plus `src/client.ts`).
- `src/plgg-http-router/example.ts` - import `from "plgg-http-router/index"`, tsx invocation comments.
- `src/plgg-http-router/README.md` - title and `import { ... } from "plgg-http-router"` snippets.

**Downstream consumers that must flip atomically:**

- `src/plgg-http-client/package.json` - `dependencies."plgg-http-router": "file:../plgg-http-router"` → `"plgg-server": "file:../plgg-server"`.
- `src/plgg-http-client/vite.config.ts` - the `isFrameworkDep` predicate matches `id === "plgg-http-router"` and `id.startsWith("plgg-http-router/")`; both flip to `plgg-server`.
- `src/plgg-http-client/src/Http/model/ClientError.ts` and every file that imports `HttpError` from `plgg-http-router` (also `usecase/decode.ts`, `usecase/request.ts`, `usecase/seam.ts`, the matching `*.spec.ts`, `example.ts`, README narrative).
- `src/example/package.json` - `"plgg-http-router": "file:../plgg-http-router"` → `"plgg-server": "file:../plgg-server"`; description string also mentions both packages.
- `src/example/src/server/app.ts`, `ssr/server.ts`, `csr/client.tsx` (uses `plgg-http-router/client` subpath), `client/main.ts`, `App.spec.tsx`, `server/app.spec.ts`, `vite.config.ts` (comment), `README.md`.
- `src/plgg-sql/package.json` - `devDependencies."plgg-http-router"` → `plgg-server`.
- `src/plgg-sql/example-web.ts` - import + header comments.
- `src/plgg-sql/README.md` - cross-references.

**Shell scripts (rename file AND update `cd` body):**

- `sh/tsc-plgg-http-router.sh` → `sh/tsc-plgg-server.sh`
- `sh/tsc-watch-plgg-http-router.sh` → `sh/tsc-watch-plgg-server.sh`
- `sh/test-plgg-http-router.sh` → `sh/test-plgg-server.sh`
- `sh/test-watch-plgg-http-router.sh` → `sh/test-watch-plgg-server.sh`
- `sh/build.sh` - echo line and the two `cd src/plgg-http-router` references; preserve the inline build-order comment but update names.
- `sh/check-all.sh` - `./sh/test-plgg-http-router.sh` invocation.
- `sh/npm-install.sh` - echo line and `cd src/plgg-http-router` reference.

**Root docs:**

- `README.md` - sub-package listing, install snippets, code samples, section headers, dev-script hints (~15 mentions; see source-discovery output for line numbers).

## Related History

The plgg-web → plgg-http-router rename established the exact procedure used here. The full-stack example branch is the most recent consumer that this rename must update.

- [20260527142355-rename-plgg-web-to-plgg-http-router.md](.workaholic/tickets/archive/plgg-http-client/20260527142355-rename-plgg-web-to-plgg-http-router.md) — Direct procedural precedent: pure rename, worktree-scoped, dist-rebuild gotcha noted, archives left untouched.
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) — Created the symmetric client that depends on this router; establishes the server-before-client ordering this rename must mirror.
- [20260528091347-fullstack-example-combining-view-sql-http-client.md](.workaholic/tickets/archive/work-20260528-011843/20260528091347-fullstack-example-combining-view-sql-http-client.md) — Most recent consumer wiring both packages; its imports must flip.

## Implementation Steps

1. `git mv src/plgg-http-router src/plgg-server` (preserves blame).
2. Edit `src/plgg-server/package.json`: `name` → `plgg-server`, `description` → "Server-side HTTP router, handler, and view layer built from scratch on the plgg framework" (keep wording; just remove the self-reference if any).
3. Edit `src/plgg-server/tsconfig.json`: `paths["plgg-http-router*"]` → `paths["plgg-server*"]`.
4. Edit `src/plgg-server/vite.config.ts`: `resolve.alias["plgg-http-router"]` → `resolve.alias["plgg-server"]`; `build.lib.name` if it encodes the name.
5. Sweep every `.ts/.tsx` file under `src/plgg-server/` (including `src/`, `example.ts`, `src/client.ts`, all `*.spec.ts/.tsx`): replace `"plgg-http-router` with `"plgg-server` (string boundary matters — keeps subpath imports intact).
6. Edit `src/plgg-server/README.md`: title, `import { ... } from "plgg-server"` snippets.
7. Edit `src/plgg-http-client/package.json`: rename the `file:../plgg-http-router` dep key + path to `plgg-server` / `file:../plgg-server`.
8. Edit `src/plgg-http-client/vite.config.ts`: update the `isFrameworkDep` predicate to match `"plgg-server"` and `"plgg-server/"`.
9. Sweep `src/plgg-http-client/**` (including specs, examples, README): replace `"plgg-http-router` with `"plgg-server` in import strings; flip prose `plgg-http-router` → `plgg-server` in README.
10. Edit `src/example/package.json`: rename the `plgg-http-router` dep key + path; adjust description string.
11. Sweep `src/example/**`: `app.ts`, `ssr/server.ts`, `csr/client.tsx` (note: keeps `plgg-server/client` subpath), `client/main.ts`, `App.spec.tsx`, `server/app.spec.ts`, `vite.config.ts` comment, `README.md`.
12. Edit `src/plgg-sql/package.json`: rename `devDependencies.plgg-http-router` → `plgg-server`. Sweep `example-web.ts` and `README.md`.
13. `git mv` the four `sh/*-plgg-http-router.sh` scripts to `*-plgg-server.sh` and update their `cd $REPO_ROOT/src/plgg-http-router` → `src/plgg-server`.
14. Edit `sh/build.sh`, `sh/check-all.sh`, `sh/npm-install.sh` to reference the new directory and the new script filenames; keep the build-order comment but reflect the new names.
15. Edit root `README.md` and `CHANGELOG.md` references (~15 spots in README).
16. Regenerate `package-lock.json` in every package whose `dependencies` changed: `src/plgg-server`, `src/plgg-http-client` (becomes `plgg-fetch` in the sibling ticket, but the `file:` flip happens here), `src/example`, `src/plgg-sql`. Run `npm install` per the affected packages.
17. Rebuild dist in dependency order so downstream `tsc/vitest` can resolve `file:` deps: `src/plgg && npm run build`, `plgg-view`, `plgg-server`, `plgg-http-client`, `plgg-sql`, `example`.
18. Verify with `grep -rn "plgg-http-router" src sh README.md CHANGELOG.md CLAUDE.md` — must return zero hits. Do **not** grep `.workaholic/` (append-only history).
19. Run `sh/tsc-plgg.sh`, `sh/test-plgg.sh`, then the renamed `sh/test-plgg-server.sh`, then `sh/check-all.sh` if available.

## Considerations

- **Append-only `.workaholic/` archives** — verification grep MUST be scoped to live code (`src`, `sh`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`). Historical stories, release-notes, archived tickets, and concerns referencing `plgg-http-router` are preserved verbatim per `.workaholic/constraints/project.md` (`.workaholic/policies/project.md` rationale).
- **Dist-rebuild gotcha** — `file:../` deps resolve through each package's `dist/`. Without rebuilding upstream dists in dependency order, downstream `tsc/vitest` will fail to find types. The precedent ticket documented this; the `sh/build.sh` aggregator already encodes the order (`src/plgg-http-router/20260527142355-rename-plgg-web-to-plgg-http-router.md`).
- **Subpath export `/client`** — `src/example/src/csr/client.tsx` imports from `plgg-http-router/client`. After rename it becomes `plgg-server/client`. Confirm the new `src/plgg-server/package.json` `exports` map preserves the `./client` subpath pointing at `dist/client.*`.
- **Atomicity** — the `file:../plgg-http-router` link in `src/plgg-http-client/package.json` must flip in the SAME commit as the directory move; otherwise `npm install` fails. Treat steps 1–13 as one commit.
- **No `as`/`any`/`@ts-ignore`** per `CLAUDE.md` — rename type errors must be resolved structurally (by updating the import string), never silenced.
- **Vite externalize predicate** — `src/plgg-http-client/vite.config.ts` line ~13–17 has a string-match predicate (`id === "plgg-http-router"` and `id.startsWith("plgg-http-router/")`). Missing this hides the rename until a production build, since the dev server's path alias masks the old name (`src/plgg-http-client/vite.config.ts`).
- **Naming-symmetry copy** — root `README.md` line ~293 calls plgg-http-client "the symmetric companion of plgg-http-router". After both renames it becomes "plgg-fetch ↔ plgg-server"; consider whether to keep the symmetry framing or rephrase (`README.md`).
- **Version stays at 0.0.1** — the package is unpublished; no semver bump required (`.workaholic/policies/project.md`).
- **Sibling ticket ordering** — `plgg-http-client` → `plgg-fetch` is filed as a follow-up ticket and lists this one as `depends_on`. Land this one first.

## Final Report

Development completed as planned. The 19-step plan in Implementation Steps held up exactly; nothing surprising surfaced beyond what the precedent plgg-web → plgg-http-router ticket had already documented.

### Discovered Insights

- **Insight**: A blanket `find … | xargs sed -i 's/plgg-http-router/plgg-server/g'` against the affected files is safe here because `plgg-http-router` is a unique token: no longer string contains it as a substring, the only places it appears are import literals, package.json strings, comments, and prose. The leading-quote guard discussed in the ticket (`"plgg-http-router`) was over-cautious — a global token swap is faster and equally correct.
  **Context**: Future renames in this monorepo can use the same one-shot sweep as long as the old name is unique. If a future name collides with another token (e.g. renaming `plgg` itself), the guard would matter.
- **Insight**: Several sibling packages (`src/plgg-view`, `src/plgg-sql`, etc.) carry passing references to `plgg-http-router` in their `README.md` even though they don't depend on it at build time. These need to be swept too or the verification grep fails — but they're easy to miss because they don't show up in package.json dependency graphs.
  **Context**: When listing "downstream consumers" in a rename ticket, include any package whose docs cross-link the renamed one, not just direct dependents. A `grep -rln "<old-name>" src/` is the source of truth.
- **Insight**: The `isFrameworkDep` predicate in `src/plgg-http-client/vite.config.ts` (now `src/plgg-fetch/vite.config.ts` after ticket #2) is a string-match externalizer; it must track the upstream's name. This is the kind of "lookalike string outside an import statement" that a naive import-only sweep would miss.
  **Context**: Vite externalize predicates are the most common rename-miss in plgg-fronted packages. Always grep the predicate body, not just import statements.
