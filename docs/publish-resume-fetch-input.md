# Read npm acquisition results before saving a resume context

`node scripts/publishResumeFetch.ts INPUT.json OUTPUT.json` validates all
acquisition results before it opens an output file. Each result must retain
its **effective registry URL** from the query, including scoped npm registry
overrides. Do not stamp a global registry onto results after fetching them:
this boundary checks provenance supplied by the collector, not the network.

```json
{
  "registry": "https://registry.npmjs.org/",
  "fetchedAt": "2026-10-25T12:00:00.000Z",
  "packages": [
    {
      "registry": "https://registry.npmjs.org/",
      "name": "plgg",
      "version": "0.0.27",
      "latestTag": "0.0.27"
    }
  ]
}
```

Every result must explicitly carry the same registry URL as the envelope.
Comparison is exact: scheme, path and trailing slash differences are rejected,
not silently normalized. URLs with credentials, queries or fragments are
invalid. Missing provenance, invalid JSON/fields, noncanonical UTC timestamps,
empty result sets and duplicate package names are also rejected. `latestTag`
may be `null`, but must not be omitted.

The output has `registry`, `fetchedAt`, sorted `packages` (name, version,
latestTag), and a freshly calculated `distTagGeneration`. Its SHA-256 format
matches qmu/plgg#229. A valid input is written to a sibling temporary file
and renamed into place. Invalid input never creates or overwrites the output;
the CLI exits 1 without echoing untrusted JSON or URLs.

qmu/plgg#229 owns comparison of an already captured context with a later one.
This change owns the earlier read/save boundary: a mixed acquisition must not
become the first trusted context. None of that PR's three files is changed.
The CLI is usable on `origin/main` independently of that unmerged PR. Once
qmu/plgg#229 lands, its capture helper can replace the compatible serialization
here. The actual publish/resume orchestration from qmu/plgg#222 is also still
unmerged; this command does not automatically intercept `publish.ts` or run
npm publish. A future collector must call this boundary with the effective
registry for each query before persisting a resume context.

Run `node --test scripts/publishResumeFetch.spec.ts`. The suite exercises the
unknown-value boundary, exact URL identity, preservation of an existing output,
atomic success and CLI failure without output creation or input disclosure.
