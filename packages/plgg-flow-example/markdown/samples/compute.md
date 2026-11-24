---
layout: sheet
description: 二つの入力を変えると、Sum の値が入力エッジを経由して更新されます。接続を外すと合計も変わります。
---

# 計算ノード

```plgg-flow fill dsl tools=computed
node A at -192 -80 value 3
node B at -192 80 value 5
node Sum at 128 16
A -> Sum
B -> Sum
```
