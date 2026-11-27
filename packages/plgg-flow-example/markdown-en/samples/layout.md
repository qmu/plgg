---
layout: sheet
description: Move a few nodes, then apply the hierarchical layout to arrange them again using their connections.
---

# Rearrange a graph

```plgg-flow fill dsl tools=layout
node Input at -160 -80
node Route at 160 -80
node Live at -160 80
node Backup at 152 80
Input -> Route
Route -> Live
```
