# plgg-parser — Combine small parsers

`literal` reads a given string and `run` returns the parsed value in a Result. A parser can succeed after reading only a prefix. Combine it with `eof` when the whole input must match. Add another character to the input below to get an `Err`.

```ts
import { eof, left, literal, run } from "plgg-parser";

const keyword = left(literal("book"), eof);
console.log(run(keyword, "book", undefined));
```
