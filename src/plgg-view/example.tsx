/**
 * plgg-view example — write components in `.tsx`, let the library process them
 * into a plgg view tree.
 *
 * Run it (from this package dir so tsx picks up tsconfig's `jsxImportSource`):
 *   cd src/plgg-view && npx tsx example.tsx
 *
 * There is no HTML and no DOM here — `plgg-view` is the JSX runtime, and the
 * "render" is the pure-data `VNode` tree it produces. The output below is that
 * tree, printed as JSON, so you can see exactly what the `.tsx` compiled to.
 */
import { VNode } from "plgg-view/index";

type Item = Readonly<{ id: string; label: string }>;

// A leaf component.
const ItemView = (props: { item: Item }): VNode => (
  <li class="item">{props.item.label}</li>
);

// A component that composes children via list rendering — plain `array.map`.
const List = (props: { items: ReadonlyArray<Item> }): VNode => (
  <ul class="list">
    {props.items.map((item) => (
      <ItemView item={item} />
    ))}
  </ul>
);

const view: VNode = (
  <List
    items={[
      { id: "1", label: "first" },
      { id: "2", label: "second" },
    ]}
  />
);

console.log(JSON.stringify(view, null, 2));
