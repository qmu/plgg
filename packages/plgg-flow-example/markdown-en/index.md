# The plgg-flow guide

Describe a diagram by naming its nodes and connecting them. Try dragging the middle card below. Both arrows stay attached as the card moves.

```plgg-flow
node Write at -260 0 label "Write Markdown"
node Draw at 0 0 label "Render at build time"
node Interact at 260 0 label "Interact on the page"
Write -> Draw
Draw -> Interact "After loading"
```

To write your own diagram, start with [nodes and edges](./guide/dsl.md). Use [automatic layout](./samples/layered.md) to place nodes from their connections, or [choose a chart](./guide/charts.md) to place them by quantity, sequence or time.

[Three worked diagrams](./guide/gallery.md) show how to use depth, nest groups and sum inputs. To embed a diagram in your own Markdown page, follow the [plggpress guide](https://plggpress.qmu.co.jp/en/sheets/).

You can also open related guides alongside this one. See [plgg](https://plgg.qmu.co.jp/) for the libraries, [plggmatic](https://plggmatic.qmu.co.jp/en/) for declaring application views, and [hrns](https://hrns.qmu.co.jp/en/) for the coding agent.
