# Status ledger: issues #155–#158 (corpd consumer requests)

Decision record, 2026-10-24. Classifies what is left per issue as
**code** (a PR is unmerged or missing), **publish** (merged code is
not on npm), or **consumer verification** (corpd must confirm on the
published version). It adds no code; it exists so the open PRs are not
re-implemented.

Registry state below is taken from the 2026-10-24 consumer
verification comments on each issue and from `main`'s `package.json`
versions (`plgg-bundle` 0.0.6, `plgg-view` 0.0.2). It was not
re-queried from this sandbox.

| Issue | Code | Publish | Consumer verification |
| --- | --- | --- | --- |
| #155 EISDIR on 2nd `plgg-bundle` run | Fixed on `main` (`relocate.mjs` removed, 5b109cec). Open: #165 (version bump; body says `Fixes #156` only), #173 (repeat-build gate, `Fixes #155`) | `plgg-bundle@0.0.7` not published; 0.0.6 on npm still has the bug | Run `plgg-bundle` twice in a clean consumer on 0.0.7 |
| #156 TS7 consumer breaks transpile | Same cause and fix as #155. Open: #165 (`Fixes #156`, adds `gate-bundle-npm-consumer.sh`) | same 0.0.7 | Build with consumer `typescript@7` on 0.0.7; then drop the `tsgo` alias workaround |
| #157 frame batching + `lazy` | Open: #166 (`Fixes #157`, bumps `plgg-view` to 0.0.3) | 0.0.3 not published | Several dispatches in one frame give one render; `lazy` skips view and diff |
| #158 SVG shapes + `raw` reuse | Open: #164 (`Fixes #158`; edits `element.ts`/`render.ts`, which #166 also edits; no version bump) | rides on the same `plgg-view` release as #166 | Replace `raw` icons with typed builders; check `.row > svg` selectors and no DOM rebuild on identical html |

## Decisions

1. **No new implementation.** Every code gap already has a green,
   mergeable PR: #164, #165, #166, #173. Duplicating any would only
   add merge conflicts.
2. **Merge order.** #165 first (unblocks the #155/#156 publish). Merge
   #166 and #164 in either order but rebase the second; both edit
   `plgg-view` `element.ts` and `render.ts`. Publish `plgg-view` once,
   after both, so a single release carries #157 and #158.
3. **Close-keyword gap.** #165 should also say `Fixes #155`, or #155 is
   closed by hand after publish. #173 carries `Fixes #155`, but a gate
   alone does not publish.
4. **Do not treat merge as done.** Publish and corpd's verification are
   the real end states; close each issue after
   `plgg-bundle@0.0.7` / the new `plgg-view` are on npm and corpd has
   confirmed.
5. **Publishing is a gated release step** (see CLAUDE.md) needing a
   human with npm rights; it is not done from a work branch.
6. **Out of scope:** Node 24 / TypeScript 7 conditions that outlive
   these issues are classified in #168; not repeated here.
7. **Docs:** the guide's plgg-view page still says "no keyed-list
   reconcile"; #166 edits `packages/guide/packages/plgg-view.md` —
   confirm that row is corrected before closing #157.
