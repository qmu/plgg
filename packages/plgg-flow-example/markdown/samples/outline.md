---
layout: sheet
description: 入れ子になったグループを一覧でたどれます。グループを開くと中身が並び、選ぶと図の上でそのノードへ移動します。
---

# グループ一覧

```plgg-flow fill dsl tools=outline
node Company at 0 0 group height 192 width 512
node Sales at -128 16 16 group in Company height 96 width 224
node Dev at 128 16 16 group in Company height 96 width 224
node Alice at -176 32 32 in Sales
node Bob at -80 32 32 in Sales
node Carol at 80 32 32 in Dev
node Dave at 176 32 32 in Dev
Alice -> Carol
Bob -> Dave
```
