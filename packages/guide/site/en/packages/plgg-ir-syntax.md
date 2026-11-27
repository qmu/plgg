# plgg-ir-syntax — Read and print S-expressions

Parse text into syntax trees with source ranges using `parseSexps`. Pass the trees to `printSexps` to print the same structure in canonical form. For an unmatched parenthesis, use the diagnostic range to locate the problem in the input. Define what the forms mean with [plgg-ir-language](/packages/plgg-ir-language/).

```ts
import { isOk } from "plgg";
import { parseSexps, printSexps } from "plgg-ir-syntax";

const result = parseSexps("(book 42)");
if (isOk(result)) console.log(printSexps(result.content));
```
