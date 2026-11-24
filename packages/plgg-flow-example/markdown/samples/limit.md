---
layout: sheet
description: Input から Backup へ接続してみてください。既存の出力をダブルクリックで消すと、新しい出力を作れます。
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
