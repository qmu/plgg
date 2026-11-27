---
layout: sheet
description: Assigning region to columns repeats the same room layout for Tokyo and Osaka. Follow the link between the member databases across the two regions.
---

# Compare regions

```plgg-flow fill dsl
layout rooms
axis Service Members Orders Payments
axis Layer UI Logic Storage
axis Environment Production Staging
axis Region Tokyo Osaka
view x=Service y=Layer z=Environment column=Region
node MemberScreen Service=Members Layer=UI Environment=Production Region=Tokyo
node MemberAPI Service=Members Layer=Logic Environment=Production Region=Tokyo
node MemberDB Service=Members Layer=Storage Environment=Production Region=Tokyo
node OrderScreen Service=Orders Layer=UI Environment=Production Region=Tokyo
node OrderAPI Service=Orders Layer=Logic Environment=Production Region=Tokyo
node OrderDB Service=Orders Layer=Storage Environment=Production Region=Tokyo
node PaymentsAPI Service=Payments Layer=Logic Environment=Production Region=Tokyo
node PaymentHistory Service=Payments Layer=Storage Environment=Production Region=Tokyo
node MemberScreen(Staging) Service=Members Layer=UI Environment=Staging Region=Tokyo
node MemberAPI(Staging) Service=Members Layer=Logic Environment=Staging Region=Tokyo
node MemberDB(Staging) Service=Members Layer=Storage Environment=Staging Region=Tokyo
node OrderScreen(Staging) Service=Orders Layer=UI Environment=Staging Region=Tokyo
node OrderAPI(Staging) Service=Orders Layer=Logic Environment=Staging Region=Tokyo
node OrderDB(Staging) Service=Orders Layer=Storage Environment=Staging Region=Tokyo
node MemberScreen(Osaka) Service=Members Layer=UI Environment=Production Region=Osaka
node MemberAPI(Osaka) Service=Members Layer=Logic Environment=Production Region=Osaka
node MemberDB(Osaka) Service=Members Layer=Storage Environment=Production Region=Osaka
node OrderScreen(Osaka) Service=Orders Layer=UI Environment=Production Region=Osaka
node OrderAPI(Osaka) Service=Orders Layer=Logic Environment=Production Region=Osaka
node OrderDB(Osaka) Service=Orders Layer=Storage Environment=Production Region=Osaka
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
MemberScreen(Osaka) -> MemberAPI(Osaka)
MemberAPI(Osaka) -> MemberDB(Osaka)
OrderScreen(Osaka) -> OrderAPI(Osaka)
OrderAPI(Osaka) -> OrderDB(Osaka)
OrderAPI(Osaka) -> MemberAPI(Osaka)
MemberDB -> MemberDB(Osaka)
OrderDB -> OrderDB(Osaka)
```
