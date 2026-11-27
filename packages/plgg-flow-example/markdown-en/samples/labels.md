---
layout: sheet
description: Type a condition in the label field. The text appears on the edge and the endpoint names stay the same.
---

# Label an edge

```plgg-flow fill dsl tools=labels
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
