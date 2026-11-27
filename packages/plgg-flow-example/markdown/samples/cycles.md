---
layout: sheet
description: Result から Source に戻る線を引いてみてください。rule acyclic が、新しく輪を作る接続を拒みます。
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
