# Build a bookshelf

Register titles and read them back in insertion order as HTML. In an empty directory run `npm init -y`, `npm pkg set type=module`, and `npm install plgg plgg-sql plgg-view plgg-server`. Use Node with native TypeScript execution and node:sqlite. The examples were checked with Node.js 23.9.0 and libraries built from this checkout. Save the six files below together.

## 1. Define a valid book

An incoming JSON record and a database row share a title field. Route both through one decoder. `Str` rejects an empty string but accepts whitespace, so add a rule for this application.

### `domain.ts`

```ts
import {
  asObj,
  asStr,
  cast,
  forProp,
  refine,
  type InvalidError,
  type Obj,
  type Result,
  type Str,
} from "plgg";

export type Book = Obj<{ title: Str }>;

const asTitle = (input: unknown) =>
  cast(
    input,
    asStr,
    refine(
      (s: Str) => s.content.trim().length > 0,
      "Enter a nonblank title",
    ),
  );

export const asBook = (
  input: unknown,
): Result<Book, InvalidError> =>
  cast(input, asObj, forProp("title", asTitle));
```

## 2. Store and retrieve titles

Keep one SQLite connection for the lifetime of the process. Send the SQL text and its bindings to the driver separately. Convert an absent parameter to `null` at the driver boundary. Decode every returned row before exposing the list to the view.

### `store.ts`

```ts
import { DatabaseSync } from "node:sqlite";
import { matchOption, proc, some } from "plgg";
import {
  decodeRows,
  exec,
  query,
  sql,
  type Db,
  type Sql,
  type SqlValue,
} from "plgg-sql";
import { asBook, type Book } from "./domain.ts";

const conn = new DatabaseSync(":memory:");
conn.exec(
  "CREATE TABLE books (title TEXT NOT NULL)",
);

const bindings = (s: Sql) =>
  s.content.params.map(
    matchOption(
      () => null,
      (v: SqlValue) =>
        typeof v === "boolean" ? Number(v) : v,
    ),
  );

const db: Db = {
  all: async (s) =>
    conn
      .prepare(s.content.text)
      .all(...bindings(s)),
  run: async (s) => {
    const r = conn
      .prepare(s.content.text)
      .run(...bindings(s));
    return {
      changes: Number(r.changes),
      lastInsertId: some(
        Number(r.lastInsertRowid),
      ),
    };
  },
  execScript: async (s) => conn.exec(s),
  begin: async () => conn.exec("BEGIN"),
  commit: async () => conn.exec("COMMIT"),
  rollback: async () => conn.exec("ROLLBACK"),
};

export const addBook = (book: Book) =>
  exec(db)(
    sql`INSERT INTO books(title) VALUES (${book.title.content})`,
  );

export const books = () =>
  proc(
    sql`SELECT title FROM books ORDER BY rowid`,
    query(db),
    decodeRows(asBook),
  );
```

## 3. Render the list

The `view` receives validated books. An empty collection gives an empty list. Putting the title in a text node makes the renderer escape characters such as & and < in the resulting HTML.

### `view.ts`

```ts
import {
  el,
  renderToString,
  text,
} from "plgg-view";
import type { Book } from "./domain.ts";

export const list = (books: readonly Book[]) =>
  renderToString(
    el(
      "ul",
      [],
      books.map((book) =>
        el("li", [], [text(book.title.content)]),
      ),
    ),
  );
```

## 4. Dispatch requests

POST and GET share a path. POST parses the body, checks the title and writes one row. Both parsing and validation can return 400 before the write. A read or write failure becomes a server error.

### `app.ts`

```ts
import {
  chainResult,
  decodeJson,
  isErr,
  mapErr,
  type InvalidError,
  mapResult,
  ok,
  pipe,
} from "plgg";
import {
  badRequest,
  get,
  htmlResponse,
  internalError,
  post,
  textResponse,
  toFetch,
  web,
} from "plgg-server";
import { asBook } from "./domain.ts";
import { addBook, books } from "./store.ts";
import { list } from "./view.ts";

export const handle = toFetch(
  pipe(
    web(),
    post("/books", async (c) => {
      const book = pipe(
        decodeJson(c.req.body),
        chainResult(asBook),
        mapErr((e: InvalidError) =>
          badRequest(e.content.message),
        ),
      );
      if (isErr(book)) return book;
      const saved = await addBook(book.content);
      return isErr(saved)
        ? mapErr(() =>
            internalError("Write failed"),
          )(saved)
        : ok(textResponse("Saved"));
    }),
    get("/books", async () =>
      pipe(
        await books(),
        mapResult(list),
        mapResult((html: string) =>
          htmlResponse(html),
        ),
        mapErr(() =>
          internalError("Read failed"),
        ),
      ),
    ),
  ),
);
```

## 5. Exercise the round trip

Run `node smoke.ts`. All requests share the in-memory database. The final assertion exercises the insert, ordered read and HTML rendering. It also catches either rejected submission slipping into the database.

### `smoke.ts`

```ts
import assert from "node:assert/strict";
import { handle } from "./app.ts";

const url = "http://localhost/books";
const submit = (body: string) =>
  handle(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    }),
  );

const read = async () =>
  (await handle(new Request(url))).text();

assert.equal(await read(), "<ul></ul>");
assert.equal((await submit("{")).status, 400);
assert.equal(
  (await submit('{"title":" "}')).status,
  400,
);
assert.equal(
  (await submit('{"title":"A & B"}')).status,
  200,
);
assert.equal(
  await read(),
  "<ul><li>A &amp; B</li></ul>",
);
assert.equal(
  (await submit('{"title":"Maps"}')).status,
  200,
);
assert.equal(
  await read(),
  "<ul><li>A &amp; B</li><li>Maps</li></ul>",
);
assert.equal(
  (
    await handle(
      new Request("http://localhost/missing"),
    )
  ).status,
  404,
);
```

## 6. Use the bookshelf

Run `node main.ts Atlas` to register a book and print the list as HTML in your terminal. For the browser, run `node main.ts --serve` and open the printed URL. The list starts empty. Run the command below from a second terminal and refresh the page to see the title. Stopping the server discards the in-memory collection.

### `main.ts`

```ts
import { serve } from "plgg-server/node";
import { handle } from "./app.ts";

const url = "http://127.0.0.1:3000/books";
const preview = async (title: string) => {
  const saved = await handle(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ title }),
    }),
  );
  return saved.ok
    ? (await handle(new Request(url))).text()
    : saved.text();
};

if (process.argv.includes("--serve")) {
  serve(
    { hostname: "127.0.0.1", port: 3000 },
    () => console.log(url),
  )(handle);
} else {
  console.log(
    await preview(
      process.argv.slice(2).join(" "),
    ),
  );
}
```

```sh
curl -H 'Content-Type: application/json' \
  -d '{"title":"Field notes"}' \
  http://127.0.0.1:3000/books
```
