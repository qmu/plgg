# Packed plgg-sql consumer gate

Run `scripts/tsc-plgg.sh --sql-consumer` or
`scripts/test-plgg.sh --sql-consumer` from a checkout after `npm ci`.
Both dispatch to `scripts/gate-sql-consumer.sh`; `check-all.sh` also runs
that entry after its dependency-ordered build. No workflow edit is needed.

The entry explicitly selects Node 24 using npm exec, builds plgg-bundle,
plgg and plgg-sql from current sources, stages the publisher allowlist
with `stageEntries` / `stagedManifest`, and packs plgg + plgg-sql.
It generates an isolated temporary consumer outside the repository,
installs those tarballs and its own TypeScript 7, and verifies that none
of the installed dependencies resolves to a workspace link. NODE_PATH
is cleared for subprocesses. Temporary files are deleted even on failure.

Generated .mts and .cts consumers compile in strict NodeNext mode and
execute through both published ESM/CJS exports. They check injection-like
strings remain bound parameters, nested fragments preserve text and parameter
order, None and falsy values survive, and forged Sql-shaped objects fail
the brand guard. Negative controls require invalid interpolation types,
missing declarations, and missing ESM/CJS entry files to fail.

This is candidate-tarball behavior coverage for plgg-sql, not a registry
release certification or a real database/transaction integration test.
Like existing consumers, it uses skipLibCheck: true because plgg's existing
HKT declarations do not support checking their internals in this mode.
Consumer code is checked strictly, including a TS2345 negative control.
Network access is required for Node 24 and consumer TypeScript installation;
there is no skip path. Running this entry does not publish packages.

Scope was compared with qmu/plgg#208 (workflow generation), qmu/plgg#191
(generic family imports), qmu/plgg#188 (parser), qmu/plgg#198 (router), and
qmu/plgg#183 / qmu/plgg#200 (test). None owns SQL-specific packed behavior.
