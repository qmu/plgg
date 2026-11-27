---
layout: sheet
description: Ship を選ぶと、入力側に Stock と Payment、出力側に Notify が並びます。一覧から相手へ移動できます。
---

# 配線をたどる

```plgg-flow fill dsl tools=trace
node Order at -256 16
node Stock at -32 -80
node Payment at -40 80
node Ship at 192 16
node Notify at 376 16
Order -> Stock "在庫確認"
Order -> Payment "決済"
Stock -> Ship
Payment -> Ship
Ship -> Notify
```
