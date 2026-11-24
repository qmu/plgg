---
layout: sheet
description: 外からの通信は入口を必ず通る。基盤の部品は、全部のアプリから使われる。
---

# Web システムの構成

```plgg-flow fill dsl tools=hidden
layout layered down
axis 層 入口 アプリ データ 基盤
node CDN 層=入口
node WAF 層=入口
node ロードバランサ 層=入口
node Web 層=アプリ
node API 層=アプリ
node ワーカー 層=アプリ
node DB 層=データ
node キャッシュ 層=データ
node キュー 層=データ
node 監視 層=基盤
node ログ基盤 層=基盤
CDN -> WAF
WAF -> ロードバランサ
ロードバランサ -> Web
ロードバランサ -> API
Web -> API
API -> DB
API -> キャッシュ
API -> キュー
キュー -> ワーカー
ワーカー -> DB
API -> ログ基盤
ワーカー -> ログ基盤
ログ基盤 -> 監視
```
