---
created_at: 2026-07-04T14:30:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: []
---

# Remove the `plgg-press` remnant; make this monorepo plggmatic's canonical home (manifests + stale prose)

## Overview

Phase 0 (整地 Groundwork), ticket **01** of the plggpress/plggmatic roadmap —
implements **D13** ("plggmatic canonical home = this monorepo; fix
repository/homepage manifest fields and the stale 'now developed in its own
repository' prose") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Three pieces of drift, all consequences of the same 24-hour history
(rename → absorb → re-import, see Related History):

1. **A dead directory.** `packages/plgg-press/` is an **empty, untracked**
   leftover of the `plgg-press` → `plggpress` rename (`3eab0e8`). Verified:
   `git ls-files packages/plgg-press` → 0 entries; `ls -a` shows nothing but
   `.`/`..`. A plain `rmdir` suffices — **no `git rm`**, nothing is tracked.
2. **Stale "own repository" prose.** When the old plggmatic (the app-framework
   facade) was absorbed into plggpress (`31fdee9`), four prose sites truthfully
   recorded "plggmatic is now developed in its own repository". Then `6d7a832`
   brought the **new** plggmatic — the column-oriented **UI design framework**,
   plus `site` and `plggmatic-example` — back *into this monorepo*, and per D13
   this monorepo is its canonical home. The four sites now assert the opposite
   of reality.
3. **Manifests pointing at the wrong repo.** The three re-imported packages
   still carry `repository`/`bugs`/`homepage` fields cloned from the standalone
   repo (`github.com/qmu/plggmatic`). `plggmatic` is on the npm publish path
   (publish order is sed-derived from `scripts/build.sh`; its publish-script bug
   was just fixed in `5ad57db`), so these fields ship to the registry — they
   must point at `github.com/qmu/plgg` like every sibling package.

Additionally, "plggmatic" now has **two historical meanings** — (a) the retired
2026-06/07 *app-framework facade* absorbed into `plggpress/src/framework/`, and
(b) the current *UI design framework* package. Archived tickets (notably the
absorb ticket's rewire map) describe meaning (a). This ticket adds **one**
prose note disambiguating the two, so a future agent grepping history does not
apply the absorb-era rewire map against today's `packages/plggmatic`.

No runtime behavior changes; this is documentation, comments, manifests, and
one `rmdir`. Zero new dependencies.

## Policies

- `workaholic:operation` / `policies/delivery.md` — `plggmatic` is published to
  npm by `scripts/publish-npm.sh` (release flow is script-driven from /ship;
  publish order derived from `build.sh`). `repository`/`bugs`/`homepage` are
  delivery metadata: they are shipped verbatim in the registry manifest, so
  pointing them at the canonical repo is a delivery-correctness fix, not
  cosmetics.
- `workaholic:implementation` / `policies/quality.md` — the repo runs no
  linter; comment/README accuracy is carried entirely by review, and Prettier
  (`printWidth: 50`, per-package `.prettierrc.json`) governs every touched
  `.ts` file. Stale prose that contradicts the tree is a quality defect under
  this policy's "every statement reflects the repository" standard.

## Key Files

- `packages/plgg-press/` — empty untracked rename remnant; delete with `rmdir`.
- `packages/plggmatic/package.json` (repository/bugs/homepage block, ~lines
  28–37) — points at `qmu/plggmatic`; retarget to `qmu/plgg`.
- `packages/plggmatic-example/package.json` (~lines 17–26) — same fix
  (private package; fields never reach npm but still steer humans/agents).
- `packages/site/package.json` (~lines 14–23) — same fix (also private).
- `packages/plgg/package.json` / `packages/plggpress/package.json` — the
  canonical field shape to copy verbatim
  (`git+https://github.com/qmu/plgg.git`, `…/plgg/issues`,
  `…/plgg#readme`; no `directory` subfield — siblings don't use one).
- `packages/plggpress/src/framework/index.ts` (header comment, line 9) —
  "(now developed in its own repository)"; stale.
- `packages/plggpress/README.md` (line 17) — "now developed in its own
  repository"; stale.
- `packages/guide/packages/plggpress.md` (line 16) — "now its own
  repository"; stale.
- `packages/guide/site.config.ts` (comment, line 40) — "the absorbed former
  plggmatic, now its own repository"; stale.
- `packages/site/site.config.ts` (lines 57, 92) — the docs site's header/social
  GitHub links point visitors at `github.com/qmu/plggmatic`.
- `packages/site/workbench.md` (line 5) — GitHub tree link targets
  `qmu/plggmatic/tree/main/packages/plggmatic-example` (wrong repo, and the
  link text says `packages/example` — wrong path too).
- `packages/plggmatic/README.md` — home of the single disambiguation note; it
  already seeds one ("distinct from the app-framework facade that plggpress
  absorbed") — expand it, don't duplicate elsewhere.
- Demo-URL trio kept in sync (they quote the same link):
  `packages/site/components/text-link.md` (line 16),
  `packages/site/examples/textLink.ts` (line 8),
  `packages/plggmatic/src/Component/usecase/textLink.spec.ts` (line 20).

## Related History

The remnant and the prose are strata of one rapid sequence:

- `21af849` reimplemented `plgg-press` as a thin plggmatic consumer, then
  `3eab0e8` renamed it `plggpress` — leaving today's empty
  `packages/plgg-press/` shell. Origin era:
  `.workaholic/tickets/archive/work-20260630-013457/` (the
  `20260630013504-plgg-press-scaffold-siteconfig-cli.md` family).
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (commit `31fdee9`, story `.workaholic/stories/work-20260703-184443.md`) —
  erased the **old** plggmatic (app-framework facade) into
  `plggpress/src/framework/`; wrote the now-stale "own repository" prose,
  which was *true at the time*. Its "Rewire map" table describes the old
  plggmatic's barrel — the map future agents must not follow against the new
  package (hence the disambiguation note).
- `6d7a832` — "Add the plggmatic UI design framework to the monorepo": the
  **new** plggmatic + `site` + `plggmatic-example` imported with manifests
  still cloned from the standalone `qmu/plggmatic` repo. D13 settles that this
  monorepo is canonical from here on.
- `.workaholic/tickets/archive/work-20260704-130317/20260704131134-fix-plggmatic-publish-script.md`
  (commit `1510897`, merged as `5ad57db`) — fixed plggmatic's errant `publish`
  lifecycle script; confirms plggmatic sits on the `publish-npm.sh` path, which
  is why its manifest fields are delivery-relevant.
- Old-meaning-era tickets for contrast:
  `.workaholic/tickets/archive/work-20260701-185044/20260703000541-thicken-plggmatic-reexport-facade.md`
  and `…000542-plggpress-consume-thick-plggmatic.md`.

Wiring note: `plggmatic` / `plggmatic-example` / `site` are already present in
`scripts/npm-install.sh` (lines 28–30), `scripts/build.sh` (lines 64–72, exact
`cd $REPO_ROOT/packages/<name> && npm run build` format), and
`scripts/check-all.sh` (lines 46–48) — this ticket must **not** touch runner
scripts.

## Implementation Steps

1. Remove the remnant: re-verify emptiness
   (`git ls-files packages/plgg-press | wc -l` → 0; `ls -A` → empty), then
   `rmdir packages/plgg-press`. Plain `rmdir` only — it fails loudly if
   anything appeared in the directory since verification.
2. Retarget the three manifests (`packages/plggmatic/package.json`,
   `packages/plggmatic-example/package.json`, `packages/site/package.json`):
   set `repository.url` to `git+https://github.com/qmu/plgg.git`, `bugs.url`
   to `https://github.com/qmu/plgg/issues`, `homepage` to
   `https://github.com/qmu/plgg#readme` — byte-identical shape to
   `packages/plgg/package.json`. Change nothing else in these manifests.
3. Rewrite the four stale prose sites
   (`packages/plggpress/src/framework/index.ts` header,
   `packages/plggpress/README.md`, `packages/guide/packages/plggpress.md`,
   `packages/guide/site.config.ts` comment) to state the current truth, e.g.:
   "absorbed from the retired plggmatic app-framework facade; the name
   `plggmatic` now belongs to the UI design framework in
   `packages/plggmatic/`". Keep each edit local to its sentence/comment.
4. Fix `packages/site` outbound links: `site.config.ts` lines 57 and 92 →
   `https://github.com/qmu/plgg`; `workbench.md` line 5 →
   `https://github.com/qmu/plgg/tree/main/packages/plggmatic-example` and
   correct the link text to `packages/plggmatic-example`. Update the demo-URL
   trio (`text-link.md` / `examples/textLink.ts` /
   `Component/usecase/textLink.spec.ts`) to `https://github.com/qmu/plgg`
   in the same edit so the compile-checked twin and the spec assertion stay in
   lockstep.
5. Write the **single** disambiguation note in `packages/plggmatic/README.md`
   by expanding its existing "distinct from the app-framework facade" sentence:
   name both meanings — (a) the retired 2026-06/07 app-framework facade, now
   `plggpress/src/framework/` (absorbed in `31fdee9`; archived tickets and
   their rewire maps refer to *that* plggmatic), and (b) this package, the UI
   design framework, canonical in this monorepo since `6d7a832` (D13). Do not
   copy the note anywhere else; other sites may link to it.
6. House rules on every touched file: no `as`/`any`/`ts-ignore` (none should be
   needed — no type changes), Prettier `printWidth: 50` on `.ts` edits, zero
   new dependencies, no runner-script changes.

## Quality Gate

**Acceptance criteria**

1. `packages/plgg-press` no longer exists; `git status` is untouched by its
   removal (it was untracked).
2. `grep -rn "own repository" packages --include='*.ts' --include='*.md'`
   (excluding `node_modules`/`dist`) → **0** matches.
3. `grep -rn "qmu/plggmatic" packages scripts .github`
   (excluding `node_modules`/`dist`) → **0** matches — manifests, site links,
   and the demo-URL trio all point at `qmu/plgg`.
4. The three manifests' `repository`/`bugs`/`homepage` blocks are
   byte-identical in shape to `packages/plgg/package.json`'s.
5. Exactly one disambiguation note exists (`packages/plggmatic/README.md`),
   naming both historical meanings of "plggmatic" and warning off the
   absorb-era rewire map.
6. No changes to `scripts/npm-install.sh` / `scripts/build.sh` /
   `scripts/check-all.sh`; `git diff --stat` shows only the files listed in
   Key Files.

**Verification method**

Run the two greps above from the repo root and paste their (empty) output.
Then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not
mask drift) must be green end-to-end: it rebuilds `plggmatic`,
`plggmatic-example`, and `site` (whose static build re-renders the edited
`.md` pages and compiles the edited `examples/textLink.ts` twin) and runs
`test-plggmatic.sh` (the updated `textLink.spec.ts` proves the demo-URL edit),
with coverage on touched packages staying >90% across
statements/branches/functions/lines.

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh` run
is green. Any grep hit, script diff, or coverage dip fails the ticket.

## Considerations

- **Out of scope, deliberately:** the `plggmatic-guide.qmu.dev` allowed host in
  `packages/site/site.config.ts` and any cloudflared tunnel mapping — hosting
  names are operations concerns for roadmap tickets 28/29, not repo-canonicality.
- **The standalone `qmu/plggmatic` GitHub repo** itself (archiving/read-only
  marking) is an out-of-repo action for the author; this ticket only fixes this
  repo's pointers.
- **npm registry metadata** for already-published `plggmatic` versions keeps
  the old `repository` field; the next CalVer release picks up the fix
  naturally — do not publish solely for metadata.
- **History stays history:** archived tickets/stories under `.workaholic/`
  keep their era-accurate prose (grep criterion 2/3 scopes `packages`,
  `scripts`, `.github` only). The README note is the forward guard, not a
  history rewrite.
- The frozen 2026-02 specs/constraints mention old-meaning plggmatic; their
  regeneration is a deliberately deferred roadmap item — the disambiguation
  note covers the gap until then.
- Revisit trigger: if a future ticket moves `site`/`plggmatic-example` or
  renames packages again, re-run acceptance greps 2–3 as part of that work.
