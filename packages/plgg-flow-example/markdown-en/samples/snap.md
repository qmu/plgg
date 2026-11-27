---
layout: sheet
description: Move a node, then change the grid spacing to 8 in the DSL. Use snap off to place a node between grid lines.
---

# Snap to a grid

```plgg-flow fill dsl tools=snap
snap 16
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
