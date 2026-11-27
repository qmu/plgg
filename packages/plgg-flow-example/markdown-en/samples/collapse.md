---
layout: sheet
description: Fold the branch below Route to hide Live and Backup. Expand it to return to the positions you were editing.
---

# Fold a branch

```plgg-flow fill dsl tools=collapse
node Input at -224 16
node Route at 0 16
node Live at 224 -80
node Backup at 216 80
Input -> Route
Route -> Live
Route -> Backup
```
