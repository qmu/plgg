---
layout: sheet
description: Each room holds one combination of service, layer and environment. Select an axis label to focus on the matching part of the diagram.
---

# Rooms by category

```plgg-flow fill dsl tools=hidden
layout rooms
axis Service Members Orders Payments
axis Layer UI Logic Storage
axis Environment Production Staging
view x=Service y=Layer z=Environment
node MemberScreen Service=Members Layer=UI Environment=Production
node MemberAPI Service=Members Layer=Logic Environment=Production
node MemberDB Service=Members Layer=Storage Environment=Production
node OrderScreen Service=Orders Layer=UI Environment=Production
node OrderAPI Service=Orders Layer=Logic Environment=Production
node OrderDB Service=Orders Layer=Storage Environment=Production
node PaymentsAPI Service=Payments Layer=Logic Environment=Production
node PaymentHistory Service=Payments Layer=Storage Environment=Production
node MemberScreen(Staging) Service=Members Layer=UI Environment=Staging
node MemberAPI(Staging) Service=Members Layer=Logic Environment=Staging
node MemberDB(Staging) Service=Members Layer=Storage Environment=Staging
node OrderScreen(Staging) Service=Orders Layer=UI Environment=Staging
node OrderAPI(Staging) Service=Orders Layer=Logic Environment=Staging
node OrderDB(Staging) Service=Orders Layer=Storage Environment=Staging
MemberScreen -> MemberAPI
MemberAPI -> MemberDB
OrderScreen -> OrderAPI
OrderAPI -> OrderDB
OrderAPI -> MemberAPI
OrderAPI -> PaymentsAPI
PaymentsAPI -> PaymentHistory
MemberScreen(Staging) -> MemberAPI(Staging)
MemberAPI(Staging) -> MemberDB(Staging)
OrderScreen(Staging) -> OrderAPI(Staging)
OrderAPI(Staging) -> OrderDB(Staging)
OrderAPI(Staging) -> MemberAPI(Staging)
```
