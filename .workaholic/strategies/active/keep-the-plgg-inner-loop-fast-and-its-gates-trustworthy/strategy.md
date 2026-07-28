---
type: Strategy
title: Keep the plgg inner loop fast and its gates trustworthy
slug: keep-the-plgg-inner-loop-fast-and-its-gates-trustworthy
status: active
created_at: 2026-07-26T18:50:30+09:00
author: a@qmu.jp
assignees: [a@qmu.jp]
---

# Keep the plgg inner loop fast and its gates trustworthy

## Direction

`./scripts/check-all.sh` is the most frequently executed command in this
repository: every commit passes through it, and every autonomous drive gates on
it. It is therefore the single place where two things must hold at once — it has
to be **fast enough that nobody is tempted to skip it**, and **strict enough that
passing it means something**. Those two pull against each other, and the
direction here is to refuse the trade: never buy speed by checking less, and
never accept slowness as the price of rigour.

Concretely, this is where the repository's own tooling lives — the in-house test
runner, the bundler, the typecheck and coverage gates, the vendor-boundary and
README gates. plgg has no third-party test framework or build tool to defer to,
which is the point: the tooling is written in the same type-driven style as the
libraries, under the same no-escape-hatch rule, with no new dependencies. That
makes the gates something the project can reshape when they get in the way,
instead of something it works around.

This matters most under the sacrificial-architecture premise the project
operates on: when application code is disposable and regenerated, the gates are
what make regenerated code trustworthy. A gate that is slow gets skipped; a gate
that is fast but shallow certifies nothing. Both failure modes end in the same
place — a green signal nobody believes.

Observable consequences of heading this way: a developer runs the full gate
without planning around it; a red gate names the package and the failing check
without further investigation; the gate's own cost is measured and printed rather
than estimated; and adding a package does not make the gate meaningfully slower.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->
