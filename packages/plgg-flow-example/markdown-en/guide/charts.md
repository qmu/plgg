# Choose a chart layout

Start a sheet with one `layout` line. The following `axis` lines tell the chart how to read the data. For example, bars compare sales by region, while a stack shows each month’s total. Follow a layout link to open its editable example in the next column.

## Compare options and quantities

| Layout and example | Axes and data |
| --- | --- |
| [`layout plot`](../plots/options.md) | Declare two or three numeric position axes and give each node a value on each. The axes take x, y and z in declaration order. Assign roles with a line such as `view x=Cost y=Performance` to change the order. One extra axis marked `size` can control marker size. |
| [`layout bars`](../plots/bars.md) | The first axis supplies bar height, the second places categories across the chart, and an optional third separates categories in depth. Each node supplies one bar. List category values on an axis to set their order. |
| [`layout radar`](../plots/radar.md) | Declare at least three numeric axes. Each node forms a profile, with distance from the center scaled to each spoke’s range. On a spoke marked `lower`, smaller values are closer to the rim. |
| [`layout pie`](../plots/pie.md) | The first axis names a nonnegative quantity. Each node supplies a slice. A list such as `Sales=40,52,61` gives successive pies, which an optional second axis can name. Slice angles show shares and disc areas show totals. |

On a plot, `axis Cost 0..200 lower <=150` sets the scale, preference and limit separately. Omit the range to infer it from the data. Mark an axis `lower` if smaller values are preferable, or `higher` if larger values are preferable. An option fades if another qualifying option is at least as good on every preference axis and better on at least one.

Limits such as `<=150` and `>=50` include the boundary value. Options outside the limits fade and drop out of the comparison used to rank other options. Try [adding a staffing measure](../plots/conditions.md) or [setting an impact threshold](../plots/quadrant.md).

## Follow a quantity over an ordered series

Area, line and stack accept the same data. The first axis names the quantity and the second gives the order, such as months. For one series per node, write comma-separated values and use exactly two axes. If you omit the labels on the second axis, positions are numbered from one.

```text
layout line
axis Sales
axis Month Jan Feb Mar
node East Sales=22,30,41
node West Sales=64,70,66
```

- [`layout area`](../plots/area.md) fills the area under each series and separates the series in depth.
- [`layout line`](../plots/line.md) draws all series on one plane. Compare the heights on either side of an intersection to see when one series overtakes another.
- [`layout stack`](../plots/stack.md) builds up from the first series. Band thickness gives the contribution and the top edge gives the total. Omit the range to fit the largest total.

For one node per observation, an optional third axis separates series. For example, add `axis Region East West` and write `node East1 Month=Jan Region=East Sales=22`.

## Show structure, flow or time

| Layout and example | Axes and data |
| --- | --- |
| [`layout tree`](../plots/tree.md) | Connect each parent to its children. A child can have at most one parent and the graph must be acyclic. Leaves have equal width without an axis. Add one quantity axis to weight the leaves. Their totals determine each parent’s width. |
| [`layout sankey`](../plots/sankey.md) | The first axis names a quantity on the edges. Give every edge a numeric amount, for example `Revenue -> GrossProfit Amount=62`. Larger amounts produce wider bands. An optional second axis separates nodes in depth. |
| [`layout sequence`](../plots/sequence.md) | Nodes are participants. Edges are messages displayed from top to bottom in the order written. Quote a message name after its target. Use no axis for a flat diagram, or one category axis to separate participants in depth. |
| [`layout timeline`](../plots/timeline.md) | The first axis names time, with an optional range such as `axis Week 0..12`. Give each node a duration such as `Week=2..5` or a single moment such as `Week=12`. An optional second axis separates lanes in depth, for example by team. |
