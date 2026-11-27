---
layout: sheet
description: 条件の入力欄に文字を入れてください。接続先の名前を変えずに、線の上に条件を表示できます。
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
