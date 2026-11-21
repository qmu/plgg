# Monotonic published terminal commit

`scripts/commitPublishedMonotonic.mjs` owns one boundary: a complete
Node 24 / consumer TS7 publication candidate must never replace a terminal
ledger with a lower SemVer for the same package. It compares packages by
name, regardless of array order. Every previously recorded package must
remain present; an unrelated upgrade cannot offset a downgrade.

After the producer has validated consumer results, Node/TS versions,
registry identity, hashes and current tags, commit its private candidate:

```sh
node scripts/commitPublishedMonotonic.mjs candidate.json terminal.json
```

The output parent directory must already exist. Exit 0 means committed;
exit 1 means refused. The CLI prints no raw candidate or exception data.
It leaves the candidate available to its owner for cleanup or diagnosis.
The candidate must contain `complete: true` and a nonempty `packages` array
of unique `{ name, version }` records. This is an additional save boundary,
not a replacement for producer evidence validation.

## Integration with the open terminal producer work

This change starts from main and does not copy the producers in
qmu/plgg#214 / qmu/plgg#221 / qmu/plgg#225 or the tag observation guard in
qmu/plgg#228. It can run offline on already validated candidate files.
When qmu/plgg#228 is integrated, replace that guard's final rename with
this function (its injectable rename seam already has the same signature):

```js
import { commitPublishedMonotonic } from "./commitPublishedMonotonic.mjs";

await guardPublishedTerminal(output, checkpoint, {
  rename: commitPublishedMonotonic,
});
```

The guard then retains its failure checkpoint/reacquisition behavior when
monotonic commit refuses. For a permanent default, use this function at
that final commit call; do not perform an ordinary rename afterwards.
Existing unmerged producers are not silently rewritten by this PR.
Every writer of the same terminal path must use this boundary; ordinary
filesystem writes can bypass it.

## Comparison and failure behavior

- Core and numeric prerelease components compare numerically without
  floating point truncation. Numeric prerelease identifiers precede
  nonnumeric ones; a release follows its prereleases. Build metadata
  does not affect precedence. Equal precedence and upgrades are allowed.
- Invalid SemVer, duplicate package names, malformed JSON, missing previous
  packages, and incomplete candidates fail closed. An existing malformed
  ledger is not treated as a first publication. Existing incomplete
  evidence still preserves its recorded package version floor.
- A missing terminal file permits the first save. Read errors other than
  absence preserve the old file. The parent path is canonicalized before
  locking. A sibling `.lock` directory serializes baseline read, comparison
  and atomic replacement. A busy lock refuses immediately: retry from a
  fresh acquisition after the active writer finishes.
- The checked candidate bytes are copied to a private, exclusive 0600
  sibling temporary file and renamed atomically. Candidate path changes
  after its read cannot substitute unchecked bytes. Temporary state is
  cleaned on ordinary failures. This does not promise power-loss durability.
- A crashed process may leave a lock or temporary file. Do not steal a
  lock based on age. An operator must establish that no writer is active,
  remove the stale state, and reacquire before retrying. All writers must
  use the same canonical terminal path (do not use hard-link aliases).

This boundary does not publish npm packages, move dist-tags, or close
issues. It does not assert that today's npm latest is newer, or authenticate
an input producer. Those checks remain with the existing public gates.

Verification:

```sh
node --test scripts/commitPublishedMonotonic.spec.mjs
sh -eu scripts/tsc-plgg.sh
sh -eu scripts/test-plgg.sh
```
