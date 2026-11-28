# Recipes for input, storage and testing

These examples isolate individual boundaries from the [bookshelf tutorial](/tutorial/).

## Decode a request body

Handle malformed syntax and invalid fields at one boundary. An empty body is different from an empty JSON object. Read the body once and return the failure to the caller.

```ts
import {
  asObj,
  asStr,
  cast,
  chainResult,
  decodeJson,
  forProp,
  pipe,
} from "plgg";

const read = async (request: Request) =>
  pipe(
    decodeJson(await request.text()),
    chainResult((input: unknown) =>
      cast(input, asObj, forProp("title", asStr)),
    ),
  );

console.log(
  await read(
    new Request("http://localhost/books", {
      method: "POST",
      body: '{"title":"Atlas"}',
    }),
  ),
);
```


## Validate a submitted form

FormData.get can yield a file. Converting everything to a string could turn an upload into a book title. Validate the returned value directly and reject whitespace-only titles at the same boundary.

```ts
import {
  asStr,
  cast,
  refine,
  type Str,
} from "plgg";

const title = (form: FormData) =>
  cast(
    form.get("title"),
    asStr,
    refine(
      (s: Str) => s.content.trim().length > 0,
      "Enter a title",
    ),
  );

const form = new FormData();
console.log(title(form).__tag);
form.set("title", "Atlas");
console.log(title(form).__tag);
```


## Separate query failure from an empty result

Run this alongside `store.ts` from the bookshelf tutorial. On startup the table exists but contains no books. Display an error tag on failure and a count on success so a failed read cannot appear as an empty shelf.

```ts
import { isOk } from "plgg";
import { books } from "./store.ts";

const result = await books();
console.log(
  isOk(result)
    ? result.content.length
    : result.content.__tag,
);
```


## Keep the boundary cases in a spec

Save as `book.spec.ts` beside the tutorial’s `domain.ts` and run `npx plgg-test .` there. A success-only test misses accidental removal of a required field. Cover missing, whitespace-only and valid titles in one spec.

```ts
import {
  all,
  check,
  test,
  toBe,
} from "plgg-test";
import { asBook } from "./domain.ts";

test("only a nonblank title registers", () =>
  all([
    check(asBook({}).__tag, toBe("Err")),
    check(
      asBook({ title: " " }).__tag,
      toBe("Err"),
    ),
    check(
      asBook({ title: "Atlas" }).__tag,
      toBe("Ok"),
    ),
  ]));
```

[Design choices](/design/choices/) · [Choosing an approach](/design/alternatives/) · [Working through friction](/design/friction/) · [Package boundaries](/design/family/)
