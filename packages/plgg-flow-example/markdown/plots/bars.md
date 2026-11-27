---
layout: sheet
description: 横に四半期、奥に地域を並べます。棒の高さを比べると、東の売上が西を上回る四半期を読み取れます。
---

# 量を 2 つの種類で比べる

```plgg-flow fill dsl
layout bars
axis 売上 0..100 higher
axis 四半期 Q1 Q2 Q3 Q4
axis 地域 東 西 南
node 東1 四半期=Q1 地域=東 売上=40
node 東2 四半期=Q2 地域=東 売上=55
node 東3 四半期=Q3 地域=東 売上=70
node 東4 四半期=Q4 地域=東 売上=92
node 西1 四半期=Q1 地域=西 売上=62
node 西2 四半期=Q2 地域=西 売上=58
node 西3 四半期=Q3 地域=西 売上=45
node 西4 四半期=Q4 地域=西 売上=38
node 南1 四半期=Q1 地域=南 売上=18
node 南2 四半期=Q2 地域=南 売上=30
node 南3 四半期=Q3 地域=南 売上=52
node 南4 四半期=Q4 地域=南 売上=66
```
