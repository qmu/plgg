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
  for (const { value, min, max } of face
    ? planes.slice(0, 1)
    : planes) {
    scenery.push({
      kind: "plane",
      layer: "behind",
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
    if (!face)
      scenery.push({
        kind: "label",
        layer: "front",
        anchor: min,
        offset: { x: 12, y: 9 },
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
            ? { ...e, quiet: true }
            : e,
        )
      : flow.edges,
  };
};
