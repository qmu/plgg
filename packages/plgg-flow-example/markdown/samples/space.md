---
layout: sheet
description: 正面で重なる North と South の配線を見てください。⌘ または Ctrl を押しながらドラッグすると、線の奥行きの違いが見えます。
---

# 立体交差

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
