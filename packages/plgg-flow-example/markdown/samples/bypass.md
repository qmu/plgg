---
layout: sheet
description: Process を取り除く操作を試してください。前後の線がつなぎ直され、Source から Result に直接届きます。
---

# 中間ノードの削除

```plgg-flow fill dsl tools=bypass
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
