---
layout: sheet
description: 子のないノードに人数を書きます。親の幅は配下の人数の合計を表すので、同じ段の部署の規模を比較できます。
---

# 全体が何でできているか

```plgg-flow fill dsl
layout tree
axis 人数
会社 -> 開発
会社 -> 営業
会社 -> 管理
開発 -> 基盤
開発 -> 画面
開発 -> 品質
営業 -> 国内
営業 -> 海外
node 基盤 人数=6
node 画面 人数=14
node 品質 人数=4
node 国内 人数=9
node 海外 人数=5
node 管理 人数=4
```
