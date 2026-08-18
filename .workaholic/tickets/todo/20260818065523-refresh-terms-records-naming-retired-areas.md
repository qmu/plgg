---
created_at: 2026-08-18T06:55:23+00:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy:
verification_handoff:
---

# Refresh the terms records that still name retired `.workaholic/` areas

## Overview

`report/scripts/area-freshness.sh` flags two hand-maintained records in `.workaholic/terms/` as
naming areas this repository's layout no longer lists: `artifacts.md` names `specs`, and
`file-conventions.md` names `guides` and `specs`. Both were last committed 2026-07-13 (35 days
stale at filing). `.workaholic/guides/` does not exist in this checkout at all; `.workaholic/specs/`
does exist and holds content, so the two names are **not** the same case and the ticket must not
assume they are.

Filed by the housekeep tick 20260818-065217 (`doc-drift` step). The tick files, it does not edit:
these two records are hand-maintained and a machine rewriting them hourly is exactly what the
step's bound refuses.

The drift is not limited to the two flagged names — the same paragraph carries several other
statements the repository has moved past, and they should be settled in the same pass rather than
re-flagged tick after tick:

- `file-conventions.md:31` enumerates the `.workaholic/` subdirectories as `constraints/`,
  `guides/`, `specs/`, `terms/`, `tickets/`. The tree today also holds `deployments/`,
  `feedbacks/`, `missions/`, `policies/`, `release-notes/`, `scan-allow/`, `stories/` and
  `trips/`, and holds no `guides/`.
- The same paragraph names the plugin as `core@workaholic` and its skills as `write-spec`,
  `write-terms`, `translate` — none of which is the current namespace or skill set.
- `artifacts.md:19` defines `spec` against `.workaholic/specs/` with a `commit_hash` frontmatter
  field; `commit_hash` is one of the five fields retired from the ticket schema on 2026-08-07.
- `artifacts.md`'s `## changelog` section asserts that all three packages carry Unreleased entries
  and that this blocks "the release candidate PR #6" — a point-in-time claim, not a definition.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the records under change are
  the ones that *describe* the conventional layout, so the layout policy is the thing they must be
  made to agree with.
- `workaholic:implementation` / `policies/objective-documentation.md` — a glossary entry that
  names a directory the repository does not have is not checkable; the repair is to make each
  statement verifiable against the tree.

## Key Files

- `.workaholic/terms/file-conventions.md` — flagged for `guides` and `specs`; line 31 carries the
  area enumeration, the plugin name and the skill list.
- `.workaholic/terms/artifacts.md` — flagged for `specs`; the `## spec` and `## changelog`
  sections are the drifted ones.
- `.workaholic/terms/artifacts_ja.md`, `.workaholic/terms/file-conventions_ja.md` — the records
  claim a `_ja.md` counterpart is required for every file; whatever is decided in English has to
  land in the Japanese counterpart in the same change, or the claim itself has to go.
- `.workaholic/terms/index.md`, `.workaholic/terms/README.md` — regenerate if the set of defined
  terms changes.
- `plugins/workaholic/skills/report/scripts/area-freshness.sh` — the flagger; its retired-name
  list is what decides whether this ticket's outcome clears the flag.

## Implementation Steps

1. Settle the prior question first, because every edit below depends on it: **is
   `.workaholic/specs/` retired in this repository, or retained?** `area-freshness.sh` treats
   `specs` as a de-listed area, and the directory is present with content. Retiring the name while
   the directory stands, or keeping the name while the flagger calls it retired, are both
   half-states. This is a human's call — do not infer it from the flagger.
2. Resolve `guides` the same way — there is no `.workaholic/guides/` here, so the enumeration in
   `file-conventions.md:31` is simply wrong and the name comes out.
3. Rewrite the `.workaholic/` enumeration in `file-conventions.md` against the actual tree, and
   replace the `core@workaholic` / `write-spec` / `write-terms` / `translate` naming with the
   current plugin namespace and skills.
4. Bring `artifacts.md`'s `## spec` section in line with step 1's ruling, and drop `commit_hash`
   from the fields it lists as conventional.
5. Replace `artifacts.md`'s `## changelog` point-in-time claim (three Unreleased entries blocking
   PR #6) with the standing rule, so the definition stops decaying.
6. Mirror every change into the `_ja.md` counterparts and refresh the terms index.
7. Re-run `area-freshness.sh` and confirm both records leave the flagged set.

## Quality Gate

**Acceptance criteria**

- `bash plugins/workaholic/skills/report/scripts/area-freshness.sh` reports `flagged: 0` for the
  `terms` area — `artifacts.md` and `file-conventions.md` each carry `retired_terms: []`.
- Every `.workaholic/` subdirectory named in `file-conventions.md` exists in the tree, and every
  subdirectory in the tree that the record's enumeration is meant to cover is named.
- No record names `core@workaholic`, `write-spec`, `write-terms` or `translate`.
- `artifacts.md` contains no point-in-time release-state claim (no "currently", no PR number as a
  live blocker).
- Each edited English record's `_ja.md` counterpart carries the same changes.

**Verification method**

- `bash plugins/workaholic/skills/report/scripts/area-freshness.sh | jq '.areas.terms'` — read the
  `retired_terms` array of both records.
- `ls .workaholic/` diffed by hand against the enumeration in `file-conventions.md`.
- `grep -rn "core@workaholic\|write-spec\|write-terms\|translate" .workaholic/terms/` returns
  nothing.

**Gate**

- The flagger is clean for `terms`, the English and Japanese records agree, and step 1's ruling on
  `.workaholic/specs/` is recorded in the pull request rather than left implicit in the diff.
