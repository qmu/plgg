# plgg-ir-manifest — Validate a domain manifest

Use a Domain Manifest to declare entities, fields, views, and actions. Pass a source with a single `(plgg-ir 1 (module ...))` root to `compileManifest`. On success, `module` holds the verified model and `canonical` its normalized text. Invalid references or types produce a list of diagnostics.

```ts
import { compileManifest } from "plgg-ir-manifest";

const result = compileManifest(
  "(plgg-ir 1 (module library (entity book (field title (type string)))))",
);
console.log(result.__tag); // Ok
```

## Working with the API

`compileManifest(source) → Result<CompiledManifest, ReadonlyArray<SemDiagnostic>>`

Give a renderer the verified module and use canonical for storage or comparison. Starting consumers from the compiled result avoids interpreting form names a second time. On failure show the diagnostic range in the original input.

## Look up a declaration

entityOf(module, name) and viewOf(module, name) return arrays of matching declarations. An unknown name gives an empty array. When a `view` name comes from configuration, inspect the length or wrap the indexed value in an `Option` before accessing it.
