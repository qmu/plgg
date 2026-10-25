# Received request closure boundary

`scripts/requestCloseBoundary.ts` is a read-only consumer of the terminal ledger
proposed in qmu/plgg#236. It does not implement that PR's merge/publication checks,
probe npm, close issues or call corpd. It binds **each received request** to its
issue, exact public version, full set of closure conditions and exact terminal
ledger bytes. One failed request blocks the entire supplied request batch.

Run after the trusted terminal producer and the receipt collector finish:

```sh
node --experimental-strip-types scripts/requestCloseBoundary.ts \
  private-request-manifest.json private-receipts.json issues-terminal.json
```

The three inputs are required; exit status is 0 only for `receipt-bound`, otherwise
1. Output contains only the decision and a fixed reason, never request identifiers
or input contents. Keep real manifests and receipts outside the public repository.
This boundary is opt-in until the terminal producer/collector are integrated.

## Input contract

The manifest is a trusted record of the received request, **not** generated from
closure evidence. Schema 1 has a nonempty `requests` array. Each entry has:

```json
{
  "requestId": "synthetic-request-155",
  "issue": 155,
  "package": "plgg-bundle",
  "publishedVersion": "0.0.7",
  "closureConditions": ["affected-runtime-repeat-build"]
}
```

The receipt envelope is schema 1 with a `receipts` array. Each receipt repeats
those five fields and adds `terminalSha256`: the lowercase SHA-256 of the original
terminal file bytes (including whitespace/newlines). The collector must copy the
request identity from the received request and attest the actual public version;
it must not infer an identity from issue number alone. This is consistency checking
of trusted evidence, not cryptographic authentication of a collector.

Request IDs must be unique in both inputs, and there must be exactly one receipt
per manifest entry, with no extras. Issue numbers are positive safe integers in
qmu/plgg; public versions are exact stable three-part versions. Conditions are
nonempty unique strings, compared as unordered sets. Duplicate IDs, omitted or
substituted conditions, cross-request swaps and hashes from another terminal file
all fail closed. Several distinct received requests may refer to the same issue;
every request must independently match that issue's full closure condition set.

The schema-1 terminal ledger must identify the npm public registry. Its issue rows
must have unique numbers. Every requested issue must have the canonical qmu/plgg
issue URL, matching package, exact `npmVersion` and `latest`, `publicationMatched`
and `canClose` true, an empty `blockers` array and exactly the expected successful
`closureChecks`. A blocked unrelated issue does not prevent this request batch
from passing: the producer's global `complete` covers all four issues, while this
boundary decides the supplied received requests. The producer remains responsible
for PR merge, consumer checks and the validity of its source evidence.

The tests use synthetic request identifiers only. They cover successful binding,
identity/issue/package/version/condition swaps, missing/extra/duplicate receipts,
stale terminal bytes and freshly hashed terminal failures, plus CLI exit behavior
and redaction on invalid input. No real request is marked complete by these tests.
