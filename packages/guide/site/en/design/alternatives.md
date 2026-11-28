# Choosing how to look up one book

The input is parsed JSON. A string id identifies a book and must be distinct from a title. An optional prefix must be a string when present. The shelf is a string Map with one entry, “17” → “Atlas”. Render the prefix and title on a hit, distinguishing malformed input from a missing book.

The plgg examples share this decoder and renderer. Only a successful decode reaches the lookup.

### `shelf-query.ts`

```ts
import {
  asObj,
  asSoftStr,
  box,
  cast,
  forOptionProp,
  forProp,
  fromNullable,
  mapResult,
  matchOption,
  okOr,
  pipe,
  type Box,
  type SoftStr,
  type Option,
  type InvalidError,
  type Result,
} from "plgg";

type BookId = Box<"BookId", string>;
const asBookId = (raw: unknown) =>
  pipe(
    asSoftStr(raw),
    mapResult((s: SoftStr) => box("BookId")(s)),
  );

export const decode = (raw: unknown) =>
  cast(
    raw,
    asObj,
    forProp("id", asBookId),
    forOptionProp("prefix", asSoftStr),
  );

const shelf = new Map([["17", "Atlas"]]);
const lookup = (id: BookId) =>
  fromNullable(shelf.get(id.content));

type Query = Readonly<{
  id: BookId;
  prefix: Option<string>;
}>;
export const render = (
  q: Query,
): Result<string, InvalidError | "missing"> =>
  pipe(
    lookup(q.id),
    okOr<"missing">("missing"),
    mapResult((title: string) =>
      matchOption(
        (): string => title,
        (s: SoftStr): string => s + title,
      )(q.prefix),
    ),
  );
```

The synchronous chainResult example gives render the shared error type for the operation. Only decode produces InvalidError, and only render produces missing.

## Unwinding to a caller in plain TypeScript

**Illustrative TypeScript (not typechecked or executed)**

```typescript
type BookId = { kind: "BookId"; value: string };
function read(raw: unknown) {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("id" in raw) ||
    typeof raw.id !== "string"
  )
    throw new Error("invalid id");
  const prefix =
    "prefix" in raw ? raw.prefix : "";
  if (typeof prefix !== "string")
    throw new Error("invalid prefix");
  const id: BookId = {
    kind: "BookId",
    value: raw.id,
  };
  return {
    id,
    prefix,
  };
}
function show(raw: unknown) {
  const q = read(raw);
  const title = shelf.get(q.id.value);
  if (title === undefined)
    throw new Error("missing");
  return q.prefix + title;
}
```

**The same operation in plgg**

```ts
import { chainResult, pipe } from "plgg";
import { decode, render } from "./shelf-query.ts";

const show = (raw: unknown) =>
  pipe(decode(raw), chainResult(render));
console.log(show({ id: "17" }), show({ id: 17 }));
```

The throwing decoder substitutes an empty prefix immediately because it already knows the display default. The return type of show is string and gives the caller no list of exceptions. Normal execution uses ordinary calls with no library dependency. plgg constructs an ID and result boxes even on success, and carries the reasons to a caller that might offer different recovery actions.

## Returning field errors with Zod or Valibot

**Illustrative TypeScript (not typechecked or executed)**

```typescript
import * as z from "zod";
import * as v from "valibot";

const Z = z.object({
  id: z.string().brand<"BookId">(),
  prefix: z.string().optional(),
});
const V = v.object({
  id: v.pipe(v.string(), v.brand("BookId")),
  prefix: v.optional(v.string()),
});
function display(id: string, prefix?: string) {
  const title = shelf.get(id);
  return title === undefined
    ? { missing: id }
    : { text: (prefix ?? "") + title };
}
function withZod(raw: unknown) {
  const r = Z.safeParse(raw);
  return r.success
    ? display(r.data.id, r.data.prefix)
    : { issues: r.error.issues };
}
function withValibot(raw: unknown) {
  const r = v.safeParse(V, raw);
  return r.success
    ? display(r.output.id, r.output.prefix)
    : { issues: r.issues };
}
```

