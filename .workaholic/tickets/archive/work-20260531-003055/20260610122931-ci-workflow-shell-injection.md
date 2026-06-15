---
created_at: 2026-06-10T12:29:31+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.5h
commit_hash: 98c3e52
category: Changed
depends_on:
---

# Fix shell injection in start-pull-request workflow (LABELS/ASSIGNEES)

## Overview

`.github/workflows/start-pull-request.yml` interpolates `${{ env.LABELS }}` and
`${{ env.ASSIGNEES }}` directly into `run:` shell blocks. GitHub-expression
interpolation is substituted into the script text *before* the shell parses it,
so a label or assignee name containing a quote plus shell metacharacters executes
arbitrary commands in a job that holds `contents: write` (and `id-token: write`).
Exploitation needs triage/write access to create such a label, so it is
insider-grade rather than drive-by — but the same file already demonstrates the
safe pattern for `ISSUE_TITLE` (passed via `env:` and referenced as
`"$ISSUE_TITLE"`), which LABELS/ASSIGNEES should follow.

Severity: **MEDIUM**.

Also folds in two low-severity workflow-hygiene fixes flagged in the same review.

## Key Files

- `.github/workflows/start-pull-request.yml` (lines 54, 113, 114) — the `${{ env.LABELS }}` / `${{ env.ASSIGNEES }}` interpolations into `run:`; line 13/111 show the safe `ISSUE_TITLE` pattern to copy.
- `.github/workflows/prepare-release.yml` (line 24) — unpinned `gem install --no-document faraday-retry git-pr-release` at runtime; `id-token: write` granted (lines 7, 14) with no OIDC step.
- `.github/workflows/*.yml` (all four) — actions pinned to mutable tags (`actions/checkout@v4`, `actions/github-script@v6`, `ruby/setup-ruby@v1`, `release-drafter@v5`).

## Implementation Steps

1. In `start-pull-request.yml`, stop interpolating `${{ env.LABELS }}` / `${{ env.ASSIGNEES }}` into `run:`. Bind them as `env:` variables on the step and reference them quoted (`"$LABELS"`, `"$ASSIGNEES"`), mirroring the existing `ISSUE_TITLE` handling.
2. (Low) Pin `git-pr-release` (and `faraday-retry`) to explicit versions in `prepare-release.yml`; drop the unused `id-token: write` permission if no OIDC step consumes it.
3. (Low) Pin third-party actions to commit SHAs rather than mutable tags across the four workflows; update `release-drafter` if outdated.
4. Verify each workflow still parses and the PR-creation path works (dry-run or on a test branch).

## Considerations

- **Infrastructure as Code** (`standards:implementation`) / CI-CD automation under `standards:operation`: workflows are version-controlled infrastructure; untrusted input (`github.event.*`, label/assignee names) must never reach a `run:` shell unquoted, and dependencies pinned for reproducibility from a clean state. (`.github/workflows/`)
- Keep the scoped `permissions:` blocks minimal — least privilege; removing the unused `id-token: write` is part of that.
- `run-tests.yml` is already safe (`pull_request`, read-only token for forks) — do not regress it to `pull_request_target`.
- These are config/CI changes only — no package source is touched, so the >90% coverage gate does not apply here, but run the workflows' own checks.

## Final Report

The security fix and the safe hygiene items are done; action-SHA pinning is
deferred (see below). Both edited workflows validated as YAML.

- **Shell injection (the MEDIUM fix)**: `start-pull-request.yml` no longer
  interpolates any GitHub expression into a `run:` shell — `LABELS`, `ASSIGNEES`,
  and `NEW_BRANCH_NAME` (already exported to `$GITHUB_ENV`) are referenced as
  quoted shell vars (`"$LABELS"`, …), and `DEFAULT_BRANCH`/`ISSUE_NUM` likewise,
  mirroring the existing `"$ISSUE_TITLE"` pattern.
- **Least privilege**: dropped the unused `id-token: write` from both
  `prepare-release.yml` and `start-pull-request.yml` (no OIDC step uses it).
- **Gem pinning**: pinned `faraday-retry:2.4.0` and `git-pr-release:2.5.0`
  (versions verified against the rubygems API).

### Discovered Insights

- **Insight**: Action-SHA pinning was **deferred**, not done. Resolving correct
  commit SHAs showed `actions/github-script@v6` (and `release-drafter@v6`) are
  *annotated* tags whose ref SHA is the tag object, not the commit — pinning to
  that SHA would break the workflow — and `ruby/setup-ruby@v1` hit the
  unauthenticated GitHub API rate limit. Hand-pinning 5 actions under those
  conditions is error-prone enough to break CI for a LOW item; recommend
  Dependabot (`package-ecosystem: github-actions`) or `pin-github-action`, which
  dereference annotated tags correctly and keep SHAs current.
  **Context**: verified commit SHAs already found if pinning by hand later —
  checkout v4 `34e114876b0b11c390a56381ad16ebd13914f8d5`, release-drafter v5
  `09c613e259eb8d4e7c81c2cb00618eb5fc4575a7`, github-script v7
  `f28e40c7f34bde8b3046d885e986cb6290c5673b`.
