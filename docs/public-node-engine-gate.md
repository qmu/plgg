# Public tarball Node engine gate

After `npm ci`, run one command from the repository root:

```sh
node scripts/publicNodeEngine.ts
# Pin a published version for repeatable investigation:
node scripts/publicNodeEngine.ts 0.0.1
```

This network-dependent gate downloads **plgg-fetch** from the public npm
registry, without installing dependencies or executing package lifecycle
scripts. It reads `package/package.json` directly from the downloaded archive,
then compares `engines.node` with the actual `process.versions.node` using npm
semver rules. It never substitutes workspace metadata or a caller-supplied
runtime version. `npm` and `tar` must be available on PATH.

Exit 0 means the declared range accepts the running Node version. Exit 1 means
an incompatible runtime, absent/invalid engine declaration, invalid selector,
or download/archive failure. Diagnostics identify the package version, runtime
and range on a mismatch. Temporary downloads are removed even on failure;
captured npm output is suppressed so it cannot leak credentials.

At implementation time, the public `plgg-fetch@0.0.1` tarball has no
`engines.node`, so it is deliberately rejected. A publisher must determine and
publish a supported Node range before that version can pass; this gate does
not invent a range or republish an existing version. A passing result certifies
only the engine declaration, not runtime behavior, TypeScript compatibility or
transitive dependencies. This is an explicit registry check, not an automatic
network dependency in `check-all.sh`. Its offline regression tests are picked
up by the existing `node --test scripts/*.spec.ts` gate.

The scope avoids the existing plgg, plgg-md, plgg-test, plgg-parser and
plgg-bundle consumer PRs and the family-wide candidate staging gate. It does
not close their issues or claim a Node 24-only policy: a range can support
multiple Node majors.
