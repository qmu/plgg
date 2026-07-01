---
origin_pr: 49
origin_pr_url: https://github.com/qmu/plgg/pull/49
origin_branch: work-20260628-010653
origin_commit: f06fbba
created_at: 2026-06-29T11:27:59+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Dependabot config is verifiable only server-side

## Description

`.github/dependabot.yml` can be validated locally for YAML/schema correctness, but the real proof that it clears the `private_registry_config_not_found` failure requires a post-merge Dependabot run on GitHub — local checks cannot exercise the GitHub-managed security-update flow (see [ba279e1](https://github.com/qmu/plgg/commit/ba279e1) in `.github/dependabot.yml`).

## How to Fix

Do not treat the Dependabot failure as resolved until a post-merge run shows green and the blocked happy-dom security PR(s) open; use `gh run view --log-failed` on the Dependabot runs to diagnose any recurrence.
