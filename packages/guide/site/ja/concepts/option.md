# Option で省略できる値を扱う

副題の入力が任意なら、空欄からエラーを作る必要はありません。`fromNullable` は `null` と `undefined` を `None`、それ以外を `Some` にします。空文字列も値として残ります。表示するときだけ `getOr` で既定値を指定できます。

```ts
import { fromNullable, getOr, pipe } from "plgg";

const subtitle = (value: string | undefined) =>
  pipe(fromNullable(value), getOr("—"));

console.log(subtitle(undefined)); // —
```
