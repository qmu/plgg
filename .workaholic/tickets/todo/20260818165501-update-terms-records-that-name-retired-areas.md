---
created_at: 2026-08-18T16:55:01+00:00
author: a@qmu.jp
assignees:
depends_on:
mission:
merge_policy: review
verification_handoff:
---

# Update terms records that still name the retired guides/ and specs/ areas

## Overview

The 2026-08-13 layout reshape retired the `.workaholic/guides/`, `policies/`
and `specs/` areas (an area with no writer in the loop goes stale and then
lies). Two hand-maintained records under `.workaholic/terms/` still describe
areas that no longer exist, and `report/scripts/area-freshness.sh` flags both
as naming a retired structure:

- `.workaholic/terms/artifacts.md` — its `## spec` section documents a
  `.workaholic/specs/` area (retired term: `specs`).
- `.workaholic/terms/file-conventions.md` — names both `guides` and `specs`
  (retired terms: `guides`, `specs`).

A record naming a thing that no longer exists is not "possibly stale", it is
wrong — the exact failure the reshape was performed to end. This ticket is the
work of bringing the two records back into line with the current concept:
rewrite or remove the passages describing the retired areas so the `terms/`
glossary describes only what the repository still has, keeping the English and
`_ja.md` copies in step.

Filed by the `/housekeep` doc-drift step (tick `20260818-165158`), which
reports drift and files it as work but never edits these hand-maintained
areas itself.

## Key Files

- `.workaholic/terms/artifacts.md` — remove/rewrite the `## spec` section
  (and its Japanese counterpart `artifacts_ja.md` if present).
- `.workaholic/terms/file-conventions.md` — rewrite the passages naming
  `guides` and `specs` (and its `_ja.md` counterpart).
- `report/scripts/area-freshness.sh` — the check that flags these; a clean
  run (`flagged: 0` for `terms/`) is the acceptance signal.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the
  `.workaholic/` layout these records describe; the fix must match the areas
  the repository actually carries after the 2026-08-13 reshape.
- `workaholic:development` — the change-history discipline: the record is
  edited to describe the current concept, not deleted to hide history, and the
  correction is a normal committed edit.

## Quality Gate

- `report/scripts/area-freshness.sh` reports `retired_terms: []` for both
  `.workaholic/terms/artifacts.md` and `.workaholic/terms/file-conventions.md`
  (the `terms/` area's `flagged` count returns to 0).
- No remaining prose in either record describes `.workaholic/guides/`,
  `policies/` or `specs/` as live areas.
- English and any `_ja.md` counterpart stay consistent (documentation-language
  constraint: English primary with `_ja.md` translation).

## Implementation Steps

1. Read `.workaholic/terms/artifacts.md` and rewrite the `## spec` section so
   it no longer presents `.workaholic/specs/` as a live area — describe the
   current home of that concept, or remove the section if it has none.
2. Read `.workaholic/terms/file-conventions.md` and rewrite every passage
   naming `guides` or `specs` the same way.
3. Update the matching `_ja.md` counterparts so the translations agree.
4. Run `report/scripts/area-freshness.sh` and confirm the `terms/` records
   report `retired_terms: []`.

## Considerations

- Scope is exactly these two records: `core-concepts.md` and
  `workflow-terms.md` were checked clean this tick and must not be churned.
- `terms/retired-terms.md`, if it exists, is a glossary *of* retired terms and
  names them by construction — do not "fix" a legitimate glossary of retired
  vocabulary.
- This is a documentation edit only; it touches no product code and no
  deployment surface.
