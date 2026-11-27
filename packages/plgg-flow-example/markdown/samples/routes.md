---
layout: sheet
description: 経路を切り替え、ノードを動かしてください。同じ両端を直線、直角の折れ線、曲線で結べます。
---

# エッジの経路

```plgg-flow fill dsl tools=routes,snap
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
