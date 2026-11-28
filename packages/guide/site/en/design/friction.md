# Working through friction at type boundaries

## A callback loses the type of a checked value

In `const show = matchOption(() => "—", s => s.trim())`, s is unknown. A later `pipe(value, show)` cannot send type information back into that separate expression. Give the branches a common return type and annotate the branch that receives the value. The pipe still checks compatibility, so an Option of numbers cannot enter this formatter.

```ts
import {
  fromNullable,
  matchOption,
  pipe,
} from "plgg";

const show = matchOption(
  (): string => "—",
  (s: string): string => s.trim(),
);
console.log(pipe(fromNullable(" Atlas "), show));
```

## Two different failures at a library boundary

`JSON.parse(raw).trim()` throws for malformed JSON and for a well-formed number. Catching the library exception leaves the successful value unchecked. Receive it as unknown and let asStr decide whether it qualifies as a title. The malformed input yields Defect and the number yields InvalidError.

```ts
import { asStr, proc, tryCatch } from "plgg";

const parse = tryCatch((s: string): unknown =>
  JSON.parse(s),
);
const read = (s: string) => proc(s, parse, asStr);
console.log(await read("{"), await read("42"));
```

## A successful lookup contains another box

The outer tag of `mapOption(first)(some(""))` is Some. The payload is None because first already returns Option. If the caller only needs to know whether a first character exists, use chainOption. The same mistake with mapResult produces Ok(Err(...)) when validation fails. Use chainResult when the next function already returns Result.

```ts
import {
  chainOption,
  fromNullable,
  mapOption,
  some,
} from "plgg";

const first = (s: string) => fromNullable(s[0]);
console.log(
  mapOption(first)(some("")),
  chainOption(first)(some("")),
);
```

With `Result<Option<Book>, DbError>`, a failed query and an empty shelf are distinct outcomes. Handle the Result first and open the Option only on success. Applying toOption too early can make a database outage look like an empty shelf.

## Translating a failure before the response boundary

In `read(raw).then(book => save(book))` the callback receives a Result. Promise.then unwraps only the promise. Give proc a validation step and a save step and it skips the save on Err. Wrap a library that can reject in tryCatch at the call itself.

```ts
import {
  asStr,
  mapErr,
  proc,
  tryCatch,
  type Defect,
  type InvalidError,
  type Str,
} from "plgg";

const save = tryCatch(async (title: Str) =>
  Promise.resolve(title.content.length),
);
const register = (raw: unknown) =>
  proc(raw, asStr, save);
const respond = async (raw: unknown) =>
  mapErr((e: InvalidError | Defect) =>
    e.__tag === "InvalidError" ? 400 : 500,
  )(await register(raw));
console.log(
  await respond(""),
  await respond("Atlas"),
);
```

`(await register(raw)).content.message` cannot work. Success carries a number, and failures retain the step errors plus Defect. Repeating the same translation at every caller gives you several places to update when a new reason appears. Here a single mapErr at the HTTP edge maps invalid input to 400 and everything else to 500. Keep the original reason until any retry decision has been made. Commit `c9ecc6e2` and the type equality check in `Flowables/proc.spec.ts` document the error union.
