---
layout: sheet
description: Try connecting Result back to Source. The acyclic rule rejects the new edge because it would close a cycle.
---

# Prevent cycles

```plgg-flow fill dsl tools=cycles
rule acyclic
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
