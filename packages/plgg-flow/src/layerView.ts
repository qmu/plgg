import { quietEdge } from "plgg-flow/model";
import { project } from "plgg-board";
import { cardBounds } from "plgg-flow/nodeBody";
import { placeOnLayers } from "plgg-flow/autoLayout";
import { attributeValue } from "plgg-flow/classify";
import type { Flow, Scenery } from "./model";
export const layerView = (flow: Flow): Flow => {
  const axis = flow.layered?.options.layerAxis;
  if (!axis) return flow;
  const { planes } = placeOnLayers(flow, axis);
  const face =
    flow.camera.yaw === 0 &&
    flow.camera.pitch === 0;
  const scenery: Scenery[] = [];
  const cards = face
    ? []
    : cardBounds(flow.camera, flow.nodes);
  const at = project(flow.camera);
  for (const { value, min, max } of face
    ? planes.slice(0, 1)
    : planes) {
    scenery.push({
      kind: "plane",
      layer: "sorted",
      points: [
        min,
        { ...min, x: max.x },
        max,
        { ...max, x: min.x },
      ],
      fill: "var(--wash,#b5c9c5)",
      opacity: face ? 0 : 0.14,
      tone: "var(--pencil,gray)",
    });
    if (!face) {
      const anchor = at(min),
        half = 5 * value.length + 2;
      let y = anchor.y - 10;
      for (const box of [...cards].sort(
        (a, b) => b.bottom - a.bottom,
      ))
        if (
          anchor.x + half > box.left &&
          anchor.x - half < box.right &&
          y + 6 > box.top &&
          y - 6 < box.bottom
        )
          y = box.top - 7;
      cards.push({
        left: anchor.x - half,
        right: anchor.x + half,
        top: y - 6,
        bottom: y + 6,
      });
      scenery.push({
        kind: "label",
        layer: "front",
        anchor: min,
        offset: { x: 0, y: y - anchor.y },
        size: 10,
        weight: 600,
        text: value,
        tone: "var(--graphite,#333)",
        press: (f) => ({
          ...f,
          layerPin:
            f.layerPin === value
              ? undefined
              : value,
        }),
      });
    }
  }
  const quiet = new Set(
    flow.nodes
      .filter(
        (n) =>
          flow.layerPin !== undefined &&
          attributeValue(n, axis.attribute) !==
            flow.layerPin,
      )
      .map((n) => n.id),
  );
  return {
    ...flow,
    scenery: [
      ...scenery,
      ...(flow.scenery ?? []),
    ],
    nodes: quiet.size
      ? flow.nodes.map((n) =>
          quiet.has(n.id)
            ? { ...n, quiet: true }
            : n,
        )
      : flow.nodes,
    edges: quiet.size
      ? flow.edges.map((e) =>
          quiet.has(e.source) ||
          quiet.has(e.target)
            ? quietEdge(e)
            : e,
        )
      : flow.edges,
  };
};
