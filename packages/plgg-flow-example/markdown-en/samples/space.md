---
layout: sheet
description: Look at the wires from North and South where they cross. Hold Command or Ctrl and drag to see the gap between them.
---

# Depth at a crossing

```plgg-flow fill dsl tools=views,hidden
node North at -224 -112 160
node South at -224 112 -150
node Upper at 224 -112 -150
node Lower at 224 112 160
North -> Lower
South -> Upper
North -> Upper
South -> Lower
```
