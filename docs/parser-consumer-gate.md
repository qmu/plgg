# plgg-parser consumer gate

Run `./scripts/gate-parser-consumer.sh` after building `plgg` and
`plgg-parser` (or run `./scripts/check-all.sh`, which builds first).
The shell entry point uses Node 24, provisioning it through `npx` when
the host uses another major. npm registry access is required.

Two temporary consumers outside the workspace install TypeScript 7:

- Registry: `plgg-parser` at the version in its repository manifest,
  with its registry dependency on `plgg`.
- Packed: local `plgg` and `plgg-parser` tarballs staged with the same
  allowlist and `file:` dependency rewrite helpers used by the publisher.

Both compile a strict consumer using only public root exports, then run
three tests for parser composition, mismatches/EOF/trailing input, and
partial consumption. A separate compilation must reject assigning the
parser's `Result` to `number` with TS2322, guarding against lost typing.
The compiler is resolved from each consumer's installation; no workspace
paths or source aliases are supplied. The temporary tree is removed even
on failure, and a failure blocks `check-all.sh` on both Node 22 and 24 hosts.

Like the packages' own configurations, the consumers use `skipLibCheck`:
this checks consumer code, not declaration-internal correctness. With
`skipLibCheck: false`, the current registry `plgg` declarations report HKT
augmentation constraints (`TS2344`); this gate does not resolve that
existing issue. It also does not publish packages or certify other members
of the monorepo. A version bump must be published before its registry lane
can pass, following the repository's pre-merge publishing policy.
