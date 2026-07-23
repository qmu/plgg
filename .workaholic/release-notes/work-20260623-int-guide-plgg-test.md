# Official VitePress guide for the plgg family (packages/guide/)

## Summary

Built `packages/guide/` — the official documentation site for the whole plgg
family. It pairs hand-written concept prose (getting-started, core concepts,
per-package guides) with an auto-generated, per-package API reference produced
from each package's source and TSDoc via TypeDoc, ships a GitHub Pages deploy
CI, and serves locally on host port 5181 behind the `plgg-guide.qmu.dev`
cloudflared tunnel. Documentation-only for the library (two README corrections
aside); closes by documenting the separately-shipped pipe-style plgg-test.

## Key Changes

- New VitePress site (`@plgg/guide`) with a fixed sidebar information architecture and dead-link-on-build self-check.
- Self-maintaining API reference via `scripts/gen-api.mjs` (TypeDoc per package → gitignored `api/<pkg>/`), curated down to a compact signature index with a lossless symbol-count assertion.
- Per-package sidebar tree with parallel Guide (prose) and API-reference children.
- `deploy-guide.yml` builds all dists in dependency order, then publishes to GitHub Pages, independent of the CalVer release pipeline.

## Changes

### Added

- `packages/guide/`: VitePress project, concept pages (Option, Result, pipe/cast/proc, match, tagged `Box` data, validation, async, composition), per-package guides, and a plgg-test page documenting the pipe-style redesign.
- `scripts/gen-api.mjs` + shared `typedoc.base.json`; `.github/workflows/deploy-guide.yml`; `scripts/serve-guide.sh` + `workloads/guide/` (host port 5181).

### Changed

- Curated the generated reference: ~112 backing instance objects marked `@internal`, ~20 variadic overloads of `pipe`/`cast`/`proc`/`flow` collapsed to one signature each, and the plgg page shrunk 8204 → 3140 lines.
- Reshaped the IA into one group per package, each split into Guide / API-reference children.
- Fixed a stale `match` example in the plgg README (curried form) and aligned the plgg-foundry README with its shipped API.

## Metrics

- **Tickets Completed**: 20
- **Commits**: 34 (+2 merges)

## Links

- [Pull Request](https://github.com/qmu/plgg/pull/44)
- [Branch Story](.workaholic/stories/work-20260623-int-guide-plgg-test.md)
