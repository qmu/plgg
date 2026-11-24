---
layout: sheet
description: 接続だけを書いた図です。上から下へ自動で並びます。⌘（Ctrl）を押しながらドラッグして回すと、層が階段状に見えます。
---

# 自動配置

```plgg-flow fill dsl
layout layered down depth
Web -> Gateway
Mobile -> Gateway
Gateway -> Auth
Gateway -> Orders
Gateway -> Catalog
Gateway -> Search
Auth -> Users
Users -> DB
Orders -> Payments
Orders -> Queue
Payments -> Ledger
Queue -> Mailer
Ledger -> Audit
Mailer -> Audit
Catalog -> Cache
Search -> Cache
Cache -> DB
Audit -> Gateway
DB -> Catalog
```
