# Working through friction at type boundaries

The bookshelf examples reproduce behavior from the implementation, specs and fixes. The screen policies and HTTP status choices are inferred applications to this bookshelf.

## A callback loses the type of a checked value

In `const show = matchOption(() => "—", s => s.trim())`, the compiler reports `TS18046: 's' is of type 'unknown'.` A later `pipe(value, show)` cannot send type information back into that separate expression. Give the branches a common return type and annotate the branch that receives the value. The pipe still checks compatibility, so an Option of numbers cannot enter this formatter.

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

## A second branch changes the display type

In a count column, `matchOption(() => "—", (n: number) => n)` returns a number on Some. The branches share one result type R, so TS2345 reports `Type 'number' is not assignable to type 'string'.` Give both callbacks the column’s return type. Then changing either one to return a number points to the offending branch. Matching branches can often be inferred without annotations.

```ts
import { matchOption, none, some } from "plgg";

const copies = matchOption(
  (): string => "—",
  (n: number): string => String(n),
);
console.log(copies(none()), copies(some(0)));
```

The shared R is in `Disjunctives/Option.ts`. The count column and the opening trim example are reproductions inferred from the style guide’s inference example.

The same display contract applies to a tagged match. Remove String from the Some handler below and its own return annotation catches the number at that branch.

```ts
import {
  match,
  none,
  none$,
  some,
  some$,
  type Option,
} from "plgg";

const label = (count: Option<number>): string =>
  match(count)(
    [none$(), (): string => "—"],
    [some$(), (n): string => String(n.content)],
  );
console.log(label(none()), label(some(0)));
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

## A successful query can still miss

An empty result is normal for a listing. A detail page needs a reason when it cannot open a book. Calling `toOption(row)` erases a database failure and nests two Options on success. Apply okOr only to a successful query. Going back with toOption makes sense for a display where every failure really should leave a blank.

```ts
import {
  chainResult,
  err,
  none,
  ok,
  okOr,
  some,
  toOption,
  type Option,
  type Result,
} from "plgg";

type Reason = "offline" | "missing";
const open = (
  row: Result<Option<string>, Reason>,
) => chainResult(okOr<Reason>("missing"))(row);

console.log(
  open(ok(some("Atlas"))),
  open(ok(none())),
  open(err("offline")),
  toOption(open(err("offline"))),
);
```

The okOr and toOption tests in `Disjunctives/Option.spec.ts` cover those conversions. The two screen policies are inferred applications.

## The next path segment can be absent

The router reads `fromNullable(parts[i])` in `Routing/usecase/matchSegments.ts`. A string array still returns undefined one position past the end. Calling `parts[i].trim()` there throws and noUncheckedIndexedAccess reports `TS2532: Object is possibly 'undefined'.` Trim only a present segment so an empty segment remains distinct from an absent one.

```ts
import {
  fromNullable,
  mapOption,
  pipe,
} from "plgg";

const segment = (parts: string[], i: number) =>
  pipe(
    fromNullable(parts[i]),
    mapOption((s: string) => s.trim()),
  );
console.log(segment([" "], 0), segment([" "], 1));
```

## Clearing a subtitle breaks the round trip

Sending `{ subtitle: null }` leaves the key present. forOptionProp therefore runs the string caster and returns Err. Stringifying None directly would also leave a tagged value on the wire. Omit the key when constructing the outgoing record. If empty text is valid, Some("") should still send a string.

```ts
import {
  asSoftStr,
  forOptionProp,
  matchOption,
  none,
  some,
} from "plgg";

type Wire = { subtitle?: string };
const wire = matchOption(
  (): Wire => ({}),
  (subtitle: string): Wire => ({ subtitle }),
);
const read = forOptionProp("subtitle", asSoftStr);
console.log(
  read(wire(none())),
  read(wire(some(""))),
  read({ subtitle: null }),
);
```

The key-presence check is in `Disjunctives/ObjLike.ts`. Its adjacent spec checks the missing-key case.

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

The same boundary exists for third-party callbacks. In plgg-foundry, `Foundry/usecase/operate.ts` wraps a registered processor with `tryCatch(processorResult.content.content.fn)` before invoking it. The example substitutes a JSON parser for that callback. Commit `b717ed3e` records the change to the default error conversion.

## Translating a failure before the response boundary

In `read(raw).then(book => save(book))` the callback receives a Result. Promise.then unwraps only the promise. Give proc a validation step and a save step and it skips the save on Err. Wrap a library that can reject in tryCatch at the call itself.

```ts
import {
  asStr,
  box,
  err,
  mapErr,
  ok,
  proc,
  type Box,
  type Defect,
  type InvalidError,
  type Str,
} from "plgg";

type Duplicate = Box<"Duplicate", string>;
const save = async (title: Str) =>
  title.content === "Atlas"
    ? err(box("Duplicate")(title.content))
    : ok(title.content.length);

const register = (raw: unknown) =>
  proc(raw, asStr, save);

const status = (
  e: InvalidError | Duplicate | Defect,
) =>
  e.__tag === "InvalidError"
    ? 400
    : e.__tag === "Duplicate"
      ? 409
      : 500;
const respond = async (raw: unknown) =>
  mapErr(status)(await register(raw));
console.log(
  await respond(""),
  await respond("Atlas"),
  await respond("North"),
);
```

`(await register(raw)).content.message` cannot work. Success carries a number, and failures retain the step errors plus Defect. Repeating the same translation at every caller gives you several places to update when a new reason appears. Here a single mapErr at the HTTP edge maps invalid input to 400, duplicate titles to 409 and unexpected failures to 500. Keep the original reason until any retry decision has been made. Commit `c9ecc6e2` and the type equality check in `Flowables/proc.spec.ts` document the error union.

## The client tries to decode a 404 body

A straight `proc(url, get, decodeJsonBody(asStr))` tries the decoder even on a 404 body. plgg-fetch returns Ok for a received HTTP response, including a 404. A failed connection returns Err. Decide what to show for transport failure and status before decoding the body. proc could contain that decision, but both paths end in a display here, so fold the result immediately after await.

```ts
import {
  asSoftStr,
  matchResult,
  pipe,
} from "plgg";
import {
  decodeJsonBody,
  get,
  type ClientError,
} from "plgg-fetch";
import type { HttpResponse } from "plgg-http";

const display = async (url: string) =>
  pipe(
    await get(url),
    matchResult(
      (e: ClientError): string => e.__tag,
      (r: HttpResponse): string =>
        r.status.content === 404
          ? "Missing"
          : pipe(
              r,
              decodeJsonBody(asSoftStr),
              matchResult(
                (): string => "Invalid body",
                (title: string): string => title,
              ),
            ),
    ),
  );
console.log(
  await display(
    "data:application/json,%22Atlas%22",
  ),
);
```

The example exercises success without an external server. The 404 and rejected-connection cases are recorded in `plgg-fetch/src/domain/usecase/request.spec.ts`. See `plgg-fetch/example.ts` for a client that retains the response while decoding its body.
