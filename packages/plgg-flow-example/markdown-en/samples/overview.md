---
layout: sheet
description: Select a node in the minimap to center it in the main view while keeping the whole graph in sight.
---

# Navigate with the minimap

```plgg-flow fill dsl tools=minimap
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
