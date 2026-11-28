# plgg-parser — Combine small parsers

`literal` reads a given string and `run` returns the parsed value in a Result. A parser can succeed after reading only a prefix. Combine it with `eof` when the whole input must match. Add another character to the input below to get an `Err`.

```ts
import {
  eof,
  left,
  literal,
  run,
} from "plgg-parser";

const keyword = left(literal("book"), eof);
console.log(run(keyword, "book", undefined));
```

## Working with the API

`literal(expected)(state) → Result<Parsed<SoftStr, S>, InvalidError>`

A production inside a grammar normally leaves input for the next production. literal succeeding therefore says nothing about the suffix. Add eof at a keyword-only entry point and compare book with bookshelf.

## Consume delimiters and return only the payload

left keeps its first value and right keeps its second. Together they can require delimiters while returning only the enclosed token. Adding eof rejects trailing characters even after a valid closing delimiter.

```ts
import {
  eof,
  left,
  literal,
  right,
  run,
} from "plgg-parser";

const item = left(
  right(literal("["), literal("book")),
  left(literal("]"), eof),
);
console.log(
  run(item, "[book]", undefined),
  run(item, "[book]x", undefined),
);
```
