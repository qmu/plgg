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

Every snapshot saves `generatorVersion: "1.1.0"` separately from
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

The CLI validates the destination before starting consumer gates. An incompatible
or malformed existing snapshot therefore fails without launching child processes
or making registry requests. The writer validates again after collection so a
destination changed during gate execution is also rejected before replacement.
This recheck does not lock the destination against concurrent writers.

## Node 24 CI evidence and completion

The optional second CLI argument is a JSON evidence file. Each snapshot embeds
one `node24Ci` object shared by its package rows; it never appends evidence from
older snapshots. For a checked Node 24 job, supply
`{"status":"passed","nodeMajor":24,"url":"https://github.com/qmu/plgg/actions/runs/123/job/456"}`
with the actual job URL. `failed` and `pending` are also accepted. A job URL is
required to distinguish the Node 24 matrix job from other jobs in the same run.
The operator must verify the job runtime, result and relevance to the checked
revision; this local tool does not authenticate or fetch GitHub job results.

When qmu/plgg#171 is waiting for workflow permission, supply
`{"status":"permission-wait","reason":"workflows-permission-required"}`.
The saved evidence includes the canonical issue URL and fixed permission reason.
Absent or invalid evidence becomes `unknown`; arbitrary text, extra properties,
foreign repository URLs and URL query strings are never saved.

`complete` is true only for a nonempty set of passing local gates with explicit
passing Node 24 CI evidence. Unknown, pending, failed and permission-wait states
exit 1 even if every local gate passes. The CLI prints both CI state and completion.
Use a new output path for generator version `1.1.0`; older artifacts are rejected.
This adds a local evidence link, not a workflow change or closure of qmu/plgg#171.

### Artifact reference boundary

The optional CI evidence argument is a portable relative path from the
repository root (for example `.artifacts/node24-ci.json`). The index reader
rejects empty paths, parent (`..`) segments, absolute POSIX/Windows paths,
drive-relative Windows paths, backslashes and NUL before reading the artifact
or running consumers. Rejection preserves an existing destination and emits
only the fixed CLI diagnostic. `./` and nested relative paths remain supported.
This lexical validation does not resolve symlinks; the checkout must be trusted.
The index output destination remains an operator-selected path.
