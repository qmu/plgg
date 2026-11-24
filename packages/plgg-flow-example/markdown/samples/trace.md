---
layout: sheet
description: ノードを選ぶと、つながっている相手が入力・出力の一覧に出ます。押すとその相手へ移動し、移動の履歴を戻る・進むで行き来できます。
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
