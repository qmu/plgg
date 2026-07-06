#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

# The canonical per-package npm publisher (Local CI/CD Execution policy:
# releases are repository scripts run from /ship, bracketed by online
# verification against the registry — the registry IS production here).
#
#   ./scripts/publish-npm.sh              # gate (check-all.sh) + publish + verify
#   SKIP_GATE=1 ./scripts/publish-npm.sh  # skip the gate when one just ran green
#
# Per package, in build.sh's dependency order (a dependency must be on the
# registry before its dependents' rewritten ranges can resolve):
#   private? skip -> publish-if-newer (local > registry, else skip) ->
#   stage copy (files allowlist; the working tree is NEVER mutated) ->
#   file:-dep rewrite to ^<local version> -> npm publish ->
#   verify: npm view resolves, then a scratch-dir install + import/bin smoke.
# Re-running immediately is an all-skip no-op.
#
# Auth: the ambient ~/.npmrc of the executing host only — never committed,
# never echoed. No --provenance (it requires hosted-CI OIDC; declined per the
# local-first stance, the same trade-off the GitHub Release contract makes).

if [ "${SKIP_GATE:-0}" != "1" ]; then
  echo "=== Gate: fresh check-all.sh before any publish ==="
  ./scripts/check-all.sh
fi

# The publish order IS build.sh's topology — derived, never forked (the
# deploy-guide.yml PR #51 drift incident is why). plgg-bundle is prepended:
# it sits outside that list and has no file: runtime deps.
ORDER="plgg-bundle $(sed -n 's|^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$|\1|p' scripts/build.sh)"

STAGE_ROOT=$(mktemp -d "$REPO_ROOT/.publish-stage.XXXXXX")
trap 'rm -rf "$STAGE_ROOT"' EXIT INT TERM

PUBLISHED=""
SKIPPED=""

for PKG in $ORDER; do
  DIR="$REPO_ROOT/packages/$PKG"
  NAME=$(node -p "require('$DIR/package.json').name")
  VERSION=$(node -p "require('$DIR/package.json').version")
  PRIVATE=$(node -p "require('$DIR/package.json').private === true")

  if [ "$PRIVATE" = "true" ]; then
    echo "=== $NAME: private - never published ==="
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
  if [ "$NEWER" != "yes" ]; then
    echo "=== $NAME: registry $REMOTE >= local $VERSION - skip (publish-if-newer) ==="
    SKIPPED="$SKIPPED $NAME@$VERSION"
    continue
  fi

  echo "=== $NAME: staging $VERSION (registry: $REMOTE) ==="
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
