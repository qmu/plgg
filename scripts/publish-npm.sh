#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# The canonical per-package npm publisher (Local CI/CD Execution policy:
# releases are repository scripts run from /ship, bracketed by online
# verification against the registry — the registry IS production here).
#
# npm publishing is a DEVELOPER-DRIVEN step: at /ship the agent runs the
# read-only preflight to detect a pending publish and asks the developer to run
# this script themselves — it never publishes on the developer's behalf.
#
#   PREFLIGHT=1 ./scripts/publish-npm.sh  # report the publish set only; NO gate,
#                                         # NO publish (what /ship runs to decide
#                                         # whether to prompt the developer)
#   ./scripts/publish-npm.sh              # preflight -> gate (check-all.sh) ->
#                                         # publish the bumped set -> verify
#   SKIP_GATE=1 ./scripts/publish-npm.sh  # skip the gate when one just ran green
#
# Efficiency: the preflight computes the publish set (local > registry) up front
# and prints it, so a run with nothing bumped is a no-op that NEVER builds/gates,
# and a real run stages/publishes ONLY the bumped packages (in build.sh's
# dependency order — a dependency must be on the registry before its dependents'
# rewritten ranges can resolve).
#
# Per published package:
#   stage copy (files allowlist; the working tree is NEVER mutated) ->
#   file:-dep rewrite to ^<local version> -> npm publish ->
#   verify: npm view resolves, then a scratch-dir install + import/bin smoke.
# Re-running immediately is an all-skip no-op.
#
# Auth: the ambient ~/.npmrc of the executing host only — never committed,
# never echoed. No --provenance (it requires hosted-CI OIDC; declined per the
# local-first stance, the same trade-off the GitHub Release contract makes).

# The publish order IS build.sh's topology — derived, never forked (the
# deploy-guide.yml PR #51 drift incident is why). plgg-bundle is prepended:
# it sits outside that list and has no file: runtime deps.
ORDER="plgg-bundle $(sed -n 's|^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$|\1|p' scripts/build.sh)"

# === Preflight: compute the publish set (local version > registry) up front ===
# Read-only: one `npm view` per package, no build, no publish. This is the
# source of truth for what the real run below will publish, and — via
# PREFLIGHT=1 — what /ship inspects to decide whether to ask the developer.
echo "=== Preflight: comparing local vs registry versions ==="
PUBLISH_SET=""
SKIPPED=""
PRIVATE_SKIPPED=""

for PKG in $ORDER; do
  DIR="$REPO_ROOT/packages/$PKG"
  NAME=$(node -p "require('$DIR/package.json').name")
  VERSION=$(node -p "require('$DIR/package.json').version")
  PRIVATE=$(node -p "require('$DIR/package.json').private === true")

  if [ "$PRIVATE" = "true" ]; then
    PRIVATE_SKIPPED="$PRIVATE_SKIPPED $NAME"
    continue
  fi

  REMOTE=$(npm view "$NAME" version 2>/dev/null || echo "none")
  NEWER=$(node -e "
    const l = '$VERSION'.split('.').map(Number);
    const r = '$REMOTE' === 'none' ? [-1, 0, 0] : '$REMOTE'.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const a = l[i] || 0, b = r[i] || 0;
      if (a > b) { console.log('yes'); process.exit(0); }
      if (a < b) break;
    }
    console.log('no');
  ")
  if [ "$NEWER" = "yes" ]; then
    PUBLISH_SET="$PUBLISH_SET $PKG"
    echo "  PUBLISH  $NAME  $REMOTE -> $VERSION"
  else
    SKIPPED="$SKIPPED $NAME@$VERSION"
  fi
done

echo ""
echo "=== Preflight summary ==="
if [ -n "$PUBLISH_SET" ]; then
  for PKG in $PUBLISH_SET; do
    NAME=$(node -p "require('$REPO_ROOT/packages/$PKG/package.json').name")
    VERSION=$(node -p "require('$REPO_ROOT/packages/$PKG/package.json').version")
    echo "  will publish: $NAME@$VERSION"
  done
else
  echo "  will publish: (none)"
fi
echo "  skip (already current):${SKIPPED:- (none)}"
echo "  private (never):${PRIVATE_SKIPPED:- (none)}"

# PREFLIGHT mode: report only — never gate, never publish. This is what /ship
# runs to decide whether to prompt the developer (a non-empty publish set means
# "pause and ask the developer to publish"; empty means "nothing to publish").
if [ "${PREFLIGHT:-0}" = "1" ]; then
  echo ""
  if [ -n "$PUBLISH_SET" ]; then
    echo "=== Preflight: $(echo $PUBLISH_SET | wc -w | tr -d ' ') package(s) ready to publish ==="
  else
    echo "=== Preflight: nothing to publish ==="
  fi
  echo "\n=== All shell scripts have been executed successfully ==="
  exit 0
fi

# Gate/build de-dup: nothing bumped => no publish => skip the gate entirely
# (no point rebuilding + running the whole test suite for a no-op release).
if [ -z "$PUBLISH_SET" ]; then
  echo ""
  echo "=== Nothing to publish (no version bumped past the registry) — done. ==="
  echo "\n=== All shell scripts have been executed successfully ==="
  exit 0
fi

