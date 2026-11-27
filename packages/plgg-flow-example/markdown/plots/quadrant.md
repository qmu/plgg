---
layout: sheet
description: 手間が 5 以下で、効果が 5 以上の仕事を探してください。二つの条件の境界を動かすと候補が変わります。
---

# 効果と手間で分ける

```plgg-flow fill dsl
layout plot
axis 手間 0..10 lower <=5
axis 効果 0..10 higher >=5
node 検索の高速化 手間=3 効果=8
node 請求書の自動化 手間=4 効果=9
node 管理画面の刷新 手間=9 効果=7
node 通知の文言修正 手間=1 効果=3
node 旧APIの廃止 手間=8 効果=2
node 権限の整理 手間=6 効果=8
node ログの整形 手間=2 効果=6
```
