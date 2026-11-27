---
layout: sheet
description: 縮小図のノードを選んでください。図全体のどこを見ているか確かめながら、目的のノードを中央に移せます。
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
