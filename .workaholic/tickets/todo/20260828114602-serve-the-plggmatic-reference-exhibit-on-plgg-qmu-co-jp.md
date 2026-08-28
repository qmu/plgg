---
created_at: 2026-08-28T11:46:02+09:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission:
merge_policy: auto
verification_handoff:
---

# Serve the plggmatic reference exhibit on plgg.qmu.co.jp

## Overview

The plggmatic reference (`packages/plggmatic-example`, demo1 の業務管理アプリ) is today reachable only through the developer-host dev server behind the `qmu-dev` cloudflared tunnel (`plggmatic-reference.qmu.dev`, port 51820) — a surface that is down whenever the dev server is not running (it is down now). Meanwhile the guide's landing page at `https://plgg.qmu.co.jp/` advertises the exhibit with `<https://…>` autolinks that plgg-md does not parse, so the published page shows escaped literal text (`&lt;https://plggmatic-reference.qmu.dev/demo1.html&gt;`) instead of a link — measured on the live site and in `packages/guide/dist/index.html`.

Make the built exhibit a first-class static subtree of the guide: nest `packages/plggmatic-example/dist` (5 self-contained HTML pages + 5 ES bundles, ~2.7 MB, single relative `./NAME.js?v=<hash>` reference each) under the guide's dist at `/plggmatic-reference/`, so the existing single publisher — the assets-only Cloudflare Worker deployed by `deploy-guide.yml` on merge to `main` — serves it at `https://plgg.qmu.co.jp/plggmatic-reference/demo1.html`. Repoint the landing-page section at the on-domain path with real markdown links (the autolink renderer gap is fixed separately — see Considerations).

## Policies

The standard engineering policies (synced from qmu.co.jp into the `workaholic` policy skills) that govern this ticket. Read each linked hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (all code work); the mount path `/plggmatic-reference/` must be readable from structure
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript/style conventions (all code work)
- `workaholic:implementation` / `policies/command-scripts.md` — no bespoke copy script CI never runs; the nesting lives inside the one canonical guide build command, and CI invokes that same command
- `workaholic:operation` / `policies/ci-cd.md` — one publisher per surface; the exhibit rides the existing `deploy-guide.yml` path, provable on `*.workers.dev` / staging before the production route; acceptance is an online check of the live URL, not a green badge
- `workaholic:implementation` / `policies/objective-documentation.md` — the published page must match what the source asserts; stale "nests under /example/" comments corrected in the same PR
- `workaholic:design` / `policies/self-explanatory-ui.md` — the exhibit is entered from a visible, labelled link on the guide, not a URL only this ticket knows

## Key Files

- `packages/guide/package.json` - `build` script (`plggpress build …`); the natural home of the post-build nesting step
- `.github/workflows/deploy-guide.yml` - the only publisher; its guide-build step is an inline `npx plggpress build …` duplicate of the npm script — the drift trap that would make a script-only nesting invisible to production; switch it to `npm run build --prefix packages/guide`. CI already runs `./scripts/build.sh`, whose last entry builds `packages/plggmatic-example`, so the exhibit dist exists before the guide build
- `packages/guide/index.md` - lines 35-36 hold the two `<https://…>`/`<http://…>` pseudo-autolinks; line 35 is repointed at `/plggmatic-reference/demo1.html`
- `packages/guide/wrangler.jsonc` - assets-only Worker (`assets.directory: ./dist`); a nested subtree needs zero wrangler changes, but the comment asserting the build is "40 HTML files and nothing else" becomes false and must be corrected
- `packages/plggpress/src/framework/Build/usecase/build.ts` - `cleanOutDir` does `rm -rf outDir` before writing: the copy MUST run after the plggpress build, or it is deleted
- `packages/plggpress/src/CheckLinks/usecase/checkLinks.ts` - `isAssetPath` exempts any link with a dot in the last segment, so a markdown link to `/plggmatic-reference/demo1.html` passes the dead-link gate with no `linkIgnore` entry
- `packages/plggmatic-example/src/stamp.ts` - writes the five `dist/*.html` with the `?v=<sha256-8>` cache-buster; the nesting source is the full `npm run build` output, never plgg-bundle alone
- `packages/plggmatic-example/bundle.config.ts` - line 10 claims the docs site nests dist under `/example/` — stale (nothing does); the five source `*.html` files mirror the claim; update both to the real path
- `scripts/build.sh` - canonical dependency-ordered dist builder; already builds `plggmatic-example` last, does not build the guide
- `scripts/gate-guide-deps.sh` - reconciles the guide's hand-maintained dependency lists; check whether making the guide build consume `plggmatic-example/dist` needs the gate extended

## Related History

The guide's delivery surface was cut over to a Cloudflare Worker on 2026-08-18 (mission `deliver-the-guide-from-cloudflare-workers-with-a-staging-surface`, all clauses ticked; auto-deploy on merge proven by run 32181723812). The exhibit has never been served from `plgg.qmu.co.jp`: the achieved `grow-plggmatic-as-the-reference-framework` mission pinned it to the dev tunnel, and its one live-host ticket was human/infra-gated.

- [20260818072000-serve-the-guide-from-a-cloudflare-worker-in-this-repository.md](.workaholic/tickets/archive/work-20260818-073433/20260818072000-serve-the-guide-from-a-cloudflare-worker-in-this-repository.md) - established the assets-only Worker this ticket nests into (delivery surface)
- [20260818072004-deploy-the-guide-to-the-production-worker-on-merge-and-retire-github-pages.md](.workaholic/tickets/archive/work-20260818-073433/20260818072004-deploy-the-guide-to-the-production-worker-on-merge-and-retire-github-pages.md) - the auto-deploy path this ticket extends (single publisher)
- [20260703020138-deploy-guide-build-plggmatic-before-plggpress.md](.workaholic/tickets/archive/work-20260703-020116/20260703020138-deploy-guide-build-plggmatic-before-plggpress.md) - precedent: the deploy already ordered plggmatic's build before the guide's (build ordering)
- [20260719050001-verify-live-host-returns-exhibit-not-302.md](.workaholic/tickets/archive/work-20260719-022859/20260719050001-verify-live-host-returns-exhibit-not-302.md) - the dev-tunnel live host and its Access gating — the surface this ticket supersedes as the public entry (prior live host)

