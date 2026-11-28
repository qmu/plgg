# plgg-ir-language — Define the meaning of a dialect

Define forms, operators, and name scopes, then call `compileSource(language)(source)`. It parses, expands, analyzes, and normalizes the input. A successful result includes analyzed nodes and canonical text. See the [domain manifest](/packages/plgg-ir-manifest/) and [argumentation](/packages/plgg-ir-thesis/) dialects for two applications.

## Working with the API

`compileSource(language)(source) → Result<Compiled<N>, ReadonlyArray<SemDiagnostic>>`

The same S-expression can have different forms and scoping rules under different dialects. Fix the language once to compile several files consistently. For an existing manifest, `compileManifest` handles its document envelope too.

```ts
import { compileSource } from "plgg-ir-language";
import { manifestLanguage } from "plgg-ir-manifest";

const compile = compileSource(manifestLanguage);
console.log(compile("(unknown-form)").__tag);
```

## Choose a compilation output

Compiled.nodes contains the dialect’s analyzed values. normalized holds normalized S-expressions and canonical is printed text. Use nodes for structural checks. A failed stage skips later stages. Syntax diagnostics are converted to the common SemDiagnostic type.
