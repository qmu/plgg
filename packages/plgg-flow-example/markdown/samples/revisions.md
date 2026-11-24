---
layout: sheet
description: ノードを選んで「履歴を追う」を押し、動かしたり名前を変えたりすると、そのノードに起きた変更が順に並びます。
---

# 編集履歴

```plgg-flow fill dsl tools=revisions
node Draft at -224 16
node Review at 24 16
node Publish at 216 16
Draft -> Review
Review -> Publish
```
