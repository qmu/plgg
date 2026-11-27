# plgg-board — 座標を画面に投影する

`frontCamera` は正面から見たカメラを作ります。`project(camera)` に空間上の点を渡すと、描画に使う座標が得られます。視点を変えるときは `orbit`、表示範囲をずらすときは `pan` を使います。この計算は DOM に依存せず、[plgg-flow の図](https://plgg-flow.qmu.co.jp/)にも使われています。

```ts
import { frontCamera, project } from "plgg-board";

const camera = frontCamera({ x: 0, y: 0 });
console.log(project(camera)({ x: 20, y: 10, z: 0 }));
```
