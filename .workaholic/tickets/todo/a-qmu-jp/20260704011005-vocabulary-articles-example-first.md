---
created_at: 2026-07-04T01:10:05+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort: 4h
category: Changed
---

# Guide "Vocabulary" articles: lead with the vocabulary + an example (example-code-first)

## Overview

The guide's **Vocabulary** sidebar section (defined in
`packages/guide/site.config.ts`, `LIBRARY_PACKAGES`) holds one article per
mid/toolchain package. Today the app-facing ones open **inconsistently and
rationale-first** — a reader meets *why the library exists* or *how its model is
architected* before ever seeing what the library gives them or what writing code
with it looks like:

| article | currently opens with |
| --- | --- |
| plgg-http, plgg-db-migration, plgg-cli, plgg-md, plgg-highlight | `## Why it exists` |
| plgg-server, plgg-foundry | `## The model` |
| plgg-router | `## plgg-router vs plgg-server's Routing` |
| plgg-view | `## What it is (and isn't)` |
| plgg-sql | `## One handler, one pipe` |
| plgg-fetch | `## Usage` (already ~example-first) |

None show code before the first `##`.

**Goal:** each app-facing Vocabulary article should first tell a developer
**what vocabulary the library offers** and **what it's like to write an
application with those terms — example code up front** — with the "why it
exists" / architecture material moved below.

**Template (chosen: Vocabulary → Example → Why):**

```
# plgg-x
<one-line what-it-is, unchanged>

## Vocabulary
<compact list of the terms the library gives you — the key
 exported names, grouped by concern; a glance, not the full API dump>

## Writing an app with it
<a representative, correct example using those terms — the
 first substantial thing after the intro>

## Why it exists / How it's organized / (existing deeper sections)
<the current rationale + architecture, moved DOWN unchanged>
```

## Scope

The **12 app-facing libraries** only:
plgg-http, plgg-router, plgg-server, plgg-fetch, plgg-view, plgg-sql,
plgg-db-migration, plgg-kit, plgg-foundry, plgg-cli, plgg-md, plgg-highlight.

**Leave as-is:** `plgg-bundle`, `plgg-test` (toolchain), and `example`
(already a tutorial) — the "writing an application by the terms" framing doesn't
fit them.

## Worked example — `packages/guide/packages/plgg-http.md`

*Before* (order): intro → `## Why it exists` (peer/extract-below diagram) →
`## How the model is organized` (the vocabulary) → …

*After* (order):

```
# plgg-http
The runtime-neutral HTTP model, built from scratch on plgg. …(one-liner kept)

## Vocabulary
- **method** — `Method`, `asMethod`/`isMethod`
- **status** — `HttpStatus`
- **request** — `HttpRequest` (`getHeader`/`getQuery`/`getParam`)
- **response** — `HttpResponse`, `ResponseBody`, `textResponse`/`jsonResponse`
- **failure** — `HttpError`, `notFound`/`badRequest`, `notFound$()`,
  `httpErrorToResponse`

## Writing an app with it
```ts
// a short, correct snippet building a request/response and
// matching an HttpError by name — using ONLY real exports
```

## Why it exists
<the existing peer / extract-below section, verbatim, moved here>

## How the model is organized
<kept below, or folded into Vocabulary if redundant>
```

The reused content is **moved, not rewritten** — preserve the existing prose,
diagrams, and cross-links; only the ORDER and the new `## Vocabulary` +
`## Writing an app with it` framing change.

## Key Files

- `packages/guide/packages/{plgg-http,plgg-router,plgg-server,plgg-fetch,
  plgg-view,plgg-sql,plgg-db-migration,plgg-kit,plgg-foundry,plgg-cli,plgg-md,
  plgg-highlight}.md` — the 12 articles.
- `packages/guide/site.config.ts` — no structural change needed (same leaves);
  touch only if a heading rename affects an in-page anchor link.
- `packages/guide/contributing/conventions.md` — if it documents article
  structure, record the new Vocabulary template there so future articles follow it.

## Implementation Steps

1. Do `plgg-http` first as the reviewable demo; confirm the shape reads right in
   the served guide before rolling on.
2. For each of the 12: add `## Vocabulary` (glance at the terms) and
   `## Writing an app with it` (example) at the top; move the existing
   `Why it exists` / model / comparison sections below, unchanged.
3. `plgg-fetch` is already example-first — light touch: add/rename a
   `## Vocabulary` glance and align headings to the template; keep its `## Usage`
   example as the "Writing an app with it" block.
4. Every code example must use **real exported names**, verified against that
   package's source/tests (no invented API). Prefer adapting a snippet that
   already exists lower in the article or in the package's README/specs.
5. Keep house doc conventions (`contributing/conventions.md`) and existing
   cross-links intact.

## Quality Gate

**Objective pass condition — from this worktree:**

1. **Structure:** for each of the 12 articles, the first `##` after the intro is
   `## Vocabulary`, immediately followed by `## Writing an app with it` whose
   body contains a fenced code block — and any `## Why it exists` / `## The
   model` / comparison section appears **after** those. Verifiable:
   `awk` shows the first fenced code block precedes the first
   `Why it exists`/`The model` heading in every file.
2. **Examples are real:** every new/opening code block references only names
   actually exported by that package (spot-check against `packages/<pkg>/src`),
   and reads as plausible app code following the plgg style (Option/Result,
   data-last, match by name).
3. **Guide builds & serves:** `./scripts/serve-guide.sh` from this worktree →
   container **Up**, `curl http://localhost:5181/packages/plgg-http` (and a
   couple of others) returns **200** with the reordered content; no broken
   in-page anchor links introduced (check any `#...` links whose target heading
   moved). Cleanup: `podman compose -f workloads/guide/compose.yaml down`.
4. **No content lost:** the rationale/architecture prose that existed before
   still exists (moved, not deleted) — a `git diff` shows reordering + the two
   new framing sections, not wholesale deletion of the old sections.

## Considerations

- This is presentation/order only — do not change what each library *does* or
  invent new API in prose.
- Toolchain articles (`plgg-bundle`, `plgg-test`, `example`) are intentionally
  out of scope; if a later pass wants them, it can adapt "example first" to
  tool/CLI usage.
- Record the template in `contributing/conventions.md` so the next Vocabulary
  article is authored example-first by default (prevents re-drift).
- No overlap with the `absorb-plggmatic` ticket — `plggmatic`/`plggpress`
  articles are separate sidebar sections, not part of Vocabulary.
