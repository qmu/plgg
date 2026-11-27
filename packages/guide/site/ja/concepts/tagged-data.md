# Box で値の種類を区別する

同じ文字列でも、本の題名と著者名では意味が違います。`box` にタグを渡してから、中に入れる値を渡します。`__tag` で種類を判定し、`content` で値を取り出せます。複数の種類を扱う例は [match](/concepts/match/) にあります。

```ts
import { box } from "plgg";

const title = box("Title")("Field notes");
console.log(title.__tag, title.content); // Title Field notes
```
