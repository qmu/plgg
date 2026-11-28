# plggmatic — 画面の部品を選ぶ

plggmatic は [plgg-view](/packages/plgg-view/) の `Html` として使える部品とレイアウトを提供します。`plggmatic-example` はその使用例です。[plggmatic カタログ](https://plggmatic.qmu.co.jp/)で、部品の見た目と組み合わせ方を確認できます。

## 使い方と制約

`button<Msg>(props: ButtonProps<Msg>) → Html<Msg, "button">`

ボタンにはラベル、押したときのメッセージ、無効状態を渡します。状態を変更するのはメッセージを受けた側です。disabled は実際の HTML 属性になり、そのときクリックのハンドラーは付きません。横に列を開く画面では、同じ部品を宣言やレイアウトと組み合わせます。テーマ用の関数は plggmatic/style にまとまっています。

```ts
import { button } from "plggmatic";
import { renderToString } from "plgg-view";

console.log(
  renderToString(
    button({
      label: "Save",
      onPress: "Save",
      disabled: true,
    }),
  ),
);
```

## 表示だけを試験する

画面を起動せず、部品がどんな HTML を返すかを調べられます。たとえば必須項目が未入力の間は「登録」を押せないという仕様なら、無効状態の属性を調べます。メッセージを受けた後のモデルの変更は別の試験で扱います。画面全体で確かめるときは [リファレンスアプリ](/packages/plggmatic-example/)を参照してください。

```ts
import { button } from "plggmatic";
import { renderToString } from "plgg-view";
import {
  check,
  test,
  toContain,
} from "plgg-test";

test("an incomplete form disables registration", () =>
  check(
    renderToString(
      button({
        label: "Register",
        disabled: true,
        onPress: "Register",
      }),
    ),
    toContain("disabled"),
  ));
```
