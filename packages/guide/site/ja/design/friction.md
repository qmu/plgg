# 型と境界でつまずいたら

本棚の例では、実装・仕様・修正履歴で確認できる挙動を小さな例で再現しています。画面表示や HTTP ステータスの選び方は、それらをこの本棚に当てはめた場合の推論です。

## 検証済みなのに引数が unknown になる

`const show = matchOption(() => "—", s => s.trim())` を書くと、コンパイラは `TS18046: 's' is of type 'unknown'.` を返します。後から `pipe(value, show)` と書いても、別の式で作った show の引数まで推論は戻りません。空の場合と値がある場合で戻り値をそろえ、値を受ける枝に引数の型を書きます。注釈を付けた関数は pipe に渡すときにも検査されます。数値の Option には使えません。

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

## 枝を一つ足したら表示の型がそろわない

冊数の欄で `matchOption(() => "—", (n: number) => n)` と書くと、Some の枝は数値を返します。matchOption の二つの枝は同じ戻り値の型 R を使うため、`TS2345` のエラーが出ます。理由は `Type 'number' is not assignable to type 'string'.` と表示されます。値がある枝だけを直すと、後から空の枝を変更するときに、表示に必要な型が読み取りにくくなります。欄に入れるのは文字列と決め、両方の枝に戻り値の型を書きます。戻り値の型がそろっていれば推論できる場合もあります。両方に型を書いておけば、どちらを変更しても、その枝で型の食い違いが見つかります。

```ts
import { matchOption, none, some } from "plgg";

const copies = matchOption(
  (): string => "—",
  (n: number): string => String(n),
);
console.log(copies(none()), copies(some(0)));
```

二つの枝で R を共有する定義は `Disjunctives/Option.ts` にあります。上の冊数欄と冒頭の trim は、規約にある型推論の例をもとに作ったもので、過去の不具合報告に基づくものではありません。

タグ付きの値を match で表示する場合も、二つの枝の戻り値を表示先の型にそろえます。下の Some の枝で String を外すと、その枝が返す数値と戻り値に指定した型が一致せず、そこで型検査に失敗します。

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

## 成功の箱を重ねてしまう

`mapOption(first)(some(""))` の外側は Some です。first 自身が Option を返すので、中には None が入っています。呼び出し側に必要なのが「先頭の文字があるか」だけなら chainOption で一段にします。Result を返す検証に mapResult を使って Ok(Err(...)) になったときも同じで、chainResult を使います。

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

## 検索に成功しても本がない

一覧では「該当なし」を正常な結果として扱っても、一冊を開く画面ではエラーとして扱いたい場合があります。`toOption(row)` とすると DB エラーの理由が失われ、成功時には Option が二重になります。一冊を開く時点で成功側の値だけを okOr に渡すと、該当なしの場合にだけ missing を割り当てられます。逆向きに toOption を使えるのは、どの失敗も同じ空欄で表示してよい場合に限られます。

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

変換の向きは `Disjunctives/Option.spec.ts` の okOr と toOption のテストで確認できます。画面ごとの扱いは、この仕様から導いたものです。

## パスの次の区間があるとは限らない

ルーターの `Routing/usecase/matchSegments.ts` では、`fromNullable(parts[i])` で区間を読み取ります。配列の型が string[] でも、末尾を越えた位置の値は undefined です。そこで `parts[i].trim()` を呼ぶと例外が発生し、noUncheckedIndexedAccess を有効にすると `TS2532: Object is possibly 'undefined'.` が出ます。空文字と範囲外を区別したまま、区間が存在する場合だけ処理します。

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

## 副題を消したら読み戻せない

書き出し側が `{ subtitle: null }` を送ると、キーは残ります。forOptionProp はキーがあると文字列のキャスターを呼ぶため、この場合は Err を返します。None をそのまま JSON.stringify に渡しても、タグ付きの値が残ります。送信用のオブジェクトを作るときに、None の枝だけキーを省きます。空文字も有効な仕様なら、Some("") の場合はそのまま空文字を送ります。

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

キーの有無による分岐は `Disjunctives/ObjLike.ts` で、キーを省略すると None になることは同じディレクトリの spec で確認できます。

## 外部の関数が失敗する場所を二つに分ける

`JSON.parse(raw).trim()` は、壊れた JSON でも、正しく読めた数値でも例外になります。tryCatch で外部関数の例外を捕まえても、成功値の形までは決まりません。下では成功値を unknown で受け、文字列として使えるかを asStr に判定させます。順に試すと、構文の誤りは Defect、数値は InvalidError になります。

```ts
import { asStr, proc, tryCatch } from "plgg";

const parse = tryCatch((s: string): unknown =>
  JSON.parse(s),
);
const read = (s: string) => proc(s, parse, asStr);
console.log(await read("{"), await read("42"));
```

外部から受け取った関数にも同じ境界があります。plgg-foundry の `Foundry/usecase/operate.ts` では、登録された処理を `tryCatch(processorResult.content.content.fn)` で包んでから呼び出します。上の parse は、その呼び出しを JSON パーサーに置き換えた例です。既定の変換で例外を Defect にする経緯は、コミット `b717ed3e` に記録されています。

## 非同期の途中で HTTP の応答を決めてしまう

`read(raw).then(book => save(book))` の book は検証済みの本ではなく Result です。Promise の then が開くのは Promise だけです。proc に検証と保存を順に渡すと、Err の後で保存を呼びません。外部ライブラリが返す Promise の拒否は、その呼び出しを tryCatch で包んで受けます。

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

`(await register(raw)).content.message` は読めません。成功時には中身が数値で、失敗側にも各段の理由と Defect が残ります。段を加えるたびに呼び出し側に同じ分岐を書くと、理由が増えるたびに直す場所も増えます。上の例では HTTP に返す段で一度だけ mapErr を使い、入力不備を 400、登録済みの題名を 409、予期しない失敗を 500 と決めています。個別に再試行する処理があるなら、その判断が済むまで元の理由を残します。エラー型の和はコミット `c9ecc6e2` と `Flowables/proc.spec.ts` の型検査で確認できます。

## クライアントで 404 の本文まで読んでしまう

サーバー側と同じ順序で `proc(url, get, decodeJsonBody(asStr))` と書くと、404 の本文にもデコーダーが適用されます。plgg-fetch は HTTP 応答を受け取ると、404 でも Ok を返します。接続に失敗した場合は Err を返します。本文の型を調べる前に、通信の失敗と HTTP ステータスをそれぞれ画面でどう扱うか決めます。proc でも分岐は書けますが、どちらの枝でも結果を表示して処理を終えるなら、await の直後に分岐をまとめる方が自然です。

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

この例では、外部サーバーを使わずに成功時の処理を実行します。404 が Ok に、接続拒否が NetworkError になることは、`plgg-fetch/src/domain/usecase/request.spec.ts` で確認できます。応答を確認してから本文を読む実例は `plgg-fetch/example.ts` にあります。
