---
layout: sheet
description: Route の下流を折りたたみ、展開すると編集した位置が戻ります。
---

# 分岐の折りたたみ

```plgg-flow fill dsl tools=collapse
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
Route -> Backup
```
