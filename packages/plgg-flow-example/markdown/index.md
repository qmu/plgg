# 受注フロー

カートから受注 API へ注文を送ります。「立体」で視点を変え、「図のソース」を開くと、このページ上で接続やラベルを編集できます。

```plgg-diagram
diagram orders {
  group shop "店舗" {
    node cart "カート" { out submit: Order }
  }
  node api "受注 API" { in receive: Order }
  edge checkout: cart.submit -> api.receive "注文を送る"
}
```
