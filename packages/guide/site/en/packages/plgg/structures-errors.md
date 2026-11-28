# Inspect structures and errors

Use `asVecOf` for arrays whose elements share a validator. For records with known field names, combine `asObj` and `forProp` to specify a validator for each field, as in the [book example](/concepts/validation/).

An `InvalidError` in a failed `Result` carries an explanation in `content.message` and any accompanying errors in `content.sibling`. Use `printPlggError` to write the error and its children to the console.

## Inspect sibling failures

A single failure has its own message. When several validation steps fail, inspect sibling for the individual errors. Correct one field at a time below and compare the result.

```ts
import {
  asNum,
  asObj,
  asStr,
  cast,
  forProp,
  isErr,
} from "plgg";

const r = cast(
  { title: "", copies: "2" },
  asObj,
  forProp("title", asStr),
  forProp("copies", asNum),
);
if (isErr(r))
  console.log(
    r.content.content.message,
    r.content.content.sibling.map(
      (e) => e.content.message,
    ),
  );
```
