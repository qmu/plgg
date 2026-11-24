---
layout: sheet
description: 軸を1つ足すと、ノードが層ごとの面に乗ります。
---

# レイヤーに分ける

```plgg-flow fill dsl
layout layered down
axis 層 画面 業務 データ
node Web 層=画面
node Mobile 層=画面
node Checkout 層=画面
node Auth 層=業務
node Orders 層=業務
node Catalog 層=業務
node Payments 層=業務
node Users 層=データ
node Stock 層=データ
node Ledger 層=データ
Web -> Checkout
Mobile -> Checkout
Checkout -> Auth
Checkout -> Catalog
Checkout -> Orders
Auth -> Orders
Catalog -> Orders
Orders -> Payments
Auth -> Users
Catalog -> Stock
Orders -> Stock
Payments -> Ledger
```
