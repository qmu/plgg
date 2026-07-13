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
concern_id: demo-2-s-pre-existing-button
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Demo 2's pre-existing button contrast bug was worked around, not fixed

## Description

Demo 2's shared `demoCss` pairs `.pm-btn-primary`'s fill (`primary-base`) with an ink color (`primary-text`) that renders invisibly in both schemes; rather than fixing the token pairing, the sample buttons that exposed the bug were simply dropped from the demo ([b4c58a98](https://github.com/qmu/plgg/commit/b4c58a98)).

## How to Fix

Fix the primary-button token pairing in the shared theme (now living across plgg-cms/plggpress) so a future consumer that re-adds a primary-button sample does not hit the same invisible-label bug.
