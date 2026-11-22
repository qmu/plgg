import {
  createFlow,
  fitFlow,
  flowView,
  viewAt,
  type Flow,
  type Graph,
} from "plgg-flow";
import { arrangeHierarchy } from "plgg-flow/layout";
import {
  el,
  attr,
  text,
  raw,
  renderToString,
  type Html,
} from "plgg-view";
import {
  compileDiagram,
  type Diagram,
} from "plgg-ir-diagram/index";

export const diagramFlow = (
  diagram: Diagram,
  previous?: Flow,
): Flow => {
  let graph: Graph = {
    edges: diagram.edges,
    nodes: diagram.nodes.map((n) => ({
      ...n,
      position: { x: 0, y: 0, z: 0 },
      connectable: false,
    })),
  };
  const depths = new Map<string, number>();
  const parents = new Map(
    diagram.nodes.map((n) => [n.id, n.parent]),
  );
  const depth = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    const parent = parents.get(id),
      n = parent ? depth(parent) + 1 : 0;
    depths.set(id, n);
    return n;
  };
  for (const group of diagram.nodes
    .filter((n) => n.group)
    .sort((a, b) => depth(b.id) - depth(a.id)))
    graph = arrangeHierarchy(graph, group.id);
  graph = arrangeHierarchy(graph);
  if (!previous)
    return fitFlow(createFlow(graph));
  const saved = new Map(
    previous.nodes.map((n) => [n.id, n]),
  );
  return {
    ...createFlow(graph),
    camera: previous.camera,
    nodes: graph.nodes.map((n) => {
      const old = saved.get(n.id);
      return old && old.parent === n.parent
        ? { ...n, position: old.position }
        : n;
    }),
  };
};
const disclosure = (
  title: string,
  body: Html<never>,
) =>
  el<never>(
    "details",
    [],
    [el("summary", [], [text(title)]), body],
  );
/** Render the same viewport as the editor. Only the escaped plgg-view SSR result enters raw(). */
const projection = (flow: Flow) =>
  raw(renderToString(flowView(flow)));
export const diagramWidget = (
  source: string,
): Html<never> => {
  const r = compileDiagram(source);
  const listing = disclosure(
    "図のソース",
    el(
      "pre",
      [],
      [el("code", [], [text(source)])],
    ),
  );
  if (r.__tag === "Err")
    return el(
      "figure",
      [attr("class", "plgg-diagram-error")],
      [
        ...r.content.map((d) =>
          el(
            "p",
            [],
            [
              text(
                d.range.start.line +
                  "行 " +
                  d.range.start.column +
                  "列　" +
                  d.message,
              ),
            ],
          ),
        ),
        listing,
      ],
    );
  const flow = diagramFlow(r.content);
  return el(
    "figure",
    [attr("class", "plgg-diagram")],
    [
      el("figcaption", [], [text(r.content.id)]),
      projection(flow),
      disclosure(
        "立体で表示",
        projection(
          fitFlow(viewAt(-0.48, 0.42)(flow)),
        ),
      ),
      listing,
    ],
  );
};
export { diagramCss } from "plgg-ir-diagram/style";
