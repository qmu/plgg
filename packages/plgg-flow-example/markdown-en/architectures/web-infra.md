---
layout: sheet
description: Find the entry point for incoming traffic, then follow the applications’ connections to the infrastructure they share.
---

# Web infrastructure

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer Entry App Data Platform
node CDN Layer=Entry
node WAF Layer=Entry
node LoadBalancer Layer=Entry
node Web Layer=App
node API Layer=App
node Worker Layer=App
node DB Layer=Data
node Cache Layer=Data
node Queue Layer=Data
node Monitoring Layer=Platform
node LogService Layer=Platform
CDN -> WAF
WAF -> LoadBalancer
LoadBalancer -> Web
LoadBalancer -> API
Web -> API
API -> DB
API -> Cache
API -> Queue
Queue -> Worker
Worker -> DB
API -> LogService
Worker -> LogService
LogService -> Monitoring
```
