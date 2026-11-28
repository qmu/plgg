# plgg-ir-syntax — Read and print S-expressions

Parse text into syntax trees with source ranges using `parseSexps`. Pass the trees to `printSexps` to print the same structure in canonical form. For an unmatched parenthesis, use the diagnostic range to locate the problem in the input. Define what the forms mean with [plgg-ir-language](/packages/plgg-ir-language/).

```ts
import { isOk } from "plgg";
import {
  parseSexps,
  printSexps,
} from "plgg-ir-syntax";

const result = parseSexps("(book 42)");
if (isOk(result))
  console.log(printSexps(result.content));
```

## Working with the API

`parseSexps(source) → Result<ReadonlyArray<Sexp>, ReadonlyArray<SyntaxDiagnostic>>`

A syntax tree does not establish that a field or operator exists. Report token and delimiter errors with ranges here, then delegate name resolution to the language layer. Canonical printing can change the original whitespace.

## Distinguish bad syntax from an unknown name

Removing the closing parenthesis from (book 42) produces a `parseSexps` diagnostic. Renaming book alone still leaves a valid S-expression. The language layer decides whether the name is meaningful. Underline ranges in the original input, since printing again may move the text.
