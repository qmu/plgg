---
layout: sheet
description: Route の下流を畳むと Live と Backup が隠れます。もう一度展開すると、先ほどの配置で作業を続けられます。
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
