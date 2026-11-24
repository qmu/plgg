---
layout: sheet
description: 4つ目の軸は、空間そのものを並べて見せます。
---

# 次元を足す

```plgg-flow fill dsl
layout rooms
axis 層 入口 処理 保存
axis 担当 顧客 注文 基盤
axis 環境 本番 検証
axis 地域 東京 大阪
node Web 層=入口 担当=顧客 環境=本番 地域=東京
node Preview 層=入口 担当=顧客 環境=検証 地域=大阪
node Gateway 層=入口 担当=基盤 環境=本番 地域=東京
node Checkout 層=入口 担当=注文 環境=本番 地域=大阪
node Auth 層=処理 担当=顧客 環境=本番 地域=東京
node Orders 層=処理 担当=注文 環境=本番 地域=東京
node Payments 層=処理 担当=注文 環境=本番 地域=大阪
node Sandbox 層=処理 担当=注文 環境=検証 地域=大阪
node Monitor 層=処理 担当=基盤 環境=本番 地域=東京
node Users 層=保存 担当=顧客 環境=本番 地域=東京
node Ledger 層=保存 担当=注文 環境=本番 地域=大阪
node Fixtures 層=保存 担当=注文 環境=検証 地域=大阪
node Logs 層=保存 担当=基盤 環境=本番 地域=東京
node Trace 層=保存 担当=基盤 環境=検証 地域=大阪
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
Trace -> Logs
```
