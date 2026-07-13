---
type: Concern
mission: plggmatic-ai-native-ui-toward-a-dsl
tickets: [20260706122407-npm-publish-developer-gate-and-efficient-runner.md, 20260706162805-plggmatic-site-demo-section-index-and-stubs.md, 20260706183100-plggmatic-demo-1-pane-alignment.md, 20260706183200-plggmatic-demo-2-color-scheme.md, 20260706183300-plggmatic-demo-3-scheduler-query-url-codec.md, 20260706201820-demo-1-bizops-menu-contract-dev.md, 20260706203650-demo-1-projects-section-live.md, 20260706211508-resume-bizops-demo-buildout.md, 20260707101127-fix-plgg-doc-drift.md, 20260708133114-carry-verify-commit-demo1-search-flow.md, 20260708143613-demo1-generic-record-section.md, 20260708143614-demo1-typed-url-state-codec.md, 20260708143615-demo1-module-split-pure-update.md, 20260708143616-demo1-security-assessment.md, 20260708192518-plggmatic-dynamic-sources-pure-demo1-update.md, 20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md, 20260708195656-init-and-populate-plggmatic-repo.md, 20260708195657-remove-plggmatic-cluster-from-monorepo.md, 20260708213945-specify-pragmatic-screen-transition-model.md, 20260708213946-specify-pragmatic-input-field-model.md, 20260709000044-repoint-plggpress-onto-plgg-ui.md, 20260709000045-parameterize-plgg-ui-theme.md, 20260709033756-plgg-md-raw-html-and-site-slugger.md, 20260709103916-resume-plggmatic-publish-boundary.md, 20260709110456-split-plggpress-ssg-and-plgg-cms.md, 20260709165827-plgg-cli-tools-registry-consumable.md, 20260709184509-plgg-bundle-standalone-app-consumer.md, 20260709211943-consolidate-prag-ui-content-into-prag-cms.md, 20260710002912-retire-plgg-ui-domain-package-boundaries.md]
origin_pr: 61
origin_pr_url: https://github.com/qmu/plgg/pull/61
origin_branch: work-20260706-120449
origin_commit: 1b20edd5
created_at: 2026-07-11T02:30:55+09:00
last_seen: 2026-07-11T02:30:55+09:00
first_seen: 2026-07-11T02:30:55+09:00
concern_id: 89-standing-deferred-concerns-carried-prs
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# 89 standing deferred concerns carried (PRs 31–60)

## Description

89 of the 94 deferred concerns re-judged this cycle were verdicted `still_active`; the remaining 5 were resolved on this branch (see below) and are not carried forward. By bucket-of-record: PR #31 (6), PR #37 (8), PR #40 (4), PR #41 (3), PR #46 (15, mostly re-carries of the #31/#37/#40/#41 clusters), PR #47 (5), PR #48 (4), PR #49 (5), PR #51 (16), PR #52 (3), PR #53 (9), PR #55 (1), PR #59 (4), PR #60 (6). The clusters cover: plgg-http/plgg/match type-system limitations (binary-request bytes field, `mapErr` annotation requirements, match exhaustiveness gaps, the dist-rebuild requirement, the route-table 404/405 trade-off, the `BodyInit` copy seam — origin PR #31); renderer/TEA effects gaps and a plgg-server/plgg-fetch vendor coupling (origin PR #37/#40); SSG v1 minimalism and no monorepo versioning policy (origin PR #41); plgg-bundle export-surface/minify/warm-rebuild gaps and a post-merge deploy-guide verification obligation (origin PR #47); plgg-db-migration review carries (origin PR #48); Dependabot/CI config gaps (origin PR #49); plggpress facade disambiguation, hot-reload, HttpStatus refinement, an undocumented Principle (a), and limited proc error-channel adoption (origin PR #51, still live as of PR #55); ops CNAME/HTTPS re-enable follow-ups (origin PR #52); and plgg-parser/plgg-highlight design notes (origin PR #59). None of these domains were touched by this branch's work (the npm gate, the plggmatic demos, the plggmatic extraction, or the CMS package consolidation). Separately, 5 carried concerns were judged resolved this cycle: the facade-plain-names/facade-barrel shadowing concerns were resolved when the plggmatic cluster (and its root barrel) was removed from the monorepo ([540d2f36](https://github.com/qmu/plgg/commit/540d2f36)), and the plggpress-exports-map-is-import-only concern was resolved when the SSG/CMS split added a require-reachable default export condition ([f3bb180a](https://github.com/qmu/plgg/commit/f3bb180a)).

## How to Fix

No single fix — this is a maintenance backlog, not a defect. Continue re-judging it every `/ship` cycle; the full corpus lives under `.workaholic/concerns/*.md`. Consider periodically retiring the meta "N carry-over concerns" summary documents once their underlying items are fully resolved, so the corpus stops growing purely from re-stamping the same unresolved items cycle over cycle.
