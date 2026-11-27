---
layout: sheet
description: Follow dependencies from the outer layers inward. No dependency leads from the entities back to an outer layer.
---

# Clean architecture

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer Framework Adapter UseCase Entity
node Web Layer=Framework
node DB Layer=Framework
node Mail Layer=Framework
node Controller Layer=Adapter
node RepositoryImpl Layer=Adapter
node Notifications Layer=Adapter
node PlaceOrder Layer=UseCase
node DeductStock Layer=UseCase
node Orders Layer=Entity
node Product Layer=Entity
node Members Layer=Entity
Web -> Controller
DB -> RepositoryImpl
Mail -> Notifications
Controller -> PlaceOrder
RepositoryImpl -> PlaceOrder
RepositoryImpl -> DeductStock
Notifications -> PlaceOrder
PlaceOrder -> DeductStock
PlaceOrder -> Orders
PlaceOrder -> Members
DeductStock -> Product
```
