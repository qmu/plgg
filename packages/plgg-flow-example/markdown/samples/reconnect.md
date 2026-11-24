---
layout: sheet
description: 切替ボタンで Route から伸びる接続を Live と Backup の間で付け替えます。
---

# 接続先の変更

```plgg-flow fill dsl tools=reconnect
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
