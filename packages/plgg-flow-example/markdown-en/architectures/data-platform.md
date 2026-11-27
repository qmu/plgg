---
layout: sheet
description: Trace a path from a source to a report. Each path enters the data lake before the data is transformed for use.
---

# A data platform

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer Ingestion Storage Transform Serving
node CoreDB Layer=Ingestion
node AppLog Layer=Ingestion
node ExternalAPI Layer=Ingestion
node DataLake Layer=Storage
node SalesTable Layer=Transform
node EventsTable Layer=Transform
node MembersTable Layer=Transform
node Dashboard Layer=Serving
node RecommendationModel Layer=Serving
node BillingJob Layer=Serving
CoreDB -> DataLake
AppLog -> DataLake
ExternalAPI -> DataLake
DataLake -> SalesTable
DataLake -> EventsTable
DataLake -> MembersTable
SalesTable -> Dashboard
MembersTable -> Dashboard
EventsTable -> RecommendationModel
MembersTable -> RecommendationModel
SalesTable -> BillingJob
```
