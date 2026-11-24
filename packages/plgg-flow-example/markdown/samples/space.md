---
layout: sheet
description: 交差している2本の線の間を見てください。⌘（Ctrl）を押しながらドラッグして回すと、手前と奥に分かれます。
---

# 立体交差

```plgg-flow fill dsl
node North at -224 -112 160
node South at -224 112 -150
node Upper at 224 -112 -150
node Lower at 224 112 160
North -> Lower
South -> Upper
North -> Upper
South -> Lower
```
