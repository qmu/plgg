---
layout: sheet
description: Trace a request from the storefront to storage and identify the operations between the screen and the database.
---

# Three tiers of a storefront

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer UI Logic Storage
node ProductPage Layer=UI
node Cart Layer=UI
node OrderForm Layer=UI
node Auth Layer=Logic
node ReserveStock Layer=Logic
node ReceiveOrder Layer=Logic
node Payments Layer=Logic
node MemberDB Layer=Storage
node StockDB Layer=Storage
node OrderDB Layer=Storage
node PaymentHistory Layer=Storage
ProductPage -> Cart
Cart -> OrderForm
Cart -> ReserveStock
OrderForm -> Auth
OrderForm -> ReceiveOrder
ReceiveOrder -> ReserveStock
ReceiveOrder -> Payments
Auth -> MemberDB
ReserveStock -> StockDB
ReceiveOrder -> OrderDB
Payments -> PaymentHistory
```
