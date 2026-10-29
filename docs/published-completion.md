# Published npm completion gate

Run from the repository root with Node 22.13+ (native type stripping), npm,
network access to the public npm registry, and Chromium installed:

```sh
node scripts/publishedCompletion.mjs docs/published-completion.json
node --test scripts/publishedCompletion.spec.mjs
```

Set `CHROMIUM_PATH` if Chromium is not `/usr/bin/chromium`. The live command
returns **1 until all six checks pass**; it still writes the JSON ledger when
an install, registry request or browser launch fails. `blocked` means a probe
could not run, `failed` means its consumer did not meet the condition. Neither
means complete. Raw subprocess errors, environment values, credentials,
hostnames and local filesystem paths are excluded from the ledger. Only
allowlisted diagnostic codes are retained.

The command resolves public `latest` versions once, downloads their exact
registry tarballs, verifies registry SHA-512 integrity, records SHA-256 too,
and installs those same bytes in temporary directories outside the workspace.
It never builds a local package or changes an open PR. Scratch consumers are
removed after success or failure. The ledger records tool versions and OS;
compiler versions and Playwright are pinned in the runner. Transitive npm
dependencies are resolved at execution time, so this is a dated observation,
not a hermetic lockfile or a release authorization.

| Issue | Probe | Required observation |
| --- | --- | --- |
| qmu/plgg#155 | `bundle-restart` | Two CLI app builds with TS6 in one real tarball consumer; remove output and change input; execute each fresh JS result (41 then 42). Preserve the exact legacy relocate directory symlink across both starts. |
| qmu/plgg#156 | `consumer-ts7` | Real TS7 consumer builds twice, runs emitted JS, typechecks, and rejects a deliberate TS2322 error. |
| qmu/plgg#158 | `svg-elements` | Chromium DOM has SVG namespaces for rect/circle/ellipse/line/polyline/polygon/g/path. |
| qmu/plgg#158 | `raw-identity` | A raw SVG is a direct child and retains DOM identity after an equal render. |
| qmu/plgg#157 | `frame-dispatch` | Five button dispatches update immediately but paint once on a controlled browser frame; pending paint is cancelled on teardown. |
| qmu/plgg#157 | `lazy-subtree` | The exported lazy builder skips its producer and DOM mutations for an identical argument; a changed argument updates content. |

The browser imports the installed distribution's ESM entries through an import
map, independently of the bundle probe, so a broken bundler cannot mask view
results. Frame timing is controlled by replacing the browser RAF queue; DOM,
events, CSSOM and MutationObserver are Chromium's real implementations.

`docs/published-completion.json` is the generated snapshot. On Linux/Node
24.22.1, plgg-bundle 0.0.6 finishes both TS6 builds but fails the symlink
preservation check (`legacy-symlink-mutated`, second-build). Its first TS7
build fails with `CommonJS`. plgg-view 0.0.2 fails all four browser probes.
**The four issues are not collectively complete.** The Linux result does
not reproduce the reported macOS/Node 23.9.0 EISDIR exception.
Re-run on that platform before closing qmu/plgg#155. The gate does not claim
SVG typed-builder coverage, library declaration emission coverage, or a
large-list performance benchmark.

Existing work checked: qmu/plgg#165, qmu/plgg#173, qmu/plgg#179,
qmu/plgg#189, qmu/plgg#190, qmu/plgg#211 and qmu/plgg#212 cover bundle fixes
or packed/release probes; qmu/plgg#164 and qmu/plgg#166 implement SVG and
frame/lazy; qmu/plgg#176, qmu/plgg#181 and qmu/plgg#185 discuss completion.
qmu/plgg#191 checks locally packed candidates rather than live releases.
This gate supplies the missing executable **live-registry** snapshot; it does
not replace or merge those PRs. Re-run after their reviewed fixes are published.

The offline tests cover complete/incomplete/duplicate result sets, corrupted
hashes, genuine repeated execution, second-start EISDIR, stale outputs and a
no-op rebuild. `scripts/check-all.sh` runs them without requiring registry or
Chromium access. The intentionally failing live snapshot is an explicit
release/completion check, not a mandatory green CI check against today's old
npm releases.

## Restart proof consumed by the final ledger

`bundle-restart.evidence` records schema version 1, `sameConsumer: true`,
`legacySymlink: "preserved"`, the downloaded plgg-bundle `packageSha256`,
and two `runs` with values 41/42 and distinct emitted `outputSha256` hashes.
The collector creates the retired launcher's exact cache key and ready marker
in a private TMPDIR, pointing its node_modules symlink at this consumer.
It verifies the link's inode, nanosecond change time and target after each build; no workaround removes
the link between starts. A legacy launcher that deletes or replaces it fails
with `legacy-symlink-mutated`, even on Linux where EISDIR may not occur.

qmu/plgg#221 now requires and preserves this proof at the final atomic save
boundary. Merge these producer/reader changes together and regenerate the
source snapshot before finalization; old status-only restart evidence cannot
produce a complete final ledger. This does not substitute for the affected
macOS/Node 23 runtime condition in qmu/plgg#236 or authorize issue closure.
