# Packed plgg-test failure control

After `./scripts/build.sh`, run:

```sh
npx --yes --package=node@24 node scripts/gate-test-npm-failure.mjs
```

`check-all.sh` runs this command after building. Node 24 is mandatory,
including when the parent CI process runs Node 22; npm registry access is
required for Node and the consumer's TypeScript installation. No skip path
or package publishing is involved.

For qmu/plgg#172, PRs qmu/plgg#183 and qmu/plgg#186 already exercise
successful candidate CLI execution; qmu/plgg#186 owns consumer typechecking,
and qmu/plgg#195 owns the live registry gate. This complementary control
proves that the candidate's packed CLI propagates a discovered assertion
failure on Node 24 beside consumer TypeScript 7. It does not certify a
registry release or replace those gates.

The control stages plgg and plgg-test using the publisher's allowlist and
manifest rewrite, packs both, and installs them outside the workspace.
It checks compiler resolution from the actual compiled hook's location,
then runs an enum test with expected value 42 (exit 0, one pass) and 41
(exit 1, one failure bearing the test's name). A loader crash, zero
discovery, or CLI that swallows failure cannot satisfy those assertions.
Temporary files are removed even on failure; child install/pack output is
suppressed. The compiled dists must exist before running the control.
