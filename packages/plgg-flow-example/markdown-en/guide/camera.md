# Position and camera

The first two numbers in `at x y z` are horizontal and vertical coordinates. Increasing x moves a node right and increasing y moves it down. Viewed head-on, a larger z is closer to you. Rotate the diagram and compare the other two nodes with Middle.

```plgg-flow
node Near at -160 0 180
node Middle at 0 0
node Far at 160 0 -180
Near -> Middle
Middle -> Far
```

| Gesture | Effect |
| --- | --- |
| Drag the background | Pan the view. |
| Shift-drag | Select nodes in a rectangle. |
| Command-drag or Ctrl-drag | Rotate the view. |
| Command-scroll or Ctrl-scroll | Zoom in or out. |
| Use two fingers on a touchscreen | Rotate or pinch to zoom. |

In the [layer example](../samples/layers.md), nodes with the same category share a board. In the [room example](../samples/rooms.md), select an axis label to focus on a set of rooms.
