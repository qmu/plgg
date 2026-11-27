---
layout: sheet
description: Input already has one outgoing edge. Double-click that edge to remove it, then connect Input to Backup.
---

# Limit outgoing edges

```plgg-flow fill dsl tools=limit
rule max-outputs 1
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
