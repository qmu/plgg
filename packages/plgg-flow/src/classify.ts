import type { Graph, FlowNode } from "./model";

export type Axis = {
  attribute: string;
  values: readonly string[];
};
export const attributeValue = (
  node: FlowNode,
  key: string,
) => {
  const value = node.data?.[key];
  return typeof value === "string" ? value : "—";
};
export const classify = (
  graph: Graph,
  definitions: readonly Axis[],
) => {
  const axes = definitions.map(
    ({ attribute, values }) => {
      const observed = graph.nodes.map((n) =>
        attributeValue(n, attribute),
      );
      const all = new Set([
        ...values,
        ...observed.sort(),
      ]);
      const missing = all.delete("—");
      if (!all.size || missing) all.add("—");
      return { attribute, values: [...all] };
    },
  );
  const addressOf = (node: FlowNode) =>
    axes.map((a) =>
      a.values.indexOf(
        attributeValue(node, a.attribute),
      ),
    );
  const addresses = axes.reduce<number[][]>(
    (product, a) =>
      product.flatMap((p) =>
        a.values.map((_, i) => [...p, i]),
      ),
    [[]],
  );
  const cells = addresses.map((address) => ({
    address,
    nodes: new Array<FlowNode>(),
  }));
  const byAddress = new Map(
    cells.map((c) => [c.address.join(), c]),
  );
  for (const n of graph.nodes)
    byAddress
      .get(addressOf(n).join())!
      .nodes.push(n);
  for (const cell of cells)
    cell.nodes.sort((a, b) =>
      a.id < b.id ? -1 : Number(a.id > b.id),
    );
  return {
    axes,
    cells,
    addressOf,
    edges: graph.edges,
  };
};
export type Classification = ReturnType<
  typeof classify
>;
