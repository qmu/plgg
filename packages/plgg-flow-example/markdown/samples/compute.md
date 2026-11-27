---
layout: sheet
description: A と B の値を変えてください。Sum には接続された入力の合計が表示されるので、線を外しても結果が変わります。
---

# 計算ノード

```plgg-flow fill dsl tools=computed
node A at -192 -80 value 3
node B at -192 80 value 5
node Sum at 128 16
A -> Sum
B -> Sum
```