**The same operation in plgg**

```ts
import { decode, render } from "./shelf-query.ts";

const form = decode({ id: "17", prefix: "# " });
console.log(
  form.isOk() ? render(form.content) : form,
);
```

Both parsers execute a schema at validation time. The branded ID is still a string at lookup time, and the prefix reads as an ordinary optional property. A form can associate issue paths with its controls. The application chooses how to represent and compose subsequent lookup failures. With plgg, both the form author and the renderer need to understand Option and Result.

[Zod](https://zod.dev/api) · [Valibot safeParse](https://valibot.dev/guides/parse-data/) · [Valibot brand](https://valibot.dev/api/brand/)

## Continuing an existing fp-ts Either

**Illustrative TypeScript (not typechecked or executed)**

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

const show = (raw: unknown) =>
  pipe(
    E.tryCatch(
      () => read(raw),
      () => "invalid",
    ),
    E.flatMap((q) =>
      pipe(
        E.fromNullable("missing")(
          shelf.get(q.id.value),
        ),
        E.map((title) => q.prefix + title),
      ),
    ),
  );
```

**The same operation in plgg**

```ts
import { chainResult, pipe } from "plgg";
import { decode, render } from "./shelf-query.ts";

console.log(
  pipe(decode({ id: "99" }), chainResult(render)),
);
```

Here read is the plain TypeScript decoder above. Translate its exception once and give undefined the meaning “missing” at the lookup. Synchronous Either constructs Left or Right. Only Right continues through flatMap. This follows the same order as plgg Result and both construct intermediate results. An existing TaskEither lookup adds a timing decision. Its asynchronous computation waits for invocation, whereas calling proc starts a promise chain. Decide who starts the lookup before translating its result.

[Either](https://gcanti.github.io/fp-ts/modules/Either.ts.html) · [TaskEither](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)

## Choosing when an Effect runs

**Illustrative TypeScript (not typechecked or executed)**

```typescript
import { Effect } from "effect";

const show = (raw: unknown) =>
  Effect.gen(function* () {
    const q = yield* Effect.try({
      try: () => read(raw),
      catch: () => "invalid",
    });
    const title = shelf.get(q.id.value);
    if (title === undefined)
      return yield* Effect.fail("missing");
    return q.prefix + title;
  });
const result = await Effect.runPromise(
  Effect.either(show({ id: "17" })),
);
```

**The same operation in plgg**

```ts
import { proc } from "plgg";
import { decode, render } from "./shelf-query.ts";

console.log(
  await proc({ id: "17" }, decode, render),
);
```

The Effect v3 example reuses read, including its prefix default. Only the lookup can turn a miss into the second expected failure. A successful yield resumes the generator. Building show describes work that the runtime later executes. Applying either before execution exposes expected failures as values. Effects can also track required services in their types. This shelf requires none, yet its caller still needs to learn how to run the computation. In plgg a replaceable lookup can travel as a function argument.

[Effect v3 generators](https://effect.website/docs/v3/getting-started/using-generators) · [Effect type](https://effect.website/docs/getting-started/the-effect-type/)

## When to leave plgg out and where to translate

Keep an existing Zod or Valibot schema if field validation is the form’s entire job. On the success branch, box the validated ID and pass the optional prefix through fromNullable at the plgg boundary. Matching validation rules need no second parse. The form keeps its original issues on failure.

Keep Either if all callers already consume fp-ts. At a mixed boundary, pass the Left reason to err and the Right value to ok. If Effect already manages services and execution, finish the work there. Translate the Either produced above once for the plgg caller. Treating unexpected defects as missing books would conceal outages.

A script that exits on the first failure can catch exceptions at its entry point. To call a throwing library from plgg, wrap that call alone in tryCatch. The parsing example distinguishes an exception from a successful call that returned invalid data. [Working through friction](/design/friction/)
