---
layout: sheet
description: 下の層の store が、上の層の view を参照している（逆向きの依存）。
---

# モジュールの依存

```plgg-flow fill dsl tools=hidden
layout layered down
axis 層 画面 業務 基盤
node pages 層=画面
node view 層=画面
node forms 層=画面
node orders 層=業務
node billing 層=業務
node rules 層=業務
node store 層=基盤
node http 層=基盤
node log 層=基盤
pages -> view
pages -> forms
view -> orders
forms -> orders
forms -> billing
orders -> rules
billing -> rules
orders -> store
billing -> http
rules -> log
store -> view
mark "store -> view"
```
