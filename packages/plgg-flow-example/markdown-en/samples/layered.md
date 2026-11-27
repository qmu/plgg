---
layout: sheet
description: Follow the lines out of Gateway. The connections determine the layers, and the depth option offsets each layer so you can see the steps when you rotate the diagram.
---

# Automatic layout

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
