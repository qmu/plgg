# 三つの図を読む

## 交差する線の前後を確かめる

North と Lower は手前、South と Upper は奥にあります。正面では重なる線も、[視点を回す](./camera.md)と分かれて見えます。

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

## グループの中で接続をたどる

Review は Design の中にあり、Design は Team の中にあります。Review からの線は二つの枠を越えて External に届きます。[グループの操作](../samples/group.md)で Team を動かしてみてください。

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

## 二つの入力を合計する

A と B は値を持ち、どちらも Sum に接続されています。[計算ノードの例](../samples/compute.md)で A を 3 から 4 に変えると、合計が 8 から 9 に変わります。

```plgg-flow
node A at -180 -75 value 3
node B at -180 75 value 5
node Sum at 140 0
A -> Sum
B -> Sum
```
