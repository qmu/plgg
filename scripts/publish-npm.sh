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
#   ONLY=plgg-cms ./scripts/publish-npm.sh # publish only the named package(s),
#                                         # comma- or space-separated, still via
#                                         # the same gate/stage/verify path
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
ORDER="plgg-bundle $(sed -n 's|^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$|\1|p' scripts/build.sh | tr '\n' ' ')"
ONLY_PACKAGES=$(printf '%s' "${ONLY:-}" | tr ',' ' ')

contains_word() {
  WORD="$1"
  LIST="$2"
  case " $LIST " in
    *" $WORD "*) return 0 ;;
    *) return 1 ;;
  esac
}

if [ -n "$ONLY_PACKAGES" ]; then
  for REQUESTED in $ONLY_PACKAGES; do
    if ! contains_word "$REQUESTED" "$ORDER"; then
      echo "!!! ONLY requested unknown package directory: $REQUESTED"
      echo "    Choose one of: $ORDER"
      exit 1
    fi
  done
fi

# === Preflight: compute the publish set (local version > registry) up front ===
# Delegated to scripts/publish.ts: ONE Node process that reads every
# package.json in-process and issues the registry-version queries
# CONCURRENTLY (was: a serial per-package `npm view` + ~3 `node -p` fork storm,
# tens of seconds of banner spew). It prints the structured PUBLISH/SKIP/private
# summary and writes the publish-set dirs (build.sh's topology, in order) to
# $SET_FILE for the staging loop below. Read-only: no build, no publish. This is
# the source of truth for what the real run publishes and — via PREFLIGHT=1 —
# what /ship inspects to decide whether to ask the developer.
echo "=== Preflight: comparing local vs registry versions ==="
if [ -n "$ONLY_PACKAGES" ]; then
  echo "=== Publish filter: ONLY=$ONLY_PACKAGES ==="
fi
SET_FILE=$(mktemp "$REPO_ROOT/.publish-set.XXXXXX")
if [ -n "$ONLY_PACKAGES" ]; then
  node scripts/publish.ts --preflight --set-out "$SET_FILE" --only "$ONLY_PACKAGES"
else
  node scripts/publish.ts --preflight --set-out "$SET_FILE"
fi
PUBLISH_SET=$(cat "$SET_FILE")
rm -f "$SET_FILE"

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

if ! NPM_USER=$(npm whoami 2>/dev/null); then
  echo "!!! npm publish requires an authenticated npm session."
  echo "    Run npm login, then retry this script."
  exit 1
fi
echo "=== npm auth: publishing as $NPM_USER ==="

# Gate: a fresh green check-all before publishing anything. Skipped without a
# human having to remember anything when a same-session check-all already went
# green and its stamp still matches the current tree (any tracked edit since
# invalidates it). SKIP_GATE=1 remains an explicit unconditional override.
if [ "${SKIP_GATE:-0}" = "1" ]; then
  echo ""
  echo "=== Gate: skipped (SKIP_GATE=1 override) ==="
elif STAMP=$(node "$REPO_ROOT/scripts/gateStamp.ts" check 2>/dev/null); then
  echo ""
  echo "=== Gate: skipped (same-session green $STAMP) ==="
else
  echo ""
  echo "=== Gate: running check-all.sh ==="
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
  # prepublishOnly/prepare/prepack/publish/postpublish script (for example, a
  # retired package hook that ran plgg-bundle in the staging copy and aborted
  # the whole run with exit 127).
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
      *ERR_MODULE_NOT_FOUND* | *"Cannot find"* | *ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING*)
        # A run-from-source `.ts` launcher that Node refuses to type-strip under
        # node_modules is unusable when installed — the launcher must relocate
        # out of node_modules (see each tool's bin/relocate.mjs) or run from a
        # compiled dist. Fail the publish instead of shipping a broken bin.
        echo "!!! $NAME bin cannot run from a real install:"
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
echo "\n=== All shell scripts have been executed successfully ==="
