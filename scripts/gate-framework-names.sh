#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd "$REPO_ROOT"

# Framework-name gate (mission make-the-column-strip-a-real-navigation-surface,
# ticket 20260728091000). plggmatic owns the `pm-*` namespace: its layout class
# hooks (pm-row / pm-col / pm-pane), its component hooks (pm-theme-toggle,
# pm-sun, pm-moon), its custom-property prefix (--pm-*), and the data attributes
# its navigation runtime steers by (data-pm-strip / data-pm-column /
# data-pm-span). A CONSUMER that types one of those strings by hand has a
# contract no compiler checks: rename the prefix upstream and the consumer keeps
# compiling while its pages quietly break.
#
# So: a consumer names a framework hook by IMPORT, or not at all. Every one of
# them is exported (rowClass, colClass, paneClass, themeToggleClass, sunClass,
# moonClass, cssPrefix, stripAttr, columnAttr, spanAttr, navHookName), and this
# gate fails the build if a `pm-` literal appears in a consumer's CODE.
#
# PROSE IS FINE. A comment naming the framework is documentation, not a
# contract, so lines whose `pm-` occurrence sits inside a comment are ignored —
# that is what the `//` / `*` / `/*` filter below does. The test is deliberately
# crude and deliberately noisy in the safe direction: a false positive is fixed
# by importing the constant, which is what we wanted anyway.
echo "=== Gate: framework names are imported, never typed ==="

# SCOPE. plggpress — the product this mission made a consumer of the framework's
# navigation runtime. plggmatic-example, the framework's own demo app, still
# types component hooks the framework does not export at all (pm-btn, pm-dialog,
# pm-toast-*); exporting those and cleaning it up is its own ticket
# (20260728100000), and until then adding it here would only make the gate a
# thing to disable.
CONSUMERS="packages/plggpress/src"
FOUND=0

for dir in $CONSUMERS; do
  [ -d "$dir" ] || continue
  # Every `pm-` occurrence, minus the ones inside a line comment or a block
  # comment's continuation, minus this gate's own documentation.
  hits=$(grep -rn -- "pm-" "$dir" --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v ':[[:space:]]*//' \
    | grep -v ':[[:space:]]*\*' \
    | grep -v ':[[:space:]]*/\*' \
    || true)
  if [ -n "$hits" ]; then
    echo "$hits"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  cat <<'MSG'

A consumer typed one of plggmatic's own names.

Import it instead — every hook the framework guarantees is exported:

  rowClass / colClass / paneClass      the layout skeleton
  themeToggleClass / sunClass / moonClass   the appearance toggle
  cssPrefix                            the --pm-* custom-property prefix
  stripAttr / columnAttr / spanAttr    the navigation runtime's markers
  navHookName                          the runtime's entry point

MSG
  exit 1
fi

echo "OK: no consumer types a plggmatic name"
