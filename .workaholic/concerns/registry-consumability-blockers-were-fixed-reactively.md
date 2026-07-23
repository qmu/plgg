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
concern_id: registry-consumability-blockers-were-fixed-reactively
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Registry-consumability blockers were fixed reactively, three times, with no preventive gate

## Description

The plggmatic extraction hit three separate registry-consumability blockers in sequence — CLI tools that ran from TypeScript source and failed under `node_modules` ([e6218c9a](https://github.com/qmu/plgg/commit/e6218c9a)), plgg-family published versions that had drifted from the monorepo without a bump, and the app bundler's monorepo-only dependency discovery ([8ebe84e9](https://github.com/qmu/plgg/commit/8ebe84e9)) — each discovered only when the standalone repo's `check-all` was run against real published artifacts. Nothing in this monorepo's own CI would have caught any of the three earlier.

## How to Fix

Add a lightweight, periodic CI job that does a real `npm pack` plus fresh install plus `check-all` smoke of the core plgg CLIs (plgg-bundle, plgg-test, plggpress) outside the monorepo, so drift between monorepo source and published artifacts is caught automatically rather than only when the next cross-repo extraction stumbles on it.
