# Validate fields with cast

Accept the input as `unknown`. Check the object with `asObj`, then validate its fields with `forProp`. On success, `title` is a `Str` containing a nonempty string and `copies` is a `Num`. Change the title to `""` and the count to `"2"` to see both field failures in the `InvalidError` value’s `content.sibling` array.

```ts
import { asNum, asObj, asStr, cast, forProp } from "plgg";

const readBook = (input: unknown) =>
  cast(input, asObj, forProp("title", asStr), forProp("copies", asNum));

console.log(readBook({ title: "Field notes", copies: 2 }));
```
