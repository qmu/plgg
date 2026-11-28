# Why represent values this way?

## Keeping a book separate from the act of renaming it

With a class, completion on `book.rename(title)` helps you find the operation. A book read from JSON lacks that method. The house style separates data and operations so a test can rename a book given just its data. The caller has to find and import the function. This convention applies to domain data. Core Result values also carry the narrowing methods isOk and isErr.

With `rename(book, title)` the book comes first. Taking the title first lets you prepare an operation and pass it to the stage that receives a book. A JS library expecting the opposite order needs a wrapper.

```ts
import { pipe } from "plgg";

type Book = Readonly<{ title: string }>;
const rename =
  (title: string) =>
  (book: Book): Book => ({ ...book, title });
const atlas = rename("Atlas");
console.log(pipe({ title: "Draft" }, atlas));
```

## An absent subtitle and an invalid title

A fallback based on truthiness also replaces an empty subtitle. fromNullable maps only null and undefined to None. The distinction from an empty string survives until display, at the cost of unpacking the value for ordinary JS. If the protocol distinguishes null from undefined, inspect them before conversion.

```ts
import { fromNullable, getOr, pipe } from "plgg";

const display = (raw?: string) =>
  pipe(fromNullable(raw), getOr("—"));
console.log(display(), display(""));
```

An empty required title calls for a reason. With `throw new Error("empty title")`, the return type gives callers no clue about failure. The result of asStr exposes both the validated title and the validation error. The screen can interpret the reason, but even counting characters requires handling the success case.

```ts
import {
  asStr,
  mapResult,
  pipe,
  type Str,
} from "plgg";

const size = (raw: unknown) =>
  pipe(
    asStr(raw),
    mapResult((s: Str) => s.content.length),
  );
console.log(size("Atlas"), size(""));
```

## Distinguishing strings with different roles

With `type BookId = string`, an author ID still fits. Distinct Box tags catch the mix-up while keeping a string payload. The tags exist at runtime too. A string-based API needs the payload, and attaching a tag alone does nothing to rule out an empty ID.

```ts
import { box, type Box } from "plgg";

const shelfKey = (id: Box<"BookId", string>) =>
  "shelf/" + id.content;
console.log(shelfKey(box("BookId")("17")));
```

## Checking a value before promising its type

Writing `raw as string` leaves a numeric input untouched. Using any also bypasses downstream checks, while ts-ignore hides the broken contract on the offending line. CLAUDE.md forbids all three as remedies for type errors. Passing unknown to a caster, as in size above, establishes a fact downstream code can reuse. Each input format needs checks and a failure path. For validated data, a [callback annotation](/design/friction/) may be enough.

The conventions are recorded in `.claude/skills/plgg-coding-style/SKILL.md` and `.workaholic/constraints/quality.md`. The observations about completion and adapter code are inferences from the call sites.
