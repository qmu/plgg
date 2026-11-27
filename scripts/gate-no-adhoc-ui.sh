#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Gate: no one-off UI outside plggmatic.
#
# A UI part exists once: as a standardized plggmatic component with its sheet
# in the guide. A package that builds on plggmatic styles NOTHING of its own —
# a class it defines in a stylesheet is a part the kit does not know about,
# which is how the family's look drifts and how the kit's gaps stay hidden.
#
# This gate reads every stylesheet the UI packages carry and lists the class
# names they define. Each must be in scripts/adhoc-ui-allowlist.txt, the
# record of what was already there when the rule was made:
#
#   - a class NOT in the list fails the gate: add the part to plggmatic (the
#     component, its two CSS halves, its spec, its guide sheet) and use that;
#   - a class in the list that is NO LONGER defined fails too: delete its
#     line, so the list only ever shrinks.
#
# What is not a UI part — the diagram's own picture (a node, a wire, a shadow)
# — is in the list marked `drawing`, and stays.
LIST=scripts/adhoc-ui-allowlist.txt
FOUND=$(mktemp) ; KNOWN=$(mktemp)
trap 'rm -f "$FOUND" "$KNOWN"' EXIT

echo "=== Gate: no one-off UI outside plggmatic ==="
for PKG in plgg-ir-diagram plggpress plggmatic-example plgg-flow-example; do
  find "packages/$PKG" \
    \( -name node_modules -o -name dist \) -prune -o -type f \
    \( -name '*Css.ts' -o -name '*Styles.ts' -o -name 'catalog-main.ts' \
       -o -name 'flow.ts' -o -name '*.css' \) -print |
  while read -r FILE; do
    perl -ne 'print "$1\n" while /(?<![\w\$\}\/\)\]])\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?=[\s{,:.\[>+~)])/g' "$FILE" |
      grep -v -E '^(ts|js|md|css|html|es|cjs|d)$' |
      sed "s|^|$PKG |"
  done
done | sort -u > "$FOUND"

sed -e 's/[[:space:]]*#.*$//' -e '/^$/d' "$LIST" | awk '{print $1" "$2}' | sort -u > "$KNOWN"

NEW=$(comm -23 "$FOUND" "$KNOWN")
GONE=$(comm -13 "$FOUND" "$KNOWN")
if [ -n "$NEW" ]; then
  echo "FAIL: one-off UI classes that plggmatic does not own:"
  echo "$NEW" | sed 's/^/  /'
  echo "Add the part to plggmatic and use it; do not style it here."
fi
if [ -n "$GONE" ]; then
  echo "FAIL: listed one-offs that are gone — delete their lines from $LIST:"
  echo "$GONE" | sed 's/^/  /'
fi
[ -z "$NEW" ] && [ -z "$GONE" ] || exit 1
echo "OK: $(wc -l < "$KNOWN" | tr -d ' ') listed one-offs, none new"
