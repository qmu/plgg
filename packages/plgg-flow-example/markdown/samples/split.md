---
layout: sheet
description: 挿入ボタンを押すと、Source から Process への線が 2 本に分かれ、新しいノードを経由します。
---

# エッジに挿入

```plgg-flow fill dsl tools=split
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
