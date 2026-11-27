---
layout: sheet
description: Toggle the destination and watch the outgoing edge from Route switch between Live and Backup.
---

# Change a destination

```plgg-flow fill dsl tools=reconnect
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
```
