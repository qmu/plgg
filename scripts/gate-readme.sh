#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Canonical "every package is documented and reachable" gate. Enforces the
# top-to-bottom README hierarchy with grep + POSIX sh only (no npm dep, no
# markdown-link-check): every real package carries a README, the root README
# links down to each, every package README links back up to the root, and no
# relative link in any of those files dangles. Reused by scripts/check-all.sh so
# a PR that adds a package without wiring its docs fails the same command.
echo "=== Gate: package README coverage + linking ==="

ROOT="README.md"
fail=0

# A "real package" is any packages/*/ with a package.json (excludes stale dirs).
packages=$(
  for d in packages/*/; do
    [ -f "${d}package.json" ] && printf '%s\n' "${d%/}"
  done
)

# 1. PRESENCE — every real package has a README.md.
missing_readme=""
for p in $packages; do
  [ -f "$p/README.md" ] || missing_readme="$missing_readme ${p##*/}"
done
if [ -n "$missing_readme" ]; then
  echo "README GATE FAILED — packages missing README.md:$missing_readme"
  fail=1
fi

# 2. ROOT-LINK — the root README links down to each package (packages/<name>/).
unlinked=""
for p in $packages; do
  name=${p##*/}
  grep -qF "packages/${name}/" "$ROOT" || unlinked="$unlinked $name"
done
if [ -n "$unlinked" ]; then
  echo "README GATE FAILED — not linked from root $ROOT:$unlinked"
  fail=1
fi

# 3. BACK-LINK — every package README links back up to the root (bottom→top).
no_backlink=""
for p in $packages; do
  [ -f "$p/README.md" ] || continue
  grep -qF 'plgg monorepo](../../README.md)' "$p/README.md" \
    || no_backlink="$no_backlink ${p##*/}"
done
if [ -n "$no_backlink" ]; then
  echo "README GATE FAILED — no ../../README.md back-link in:$no_backlink"
  fail=1
fi

# 4. DEAD-LINK — every relative markdown link in the root + package READMEs
# resolves to a path on disk (catches ../../README.md, ../../LICENSE, cross-
# package links, and links to source files).
readmes="$ROOT"
for p in $packages; do
  [ -f "$p/README.md" ] && readmes="$readmes $p/README.md"
done
broken=$(
  for f in $readmes; do
    dir=${f%/*}
    [ "$dir" = "$f" ] && dir="."
    grep -oE '\]\([^)]+\)' "$f" 2>/dev/null | while IFS= read -r m; do
      t=${m#\](}
      t=${t%)}
      case "$t" in
        http://*|https://*|\#*|mailto:*|//*) continue ;;
      esac
      path=${t%%#*}
      [ -z "$path" ] && continue
      [ -e "$dir/$path" ] || printf '  %s -> %s\n' "$f" "$t"
    done
  done
)
if [ -n "$broken" ]; then
  echo "README GATE FAILED — broken relative links:"
  echo "$broken"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "readme gate passed (every package documented, linked top-to-bottom, no dead links)"
