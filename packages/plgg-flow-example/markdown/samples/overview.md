---
layout: sheet
description: 縮小図のノードを押すと、メインビューがそのノードを中心に移動します。
---

# ミニマップ

```plgg-flow fill dsl tools=minimap
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
