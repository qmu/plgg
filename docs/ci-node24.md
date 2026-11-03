# CI: move workflows to Node 24

Every package already declares `engines.node >=24`, and the repo root
pins `.nvmrc` to 24. The workflows under `.github/workflows` still
run Node 22 and cannot be edited by the automation, so a maintainer
needs to apply this change:

- `.github/workflows/run-tests.yml` line 26:
  `node-version: "22.x"` → `node-version: "24.x"`
- `.github/workflows/deploy-guide.yml` line 45:
  `node-version: "22.x"` → `node-version: "24.x"`

After the change, CI should run `sh scripts/tsc-plgg.sh` and
`sh scripts/test-plgg.sh` on Node 24. `scripts/typecheck.ts` uses each
package's own TypeScript (TS7 for most, TS6 for plgg-bundle and
plgg-test).
