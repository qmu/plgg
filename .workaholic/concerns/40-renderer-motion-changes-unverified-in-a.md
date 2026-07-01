---
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
created_at: 2026-06-16T14:44:46+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Renderer motion changes unverified in a real browser

## Description

The FLIP-delete rework (out-of-flow fade + delayed survivor slide + container-height close) and the refined easing tokens were validated by unit tests and the bundle, but not by pixels — this sandbox has no Chrome, so visual QA was the developer's by reloading the tunnel (see [38fd91a](https://github.com/qmu/plgg/commit/38fd91a) in `packages/plgg-view/src/Program/usecase/render.ts`).

## How to Fix

Run a headless-browser pass (Playwright/Chromium) over add/delete/reorder/expand to lock the motion behavior, ideally as a visual or DOM-timeline assertion in CI.
