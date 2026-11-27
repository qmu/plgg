---
layout: sheet
description: Gateway から出る線をたどってください。接続順をもとに段ができ、depth を指定すると各段の奥行きも変わります。
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