# Gate: a fresh green check-all before publishing anything (skipped only when a
# same-session run already went green and set SKIP_GATE).
if [ "${SKIP_GATE:-0}" != "1" ]; then
  echo ""
  echo "=== Gate: fresh check-all.sh before publishing ==="
  ./scripts/check-all.sh
fi

STAGE_ROOT=$(mktemp -d "$REPO_ROOT/.publish-stage.XXXXXX")
trap 'rm -rf "$STAGE_ROOT"' EXIT INT TERM

PUBLISHED=""

# Publish only the bumped set, in build.sh's dependency order (the preflight
# already resolved local > registry, so no re-check here).
for PKG in $PUBLISH_SET; do
  DIR="$REPO_ROOT/packages/$PKG"
  NAME=$(node -p "require('$DIR/package.json').name")
  VERSION=$(node -p "require('$DIR/package.json').version")

  echo "=== $NAME: staging $VERSION ==="
  STAGE="$STAGE_ROOT/$PKG"
  node - "$DIR" "$STAGE" <<'EOS'
const fs = require("node:fs");
const path = require("node:path");
// argv: [node, "-", dir, stage] — "-" (read program from stdin) occupies argv[1]
const [dir, stage] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
// Rewrite every file: cross-dep to a caret range on the linked package's
// local version. devDependencies ride along rewritten (consumers never
// install them, but a file: specifier must not survive anywhere).
for (const key of ["dependencies", "devDependencies"]) {
  const deps = pkg[key];
  if (!deps) continue;
  for (const [name, spec] of Object.entries(deps)) {
    if (!String(spec).startsWith("file:")) continue;
    const linked = path.resolve(dir, String(spec).slice(5), "package.json");
    deps[name] = "^" + JSON.parse(fs.readFileSync(linked, "utf8")).version;
  }
}
const out = JSON.stringify(pkg, null, 2) + "\n";
if (out.includes('"file:')) {
  console.error("file: specifier survived the rewrite");
  process.exit(1);
}
fs.mkdirSync(stage, { recursive: true });
for (const entry of [...(pkg.files || []), "README.md", "LICENSE"]) {
  const from = path.join(dir, entry);
  if (fs.existsSync(from))
    fs.cpSync(from, path.join(stage, entry), { recursive: true });
}
fs.writeFileSync(path.join(stage, "package.json"), out);
EOS

  echo "=== $NAME@$VERSION: publishing ==="
  # --tag latest is EXPLICIT: plgg's registry history carries a live 1.0.0
  # (2025-06) above the current 0.0.x line with latest deliberately
  # re-pointed below it, and npm refuses to implicitly tag a lower version.
  # For every other package the explicit tag is what implicit would do.
  # --ignore-scripts: the dist is already built by build.sh before staging,
  # so no package needs a publish-time lifecycle hook. This immunizes the
  # family-publish flow against any staged package's stray
  # prepublishOnly/prepare/prepack/publish/postpublish script (e.g.
  # plggmatic's old `publish` hook that ran plgg-bundle in the staging copy
  # → exit 127 and aborted the whole run).
  (cd "$STAGE" && npm publish --tag latest --ignore-scripts)

  echo "=== $NAME@$VERSION: verify - registry resolves ==="
  TRIES=0
  until [ "$(npm view "$NAME@$VERSION" version 2>/dev/null || true)" = "$VERSION" ]; do
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge 30 ]; then
      echo "!!! $NAME@$VERSION not resolvable on the registry after $TRIES tries"
      exit 1
    fi
    sleep 2
  done

  echo "=== $NAME@$VERSION: verify - scratch install + smoke ==="
  SMOKE="$STAGE_ROOT/smoke-$PKG"
  mkdir -p "$SMOKE"
  # min-release-age (set in ~/.npmrc) would block installing a package
  # published seconds ago; the smoke consumer overrides it for this install.
  (cd "$SMOKE" && npm init -y >/dev/null 2>&1 \
    && npm_config_min_release_age=0 npm install "$NAME@$VERSION" >/dev/null)
  # Import smoke only when the package declares an importable surface —
  # bin-only tools (plgg-bundle: no main/exports; its CLI runs from src via
  # its own resolver hook) are exercised through their bin below instead.
  IMPORTABLE=$(node -p "const p=require('$DIR/package.json'); Boolean(p.main || p.exports)")
  if [ "$IMPORTABLE" = "true" ]; then
    (cd "$SMOKE" && node -e "
      import('$NAME').then(
        () => console.log('    import ok'),
        (e) => { console.error(e); process.exit(1); },
      )")
  else
    echo "    no importable surface (bin-only) - import smoke skipped"
  fi
  if [ -e "$SMOKE/node_modules/.bin/$NAME" ]; then
    BIN_OUT=$("$SMOKE/node_modules/.bin/$NAME" --help 2>&1 || true)
    case "$BIN_OUT" in
      *ERR_MODULE_NOT_FOUND* | *"Cannot find"*)
        echo "!!! $NAME bin cannot resolve its modules from a real install:"
        echo "$BIN_OUT"
        exit 1
        ;;
      *)
        echo "    bin ok"
        ;;
    esac
  fi
  PUBLISHED="$PUBLISHED $NAME@$VERSION"
done

echo ""
echo "=== Published:${PUBLISHED:- (none)} ==="
echo "=== Skipped (already current):${SKIPPED:- (none)} ==="
echo "\n=== All shell scripts have been executed successfully ==="
