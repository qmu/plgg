---
layout: sheet
description: リクエストは層を上から下へ落ちる。Report だけが業務の層を飛ばして、画面から直接データを読んでいる。
---

# Webサービスの層

```plgg-flow fill dsl tools=hidden
layout layered down
axis 層 画面 業務 データ
node Web 層=画面
node Mobile 層=画面
node Report 層=画面
node Auth 層=業務
node Orders 層=業務
node Billing 層=業務
node Users 層=データ
node Sales 層=データ
node Ledger 層=データ
Web -> Auth
Mobile -> Auth
Web -> Orders
Mobile -> Orders
Auth -> Users
Orders -> Billing
Orders -> Sales
Billing -> Ledger
Report -> Sales
```
