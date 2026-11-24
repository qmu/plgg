---
layout: sheet
description: 通販サイトの3層です。軸を1つ足すと、ノードが層ごとの板に乗ります。
---

# レイヤーに分ける

```plgg-flow fill dsl tools=hidden
layout layered down
axis 層 画面 処理 永続化
node 商品ページ 層=画面
node カート 層=画面
node 注文フォーム 層=画面
node 認証 層=処理
node 在庫引当 層=処理
node 注文受付 層=処理
node 決済 層=処理
node 会員DB 層=永続化
node 在庫DB 層=永続化
node 注文DB 層=永続化
node 決済履歴 層=永続化
商品ページ -> カート
カート -> 注文フォーム
カート -> 在庫引当
注文フォーム -> 認証
注文フォーム -> 注文受付
注文受付 -> 在庫引当
注文受付 -> 決済
認証 -> 会員DB
在庫引当 -> 在庫DB
注文受付 -> 注文DB
決済 -> 決済履歴
```
