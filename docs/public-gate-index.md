# Public consumer failure index

Run on Node 24 from the repository root:

```sh
npx --yes --package=node@24 node scripts/runPublicGateIndex.ts
# Optional explicit artifact path (parent directory must already exist):
npx --yes --package=node@24 node scripts/runPublicGateIndex.ts /tmp/public-gates.json
```

The command invokes the existing live-registry Node 24 / consumer TypeScript 7
gates for `plgg`, `plgg-md`, and `plgg-test`, forces opt-in flags so local runs
cannot silently skip, and writes one complete JSON snapshot. It continues after
each failed gate and exits 1 if a package failed or was blocked. Network access
and each gate's prerequisites are required. Each child has a ten-minute timeout.
This is an explicit diagnostic command, not an automatic CI network dependency.

The default `.public-package-gate-index.json` is ignored by git. A successful
write atomically replaces a compatible previous snapshot; resolved failures cannot remain
from a prior run. The file is created with mode 0600. An output write failure
exits 1 and leaves the previous snapshot intact.

Each package row contains `package`, `status`, a fixed `reason`,
a Node 24 `reproduction` command, and the prerequisite PR URL:

| Reason | Status | Meaning / next action |
| --- | --- | --- |
| `passed` | passed | Existing gate returned 0. |
| `consumer-gate-failed` | failed | Existing gate returned nonzero. Run the reproduction command to diagnose and repair the package or its gate prerequisite. |
| `duplicate-package-name` | blocked | More than one gate registers the same package name; remove the duplicate registration before retrying. No child for that name was started. |
| `node-24-required` | blocked | Run the index command on Node 24; no child was started. |
| `gate-unavailable` | blocked | Integrate the linked gate PR; no child was started. |
| `gate-execution-failed` | blocked | Child could not start, was signalled, or timed out; retry the reproduction command. |

Package names must be unique by exact string equality. Before executing children,
the index identifies repeated names across the entire gate list. Every occurrence
of a repeated name, including the first, is blocked with
`duplicate-package-name`, even when its script or command differs. This reason
takes precedence over runtime and missing-script checks. Unique names retain their
normal checks; a duplicate does not prevent their execution. All rows are retained
for diagnosis and the CLI exits 1 because the snapshot contains blocked rows.

Reasons come from this fixed vocabulary, never subprocess error messages.
Child stdout/stderr is discarded, so registry credentials and npm diagnostics
are not copied into the index or terminal. The index records gate outcomes,
not a claim that every nonzero exit proves a defective published package:
network or prerequisite failures can also make a gate return nonzero.

## Existing ownership and limits

- [qmu/plgg#175](https://github.com/qmu/plgg/pull/175) owns the live `plgg` fixture.
- [qmu/plgg#177](https://github.com/qmu/plgg/pull/177) owns the live `plgg-md` fixture.
- [qmu/plgg#195](https://github.com/qmu/plgg/pull/195) owns the live `plgg-test` engine/compiler/runtime conjunction.
- [qmu/plgg#191](https://github.com/qmu/plgg/pull/191) owns the candidate-family
  gate. It is not included here: its aggregate exit status cannot identify which
  individual package failed without a structured per-package result.
- [qmu/plgg#193](https://github.com/qmu/plgg/pull/193) owns pre-publication
  stage/pack diagnostics. Those are not consumer certification.

This change adds persistence and orchestration only, without copying any gate
fixture or changing those PRs. Until the three live gates are integrated, a
main-only checkout intentionally records `gate-unavailable`, rather than
reporting a successful check. This index covers three live gates, not every
public package in the repository.

`consumerTypeScriptMajor: 7` is the required consumer policy, not a measured
compiler version. Node 24 is checked by the index; consumer compiler checks
remain the responsibility of each existing gate. The producer/runtime TS6
dependency of `plgg-test` remains owned by its gate and is not changed here.
Reproduction commands resolve the live registry versions again: the index does
not pin tarball versions or certify reproducibility after registry updates.
Raw diagnostics, exact failure phases, and release decisions remain outside
this index.

## Generator compatibility boundary

Every snapshot saves `generatorVersion: "1.0.0"` separately from
`schemaVersion: 1`. Bump the generator version when index-generation semantics
change, even if the JSON shape stays the same. It is not a Node, compiler, or
npm package version.

The writer accepts only its exact generator version, both on the incoming
snapshot and on an existing destination. Missing, differently typed, or different
versions are rejected before a temporary file is created. Malformed existing JSON
also fails closed. The CLI exits 1 and preserves the existing file. Use a separate
output path for a different generator version, or deliberately remove the old
artifact before regenerating it. Compatible snapshots still replace stale rows
atomically; this boundary does not merge results or certify live tarballs.
