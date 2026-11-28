# Box で値の種類を区別する

同じ文字列でも、本の題名と著者名では意味が違います。`box` にタグを渡してから、中に入れる値を渡します。`__tag` で種類を判定し、`content` で値を取り出せます。複数の種類を扱う例は [match](/concepts/match/) にあります。

```ts
import { box } from "plgg";

const title = box("Title")("Field notes");
console.log(title.__tag, title.content); // Title Field notes
```

## 題名を著者名の欄に渡さない

どちらも string のままでは、引数の順を取り違えても型検査を通ります。タグを一つ決めて生成箇所をまとめると、呼び出し側は値の用途まで指定することになります。次の関数の引数には `Author` を渡せません。

タグと中身は別々の約束です。`box` は中身の空白を取り除いたり、不正な値を拒んだりしません。外から届いた入力には、先に `asStr` や独自の条件を適用します。

```ts
import { box, type Box } from "plgg";

type Title = Box<"Title", string>;
const title = box("Title");
const heading = (t: Title) => t.content;

console.log(heading(title("Atlas")));
```

## タグを持つ値を読み直す

デコード済みの値が再び境界を通ることもあります。`asStr` は正しい箱ならそのまま返し、生の文字列なら一度だけ包みます。タグ名だけを見て成功と決めると、中身が空の箱を見落とします。

```ts
import { asStr, box, isStr } from "plgg";

const valid = box("Str")("Atlas");
console.log(isStr("Atlas"), isStr(valid));
console.log(
  asStr(valid).__tag,
  asStr(box("Str")("")).__tag,
);
```
