# 一冊の本を探す処理をどう書くか

入力として受け取るのは、JSON をパースした値です。文字列の id は蔵書番号として扱い、同じ文字列でも題名とは区別します。prefix は省略できますが、指定する場合は文字列に限ります。蔵書は 17 番の Atlas 一冊です。入力不備と該当なしを区別し、本が見つかったら prefix を付けて表示します。以下の比較例では、shelf はどれも同じ文字列の Map を指します。

各節の plgg の例では、次のデコーダーと表示関数を使います。入力の検証に成功した場合にだけ検索します。

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

同期の chainResult に render を渡すため、render の戻り値の型には一連の処理で使うエラー型を指定しています。入力不備を返すのは decode だけで、missing を返すのは render だけです。

## TypeScript の例外で呼び出し元まで戻る

**比較用の TypeScript（型検査・実行の対象外）**

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

**同じ処理を plgg で書く**

```ts
import { chainResult, pipe } from "plgg";
import { decode, render } from "./shelf-query.ts";

const show = (raw: unknown) =>
  pipe(decode(raw), chainResult(render));
console.log(show({ id: "17" }), show({ id: 17 }));
```

prefix を省略したときの表示は決まっているので、read で空文字を補えます。show の戻り値は string で、どの例外を捕まえるべきかは型に現れません。依存関係を追加する必要はなく、正常系は通常の関数呼び出しで済みます。plgg では成功時にも ID や結果の箱を作ります。その分、呼び出し側には失敗の理由が伝わるので、「入力を直す」か「検索画面に戻る」かを判断できます。

## Zod・Valibot で入力欄に問題を返す

**比較用の TypeScript（型検査・実行の対象外）**

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

**同じ処理を plgg で書く**

```ts
import { decode, render } from "./shelf-query.ts";

const form = decode({ id: "17", prefix: "# " });
console.log(
  form.isOk() ? render(form.content) : form,
);
```

どちらも検証時にスキーマを実行します。検証後の ID はブランド付きの文字列なので、そのまま Map のキーに使えます。prefix も通常の省略可能なプロパティとして扱えます。フォームでは、issues のパスを対応する入力欄に結び付けます。検索に失敗したときの型やその後の分岐は、アプリ側で決めます。plgg を選ぶ場合は、入力を読む人も画面を作る人も、Option と Result から値を取り出す方法を覚える必要があります。

[Zod](https://zod.dev/api) · [Valibot safeParse](https://valibot.dev/guides/parse-data/) · [Valibot brand](https://valibot.dev/api/brand/)

## fp-ts で既存の Either に続ける

**比較用の TypeScript（型検査・実行の対象外）**

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

**同じ処理を plgg で書く**

```ts
import { chainResult, pipe } from "plgg";
import { decode, render } from "./shelf-query.ts";

console.log(
  pipe(decode({ id: "99" }), chainResult(render)),
);
```

read は先ほどの TypeScript の例と同じ関数です。例外の変換は入口で一度だけ行い、undefined を missing に変えるのは検索後だけです。Either は同期処理の結果を Left または Right で表し、flatMap は Right のときだけ次の処理に進みます。ここまでの処理の順序は plgg の Result と同じで、どちらも各段で結果を表す値を作ります。既存の検索に TaskEither を使っている場合は、実行のタイミングが異なります。TaskEither で組み立てた非同期計算は、呼び出すまで始まりません。plgg の proc は呼び出した時点で Promise を返します。移行時には、箱の名前を決める前に、どの処理が実行を開始するかを決めておきます。

[Either](https://gcanti.github.io/fp-ts/modules/Either.ts.html) · [TaskEither](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)

## Effect で実行の時点を選ぶ

**比較用の TypeScript（型検査・実行の対象外）**

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

**同じ処理を plgg で書く**

```ts
import { proc } from "plgg";
import { decode, render } from "./shelf-query.ts";

console.log(
  await proc({ id: "17" }, decode, render),
);
```

Effect v3 の例でも read を再利用します。prefix の既定値は read で決まり、検索後は該当する本がない場合だけ失敗として扱います。`yield*` の先に進むのは成功したときだけです。show が計算を組み立て、ランタイムが実行します。実行前に either を挟むと、想定した失敗を値として受け取れます。計算がサービスを必要とする場合は、必要なサービスも型に現れます。この一冊を探す例ではサービスを渡す必要はありませんが、呼び出し側でも計算の実行方法を覚える必要があります。plgg で接続を差し替えたい場合は、検索関数を引数に取ります。

[Effect v3 generators](https://effect.website/docs/v3/getting-started/using-generators) · [Effect type](https://effect.website/docs/getting-started/the-effect-type/)

## plgg を選ばない場合と、境界で一緒に使う場合

フォームが担当するのが入力欄ごとの検証までなら、既存の Zod / Valibot のスキーマを残します。plgg に渡すときは、safeParse が成功した場合だけ ID を box に包み、prefix を fromNullable に通します。検証条件が同じなら再検証は不要で、失敗時の issues はそのままフォームに残せます。

呼び出し元がすべて fp-ts を使っているなら、Either のまま渡す方が短く書けます。plgg と併用する場合は、両者の境界を一か所に決めて、Left の理由を err に、Right の値を ok に移します。Effect のサービス供給や実行管理をすでに使っている場合は、Effect の中で処理を完結させます。plgg の呼び出し元には、上の either の結果を同じように Left と Right に分けて変換し、返します。予期しない欠陥まで missing にまとめると、障害を見落としてしまいます。

一件でも失敗すれば終了するスクリプトなら、入口で例外を捕まえるだけで十分です。例外を投げる既存のライブラリを plgg の処理から使う場合は、その関数だけを tryCatch で包みます。呼び出しに失敗した場合と、返った値が不正な場合を区別する例は、[境界での失敗](/design/friction/)で紹介しています。
