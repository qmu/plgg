# match で場合分けする

`match` は値と処理の組を受け取ります。次の例では各タグに一つずつ処理を用意します。一方の行を外すと、TypeScript が未処理の場合を検出します。複数の場合を同じ扱いにするには最後に `otherwise` を置けます。

```ts
import { match, pattern } from "plgg";
import type { Box } from "plgg";

type Entry = Box<"Title", string> | Box<"Count", number>;
const label = (entry: Entry): string =>
  match(entry)(
    [pattern("Title")(), (b) => b.content],
    [pattern("Count")(), (b) => String(b.content)],
  );
```
