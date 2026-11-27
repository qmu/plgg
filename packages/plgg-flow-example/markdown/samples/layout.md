---
layout: sheet
description: ノードをいくつか動かしてから階層の自動配置を選んでください。接続を使って図を並べ直せます。
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
