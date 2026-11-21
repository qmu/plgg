# Packed plgg-router consumer gate

`./scripts/gate-router-consumer.sh` requires built `packages/plgg/dist` and
`packages/plgg-router/dist`. It runs automatically after `build.sh` through
`check-all.sh`, including the Node 22 CI runner: `npm exec --package=node@24`
provides Node 24 without changing the workspace's compiler split.

The completion table in [qmu/plgg#182](https://github.com/qmu/plgg/pull/182)
marks plgg-router's Node 24, TS7 and npm-consumer conditions unprotected.
The later family gate in [qmu/plgg#191](https://github.com/qmu/plgg/pull/191)
covers generic ESM imports, but explicitly excludes CJS/NodeNext and does not
exercise router behavior. No open PR supplied this dedicated router coverage.
This gate adds those missing behavioral conditions without replacing #191.

The gate stages both packages with the publisher's `stageEntries` and
`stagedManifest` helpers, packs them, and installs the two tarballs plus
consumer-owned TypeScript `^7.0.2` outside the repository. It checks real
install paths, compiler major, strict NodeNext consumer compilation, and emitted ESM/CJS path matching and query round trips.
Negative checks reject an invalid API argument, missing declarations and
missing runtime entries. Temporary files are removed on success or failure.

Like the repository configs, the consumer uses `skipLibCheck: true`. The core
plgg declaration tree currently leaves HKT module augmentations as unresolved
self-aliases; checking dependency declaration bodies reports TS2344. This gate
still resolves the shipped declarations and checks consumer API arguments, but
does not certify all dependency declaration bodies. No paths aliases or source
files are provided to the consumer.

This is a mandatory artifact regression check, with no CI-only skip. It needs
npm registry access for Node 24 and consumer TypeScript. It checks the current
checkout's packed artifacts; it does not certify or publish npm's live version.
