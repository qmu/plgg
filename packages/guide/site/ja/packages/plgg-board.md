# plgg-board — 座標を画面に投影する

`frontCamera` は正面から見たカメラを作ります。`project(camera)` に空間上の点を渡すと、描画に使う座標が得られます。視点を変えるときは `orbit`、表示範囲をずらすときは `pan` を使います。この計算は DOM に依存せず、[plgg-flow の図](https://plgg-flow.qmu.co.jp/)にも使われています。

```ts
import { frontCamera, project } from "plgg-board";

const camera = frontCamera({ x: 0, y: 0 });
console.log(
  project(camera)({ x: 20, y: 10, z: 0 }),
);
```

## 使い方と制約

`project(camera)(point: Point3) → Point3`

元の点と投影後の点を区別すると、カメラを動かすたびに図形を書き換えずに済みます。project は奥行きも返すので、画面上の x、y だけで前後関係を決める必要はありません。図の接続や配置の規則は plgg-flow が扱います。

## ドラッグを座標に戻す

pan(dx, dy)(camera) はカメラの原点をずらします。図形をつかんで動かしたいときは、画面上の移動量を worldDelta(camera, delta, depth) に渡します。拡大中の画面で 10 ピクセル動かした量と、ワールド座標を 10 増やした量は一致するとは限りません。
