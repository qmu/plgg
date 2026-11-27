---
layout: sheet
description: Input の出力はすでに 1 本あります。既存の線をダブルクリックして消してから、Input と Backup をつないでください。
---

# 出力数の制限

```plgg-flow fill dsl tools=limit
rule max-outputs 1
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
