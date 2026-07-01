# Add plgg-http-client and unify the error vocabulary as Box-tagged ADTs etc

## Summary

A typed `plgg-http-client` is added symmetric to the renamed `plgg-http-router`, and plgg's error story is unified: core `Exceptionals`, `HttpError`, and `NetworkError` become `Box`-tagged ADTs with structured object content, foldable by `match` and matched via named `$` patterns.

## Key Changes

- Renamed `plgg-web` → `plgg-http-router` (history-preserving `git mv`)
- New `plgg-http-client` POC: `request`/`get`/`post`/`put`/`patch`/`del` over a single `fetch` seam, errors as values
- `match`'s no-case-matched runtime path now returns a `CoverageError` value instead of a bare `Error` (closes gap #8)
- One `Box`-tagged, object-content error vocabulary end-to-end, with named `$` ADT patterns replacing inline tag strings
- Core `Error` classes gained a `Box` face (`__tag` + structured `content`) while keeping `extends Error`

## Changes

### Added

- `plgg-http-client` package: typed HTTP client reusing the router's HTTP model, with a `fetch` seam (`toFetchRequest`/`fromFetchResponse`), `decodeJsonBody`, and a non-2xx-is-a-valid-response policy
- `coverageError` constructor and `isCoverageError` guard for `match`'s non-exhaustive value
- Named `$` ADT patterns for every error variant (`invalidError$`, `notFound$`, `networkError$`, …)

### Changed

- Renamed the server router package `plgg-web` → `plgg-http-router` (behaviour-preserving)
- `match`'s runtime no-match path returns a `CoverageError` value consistent with its type-level contract
- Core/HTTP/client errors reshaped to `Box`-tagged ADTs with structured object `content`; `DeserializeError` joined the `PlggError` union

## Metrics

- **Tickets Completed**: 4

## Links

- [Pull Request](https://github.com/qmu/plgg/pull/35)
- [Branch Story](.workaholic/stories/plgg-http-client.md)
