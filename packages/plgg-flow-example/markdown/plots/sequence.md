---
layout: sheet
description: 注文の一往復。利用者側とサーバー側を奥行きで分けて、境界を越えるやりとりを見せます。
---

# やりとりの順

```plgg-flow fill dsl
layout sequence
axis 側 利用者側 サーバー側
node 利用者 側=利用者側
node 画面 側=利用者側
node 注文API 側=サーバー側
node 決済 側=サーバー側
node 注文DB 側=サーバー側
利用者 -> 画面 "注文する"
画面 -> 注文API "POST /orders"
注文API -> 決済 "与信"
決済 -> 注文API "承認"
注文API -> 注文DB "保存"
注文API -> 画面 "201 Created"
画面 -> 利用者 "完了を表示"
```
