---
layout: sheet
description: 中心から伸びる軸ごとに案を比べます。費用は lower なので、安い案ほど費用の軸で外側に届きます。
---

# いくつもの条件で形を比べる

```plgg-flow fill dsl
layout radar
axis 速さ 0..10 higher
axis 費用 0..200 lower
axis 品質 0..10 higher
axis 保守しやすさ 0..10 higher
axis 導入の手間 0..10 lower
node 既製品 速さ=8 費用=160 品質=6 保守しやすさ=8 導入の手間=2
node 自作 速さ=6 費用=60 品質=9 保守しやすさ=4 導入の手間=8
node 半自作 速さ=7 費用=100 品質=8 保守しやすさ=7 導入の手間=5
```
