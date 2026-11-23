# 図の実例

## 立体交差

交差する 2 本の線は、奥行きが違います。「立体」を押すと手前と奥に分かれます。

```plgg-flow
node North at -225 -100 160
node South at -225 100 -150
node Upper at 220 -95 -150
node Lower at 220 100 160
North -> Lower
South -> Upper
North -> Upper
South -> Lower
```

## グループとネスト

`group` と `in` で入れ子にします。Team を動かすと中身も一緒に動きます。

```plgg-flow
node Team at -250 -100 group
node Design at -40 -50 55 group in Team
node Build at 40 40 -40 in Team
node Review at 105 10 100 in Design
node External at 290 0
Team -> Design
Team -> Build
Build -> External
Review -> External
```

## 計算ノード

`value` を持つノードは、入ってくる接続の値を合計します。

```plgg-flow
node A at -180 -75 value 3
node B at -180 75 value 5
node Sum at 140 0
A -> Sum
B -> Sum
```
