---
layout: sheet
description: ノードを自由に動かした後、接続の深さから列と行を計算して再配置します。
---

# 階層レイアウト

```plgg-flow fill dsl tools=layout
node Input at -160 -80
node Route at 160 -80
node Live at -160 80
node Backup at 152 80
Input -> Route
Route -> Live
```
