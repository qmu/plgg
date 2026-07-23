---
title: plgg GitHub Release (script-driven from /ship)
environment: production
confirmation_method: api-probe
url: https://github.com/qmu/plgg/releases
---

# Deployment: plgg GitHub Release

Releases are **script-driven from the `/ship` flow**, per the local CI/CD
policy (hosted CD removed 2026-07-03; formerly the CalVer pair
`prepare-release.yml` + `release.yml`, whose deploy step was always a
placeholder — the pair only published tags/notes).

## Procedure

At ship time (post-merge step of the `/ship` flow):

1. `workaholic:write-release-note` writes `.workaholic/release-notes/<branch>.md` (pre-merge, committed to the branch).
2. `publish-release.sh <branch> <merge-commit> <tag> <notes-file>` creates the GitHub Release targeting the merge commit. With no CI publisher present, the script publishes directly (its `ci_publishes` scan finds nothing to defer to).

**Tag scheme** (continues the historical CalVer line): `YYYY.MM.weekN.releaseM` —
`N` = week-of-month of the merge date (`floor((day-1)/7)+1`), `M` = 1 + the count
of existing releases whose tag contains the same `YYYY.MM.weekN` prefix
(`gh release list`). Example: the second release in the first week of July 2026
is `2026.07.week1.release2`.

## Confirmation

Post-publish: `gh release view <tag>` succeeds and shows the release note body;
the release appears at https://github.com/qmu/plgg/releases with the merge
commit as target. A `reason: "already_exists"` from the script is a safe no-op,
not a failure.

## Notes

- The orphaned `release` branch and `release-candidate` label on GitHub are
  remnants of the removed hosted flow; they are inert and may be deleted at
  leisure.
- Never publish manually outside `/ship`; the note file is the release body's
  single source.
