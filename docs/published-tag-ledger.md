# Published consumer ledger: current npm tag binding

For qmu/plgg#155–158, a passing consumer report must still describe what
`npm install <name>` selects today. This read boundary consumes the schema-1
`published-completion.json` produced by qmu/plgg#214, queries the official npm
packument once per dependency, and writes a separate tag-binding ledger.
It does not run or replace that PR's behavioral probes, qmu/plgg#217's
source ancestry policy, or qmu/plgg#218's candidate tarball comparison.

After integrating #214, run its producer, then:

```sh
node scripts/publishedTagLedger.ts artifacts/published-completion.json docs/published-tag-ledger.json
```

Exit 0 requires all six unique consumer checks to pass, the producer's
`complete:true`, exactly the three expected dependencies, a matching published
version and SHA-512 integrity, and `latest` pointing to that same version.
A moved tag, missing version, duplicate dependency, malformed report, registry
failure or failed consumer check writes `complete:false` and exits 1.
The output includes the input file's SHA-256, observation time, recorded
version, published version and observed `latest` value. Unknown input fields
and raw diagnostics are never copied into the public output. The fixed npm
URLs reject redirects and use a 30-second request timeout.

`publishedVersion:null` means that version and its integrity could not be
validated, not that npm has never published this package. This is a point-in-time
observation, not an enduring certificate: rerun both producer and reader before
closure. A tag can move after the read. Metadata integrity matching binds to
the producer's downloaded artifact; this reader does not download it again.
A successful tag binding alone does not establish behavior, provenance or
platform coverage (in particular #155's macOS reproduction).

The committed observation used the #214 report from branch
`work-npm-completion-ledger`, commit
`74f8b886ef8ef7014aaea270918261eeb0f0a1cd` (input SHA-256 is in the
JSON). The actual registry still selects `plgg-bundle@0.0.6`,
`plgg-view@0.0.2` and `plgg@0.0.27`. All three bindings match that report,
but its consumer checks are incomplete, so the combined result remains
`complete:false`. No issue is closed and no npm package is published.

Offline regression tests run through the existing `scripts/*.spec.ts`
entry in `check-all.sh`:

```sh
node --test scripts/publishedTagLedger.spec.ts
```
