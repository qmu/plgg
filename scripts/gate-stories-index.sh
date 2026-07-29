#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: every branch story is reachable from the stories index.
#
# `.workaholic/stories/index.md` is the OKF navigation index for the stories
# area, and unlike the other area indexes it is REPORT-MAINTAINED — the okf
# refresh script links it but never writes it (see okf/scripts/refresh-index.sh:
# "stories/index.md (report-maintained) ... are linked, never written"). That
# ownership split is deliberate: a story's one-line description is editorial,
# not derivable from disk. The cost is that a `/report` run which writes the
# story file but forgets its index entry drifts silently, and nothing notices.
#
# It drifted: eight stories written between 2026-07-03 and 2026-07-19 existed on
# disk with no entry, spread across the whole period rather than clustered
# before some convention change — so this is a recurring miss, not a one-off
# migration. This gate is the cheap check that makes the next miss fail the
# build instead of accumulating.
#
# Deliberately one-directional: it requires an entry for every story file, and
# says nothing about the entry's wording. An entry naming a file that does not
# exist is also reported, since that is a dead link in a navigation index.
echo "=== Gate: stories index covers every story ==="

INDEX=".workaholic/stories/index.md"
fail=0

if [ ! -f "$INDEX" ]; then
    echo "  MISSING  $INDEX"
    echo "stories-index gate FAILED"
    exit 1
fi

for f in .workaholic/stories/*.md; do
    base=$(basename "$f")
    [ "$base" = "index.md" ] && continue
    # The entry form is the OKF index line: * [<file>](<file>) - <description>
    if ! grep -q "\[$base\]" "$INDEX"; then
        echo "  UNLISTED  $base"
        fail=1
    fi
done

# The other direction: a listed file that is not on disk is a dead link.
listed=$(grep -oE '\[work-[0-9]{8}-[0-9]{6}\.md\]' "$INDEX" | tr -d '[]' | sort -u || true)
for base in $listed; do
    if [ ! -f ".workaholic/stories/$base" ]; then
        echo "  DEAD LINK  $base (listed, no such file)"
        fail=1
    fi
done

if [ "$fail" -ne 0 ]; then
    echo ""
    echo "stories-index gate FAILED — add the missing entry to $INDEX:"
    echo "  * [<branch>.md](<branch>.md) - <one line on what the branch did>"
    echo "(the description is editorial, which is why this file is written by"
    echo " /report rather than generated from disk)"
    exit 1
fi

count=$(find .workaholic/stories -name '*.md' ! -name 'index.md' | wc -l | tr -d ' ')
echo "stories-index gate passed ($count stories, all listed, no dead entries)"
