# Public plgg-test consumer gate

On Node 24, run:

```sh
sh scripts/test-plgg.sh --public-plgg-test
# Reproduce a specific public release:
sh scripts/test-plgg.sh --public-plgg-test 0.0.5
```

This explicit network command downloads the registry tarball of `plgg-test`
(`latest` by default), never packs workspace sources, and uses a disposable
consumer outside the repository. It removes that consumer on success or failure.
The normal `scripts/test-plgg.sh` command retains its local test behavior.

One exit status covers these ordered checks:

1. Require actual Node 24 and an explicit `engines.node` in the tarball manifest.
   Install that same archive beside TypeScript 7 with npm `--engine-strict`;
   npm rejects incompatible or malformed engine ranges, including dependency
   engine violations. Install lifecycle scripts are disabled.
2. Resolve TypeScript from the installed public bin location and consumer root:
   runner TS6 with `transpileModule`, consumer TS7, different physical modules.
3. Execute the public CLI with an enum fixture that needs transpilation.
   This also covers relocation or loader behavior beyond static resolution.
4. Typecheck the fixture using the consumer's own TS7 with NodeNext, strict mode
   and declaration checking enabled. Require TS2322 from a negative control.

The first failed phase exits 1. Captured subprocess diagnostics are suppressed
because npm output may contain private configuration. A failed runtime phase
means later typechecking was not certified. Node 22/25 are rejected before any
network access. Only `latest` or an exact version is accepted, never a URL/path.

Scope: qmu/plgg#183 and qmu/plgg#186 own local candidate pack fixtures and CI
integration; qmu/plgg#194 owns the public plgg-fetch engine gate. This command
adds the live plgg-test engine/compiler/behavior conjunction without changing
those PRs, package runtime code, release versions or automatic CI network use.
It does not claim qmu/plgg#172 is closed or publish a repaired release.

Initial live result: `plgg-test@0.0.5` on Node 24.22.1 accepts `engines.node
>=22.6` and resolves consumer TS7 / bin TS6, but its CLI fails in its relocated
resolver with undefined `ScriptTarget.ESNext`. The gate correctly exits 1 at
`public CLI execution`; the current registry release is not certified green.
Offline regression tests cover engine declarations, real npm strict-engine
installation, Node major requirements, and physical compiler resolution failures:

```sh
node --test scripts/publicTestConsumer.spec.ts
```
