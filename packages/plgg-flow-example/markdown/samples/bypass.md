---
layout: sheet
description: Process を取り除くと、その入出力を直接つなぎ直します。
---

# 中間ノードの削除

```plgg-flow fill dsl tools=bypass
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