## Implementation Steps

1. Reproduce and localize: run `npm run build --prefix packages/guide` and confirm `dist/index.html` renders the section's URLs as escaped literal text (`&lt;https://…&gt;`), and that `dist/` contains no exhibit subtree. (Cause already confirmed: plgg-md's inline scanner has no autolink branch; the content fix here uses supported `[text](url)` syntax.)
2. Nest the exhibit in the guide's own build: extend `packages/guide/package.json`'s `build` to, after `plggpress build`, copy `../plggmatic-example/dist` → `dist/plggmatic-reference` (a small node step using `node:fs` `cpSync`/`cp` — zero new dependencies; fail loudly if the source dist is missing or empty rather than shipping an empty subtree).
3. Kill the CI drift trap in the same change: replace `deploy-guide.yml`'s inline `npx plggpress build …` step with `npm run build --prefix packages/guide`, matching the deploy step's existing `--prefix` pattern, so the command that builds is the one the repository owns.
4. Rewrite `packages/guide/index.md` lines 35-36: point **Live** at `[/plggmatic-reference/demo1.html](/plggmatic-reference/demo1.html)` phrased as the on-domain exhibit (site-relative, so workers.dev/staging/production each serve their own); keep the **Develop it** bullet's dev-server URL as inline code (`http://localhost:51820`, `plggmatic-reference.qmu.dev`), not as pseudo-autolinks.
5. Correct the now-false comments in the same PR: `packages/plggmatic-example/bundle.config.ts` line 10 and the five source `*.html` headers (`/example/` → `/plggmatic-reference/`), and `packages/guide/wrangler.jsonc`'s "40 HTML files and nothing else" assertion.
6. Check `scripts/gate-guide-deps.sh` against the new guide→plggmatic-example build input; extend the reconciled lists if the gate tracks it.
7. Verify locally per the Quality Gate, then route by merge policy (`auto`): confirm the deploy with the developer before merging; the merge itself deploys production.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- After `npm run build --prefix packages/guide`: `packages/guide/dist/plggmatic-reference/demo1.html` and its four sibling pages plus five `*.js` bundles exist; `dist/index.html` contains a real `<a href="/plggmatic-reference/demo1.html"` and no `&lt;https://` remnant.
- `.github/workflows/deploy-guide.yml` contains no inline `npx plggpress build` — the guide build step is `npm run build --prefix packages/guide`.
- The guide build's dead-link check passes with the new links (no `linkIgnore` additions needed for `.html` targets).
- After the merge deploys: `curl -s https://plgg.qmu.co.jp/plggmatic-reference/demo1.html` returns 200 with `<div id="root">` and a stamped `./demo1.js?v=` script tag, and `https://plgg.qmu.co.jp/` shows the working link.
- Decided: verification is local-build assertions plus the live-URL probe after merge — the guide has no test harness and this is build topology, not library code; no new test suite (developer may override at /drive).
- Decided: exhibit mount path is `/plggmatic-reference/`, matching the established name of the surface (developer may override at /drive).

**Verification method** — the commands/tests/probes that prove them:

- `npm run build --prefix packages/guide` then `ls packages/guide/dist/plggmatic-reference/` and `grep` assertions on `dist/index.html`.
- `./scripts/check-all.sh` green (guide build is NOT covered by it — the build above is the separate gate).
- Post-merge: `curl` probes against `https://plgg.qmu.co.jp/` and the nested page; the deploy run green in `gh run list --workflow deploy-guide.yml`.

**Gate** — what must pass before approval:

- check-all green, guide build (incl. dead-link check) green, dist assertions hold, and — per `merge_policy: auto` — the developer confirms the deploy before the merge that publishes it.

## Considerations

- The copy must run strictly after `plggpress build` — `cleanOutDir` rm -rf's the outDir (`packages/plggpress/src/framework/Build/usecase/build.ts`). The framework's `copyAssets` seam (`<contentDir>/public`, ENOENT-tolerant) was considered and rejected: it would still need a pre-build copy into a source-shaped directory, adding a stage without removing a step.
- Staging (`env.staging`, `worker/staging.ts`, `run_worker_first: true`) injects a pre-production banner and `X-Robots-Tag: noindex` into HTML responses; the nested exhibit pages receive the same treatment on `staging-plgg.qmu.co.jp`. That is correct behavior (staging is marked everywhere), not a defect (`packages/guide/wrangler.jsonc`).
- The renderer gap itself — plgg-md has no GFM autolink support — is ticketed separately as `20260828114603-add-gfm-autolink-support-to-plgg-md.md`; this ticket's content fix does not depend on it.
- The dev tunnel (`plggmatic-reference.qmu.dev` → :51820) remains the development surface with hot reload; this ticket does not touch cloudflared config and does not require the dev server to be running.
- `wrangler.jsonc`'s asset semantics (`html_handling: auto-trailing-slash`, `not_found_handling: 404-page`) suit the exhibit — its pages are plain `.html` files with no client routing, so direct file URLs serve and wrong URLs stay 404; do not flip to `single-page-application` (`packages/guide/wrangler.jsonc`).
- The exhibit subtree (~2.7 MB) is far inside Cloudflare's static-asset limits.
