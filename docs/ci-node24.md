# CI: move workflows to Node 24

The repo pins Node >=24 (`.nvmrc`, every `engines.node`, both
Dockerfiles use `node:24-slim`). Two workflows still run 22.x.
Change `node-version` in each:

- `.github/workflows/run-tests.yml` (line ~26):
  `node-version: "22.x"` -> `node-version: "24.x"`
- `.github/workflows/deploy-guide.yml` (line ~45):
  `node-version: "22.x"` -> `node-version: "24.x"`

Or use `node-version-file: .nvmrc` in both so CI follows the pin.
