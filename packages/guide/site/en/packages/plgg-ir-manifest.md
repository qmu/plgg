# plgg-ir-manifest — Validate a domain manifest

Use a Domain Manifest to declare entities, fields, views, and actions. Pass a source with a single `(plgg-ir 1 (module ...))` root to `compileManifest`. On success, `module` holds the verified model and `canonical` its normalized text. Invalid references or types produce a list of diagnostics.

```ts
import { compileManifest } from "plgg-ir-manifest";

const result = compileManifest(
  "(plgg-ir 1 (module library (entity book (field title (type string)))))",
);
console.log(result.__tag); // Ok
```
