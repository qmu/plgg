# 入力・保存・試験のレシピ

[本棚を作る](/tutorial/)で扱った境界ごとに、小さく試せる例を挙げます。

## リクエスト本文を読む

構文エラーと項目の誤りを同じ入口で扱います。空の本文は空のオブジェクトとは違い、JSON として読めません。次の例は本文を一度だけ読み、失敗理由を呼び出し側に返します。

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


## フォームの未入力を扱う

FormData.get の結果にはファイルも含まれます。文字列に変換して通してしまうと、アップロードされたファイルまで題名として登録しかねません。get の戻り値をそのまま検証し、空白だけの値もここで拒みます。

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


## 問い合わせの失敗とゼロ件を分ける

本棚の `store.ts` と同じディレクトリで試します。初期状態ではテーブルがあっても本はゼロ冊です。失敗ならエラーのタグを、成功なら行数を表示すれば、読み込みに失敗した画面に「0 冊」と出さずに済みます。

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


## 同じ検証をテストに残す

本棚の `domain.ts` の隣に `book.spec.ts` として保存し、`npx plgg-test .` で実行します。正しい値だけを試すと、必須項目を外してしまった変更に気づけません。未指定、空白だけ、正しい題名を同じ仕様の三例として残します。

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

[設計の理由](/design/choices/)・[ほかの選択肢](/design/alternatives/)・[型と境界でつまずいたら](/design/friction/)・[パッケージの境界](/design/family/)
