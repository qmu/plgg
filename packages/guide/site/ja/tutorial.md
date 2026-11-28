# 本棚を作る

題名を登録すると、登録順の一覧を HTML で読める小さな本棚を作ります。空のディレクトリで `npm init -y`、`npm pkg set type=module`、`npm install plgg plgg-sql plgg-view plgg-server` を実行してください。TypeScript を直接実行でき、`node:sqlite` が使える Node.js が必要です。この章の例は Node.js 23.9.0 と、このリポジトリでビルドしたライブラリで検証しています。以下の六つのファイルを同じ場所に保存します。

## 1　入力の形を決める

登録用 JSON とデータベースの行には、どちらも title があります。同じ入口を通せば、どちらから来た値にも同じ条件がかかります。`Str` は空文字列を拒みますが、空白だけの題名は通すので、ここで条件を一つ足します。

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

## 2　保存して読み戻す

接続を一つ開き、プロセスが動いている間だけ本棚を保持します。SQL の本文とパラメーターは別々にドライバーに渡します。`null` が出るのはドライバーに値を渡す箇所だけです。一覧では、行を `Book` に変換し終えてから表示側に渡します。

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

## 3　一覧を描く

表示関数が受け取るのは検証済みの `Book` の配列です。空なら空のリストになります。題名をテキストノードに入れると、題名に含まれる & や < は HTML を組み立てる段階でエスケープされます。

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

## 4　リクエストを振り分ける

同じ /books でも、POST は本文を読んで一冊保存し、GET は一覧を返します。JSON の構文と題名の検証を別の段階にすると、どちらで失敗しても保存前に 400 を返せます。読み書きの失敗はサーバー側のエラーとして扱います。

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

## 5　一往復を試す

`node smoke.ts` を実行してください。同じプロセスで登録して読み戻すので、メモリー上の SQLite にも値が残ります。最後の比較は書き込み、並び順のある読み出し、HTML への変換を通ります。エラーで登録した二件が残っていても比較は失敗します。

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

## 6　手元で使う

`node main.ts Atlas` を実行すると、一冊登録して一覧の HTML を端末に出します。ブラウザーで使うには `node main.ts --serve` を実行し、表示された URL を開いてください。最初は本がないのでリストは空です。別の端末で下のコマンドを実行してからページを再読み込みすると、追加した題名が見えます。サーバーを終了すると本棚の中身は消えます。

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
