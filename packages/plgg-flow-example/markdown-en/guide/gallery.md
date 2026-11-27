# Read three diagrams

## Look through a crossing

North and Lower are in front. South and Upper are farther back. [Rotate the view](./camera.md) to see the separation between wires that cross when viewed head-on.

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

## Trace an edge out of a group

Review belongs to Design, which belongs to Team. Follow the wire from Review across both group boundaries to External. Try moving Team in the [nested groups example](../samples/group.md).

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

## Add two inputs

A and B each supply a value to Sum. In the [interactive sum example](../samples/compute.md), change A from 3 to 4 and watch the total change from 8 to 9.

```plgg-flow
node A at -180 -75 value 3
node B at -180 75 value 5
node Sum at 140 0
A -> Sum
B -> Sum
```
