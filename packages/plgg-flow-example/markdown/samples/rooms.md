---
layout: sheet
description: ノードに属性を書くと、軸ごとの部屋に自動で入ります。⌘（Ctrl）を押しながらドラッグして回すと、どこに何があるかが立体で分かります。axis の x・y・z を入れ替えると、分け方が変わります。
---

# 部屋に分ける

```plgg-flow fill dsl
layout rooms
axis x 層 入口 処理 保存
axis y 担当 顧客 注文 基盤
axis z 環境 本番 検証
node Web 層=入口 担当=顧客 環境=本番
node Preview 層=入口 担当=顧客 環境=検証
node Gateway 層=入口 担当=基盤 環境=本番
node Checkout 層=入口 担当=注文 環境=本番
node Auth 層=処理 担当=顧客 環境=本番
node Orders 層=処理 担当=注文 環境=本番
node Payments 層=処理 担当=注文 環境=本番
node Sandbox 層=処理 担当=注文 環境=検証
node Monitor 層=処理 担当=基盤 環境=本番
node Users 層=保存 担当=顧客 環境=本番
node Ledger 層=保存 担当=注文 環境=本番
node Fixtures 層=保存 担当=注文 環境=検証
node Logs 層=保存 担当=基盤 環境=本番
node Trace 層=保存 担当=基盤 環境=検証
Web -> Gateway
Checkout -> Gateway
Gateway -> Auth
Gateway -> Orders
Auth -> Users
Orders -> Payments
Payments -> Ledger
Orders -> Monitor
Monitor -> Logs
Preview -> Sandbox
Sandbox -> Fixtures
Sandbox -> Trace
```
