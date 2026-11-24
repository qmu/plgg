---
layout: sheet
description: 条件を入力すると、分岐の接続線に表示されます。
---

# エッジのラベル

```plgg-flow fill dsl tools=labels
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
