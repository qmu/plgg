# Distinguish values with Box

A book title and an author name can both be strings. Pass a tag to `box`, then supply the value. Read `__tag` to identify the variant and `content` to retrieve the value. See [match](/concepts/match/) for handling several variants.

```ts
import { box } from "plgg";

const title = box("Title")("Field notes");
console.log(title.__tag, title.content); // Title Field notes
```
