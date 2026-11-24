---
layout: sheet
description: Result → Source を接続してみてください。循環する接続を拒否し、Source → Result は許可します。
---

# 循環の防止

```plgg-flow fill dsl tools=cycles
rule acyclic
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
