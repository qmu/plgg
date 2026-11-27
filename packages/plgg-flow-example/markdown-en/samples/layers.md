---
layout: sheet
description: Follow OrderForm to OrderDB. Each card sits on the board named by its layer attribute.
---

# One board per layer

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
