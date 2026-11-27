---
layout: sheet
description: ノードを選んで「履歴を追う」を押し、位置や表示名を変えてください。そのノードの変更を順に読めます。
---

# 編集履歴

```plgg-flow fill dsl tools=revisions
node Draft at -224 16
node Review at 24 16
node Publish at 216 16
Draft -> Review
Review -> Publish
```
