---
layout: sheet
description: Remove Process with the bypass control. Its incoming and outgoing edges become a direct connection from Source to Result.
---

# Bypass a node

```plgg-flow fill dsl tools=bypass
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
