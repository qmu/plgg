---
layout: sheet
description: ノードを動かしてから、DSL の snap を 8 に変えてください。snap off にすると格子の間にも置けます。
---

# グリッド吸着

```plgg-flow fill dsl tools=snap
snap 16
node Source at -200 -48
node Process at 24 16
node Result at 216 -48
Source -> Process
Process -> Result
```
