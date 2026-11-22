import { test, check, toBe } from "plgg-test";
import {
  createFlow,
  connect,
  addNode,
  deleteSelected,
  rotateView,
  viewAt,
  front,
} from "plgg-flow/index";
import { project, pan, zoomAt } from "plgg-board";
const node = (id: string) => ({
  id,
  label: id,
  position: { x: 0, y: 0, z: 10 },
});
test("deleting a selected node cleans up incident connections", () => {
  const initial = createFlow({
    nodes: [node("a")],
    edges: [],
  });
  const linked = connect("b")(
    connect("a")(addNode(node("b"))(initial)),
  );
  const duplicate = connect("b")(
    connect("a")(linked),
  );
  return check(
    linked.edges.length === 1 &&
      duplicate.edges.length === 1 &&
      deleteSelected(linked).edges.length === 0,
    toBe(true),
  );
});
test("returning to plan preserves spatial graph data", () => {
  const state = createFlow({
    nodes: [node("a")],
    edges: [],
  });
  const result = front(rotateView(state));
  return check(
    result.nodes === state.nodes &&
      result.camera.yaw === 0 &&
      result.camera.pitch === 0,
    toBe(true),
  );
});

test("inclining a panned, zoomed plan preserves edits and approaches the plan continuously", () => {
  const n = node("a");
  const edited = addNode({
    ...n,
    position: { x: 130, y: -40, z: 180 },
  })(createFlow({ nodes: [], edges: [] }));
  const state = {
    ...edited,
    camera: pan(
      30,
      -50,
    )(
      zoomAt(
        { x: 100, y: 90 },
        1.5,
      )(edited.camera),
    ),
  };
  const point = { x: 130, y: -40, z: 180 };
  const original = project(state.camera)(point);
  const almost = viewAt(
    0.000001,
    -0.000001,
  )(state);
  const near = project(almost.camera)(point);
  const tilted = viewAt(0.5, -0.5)(state);
  const oblique = project(tilted.camera)(point);
  const restored = front(tilted);
  const end = project(restored.camera)(point);
  return check(
    Math.hypot(
      near.x - original.x,
      near.y - original.y,
    ) < 0.001 &&
      Math.abs(oblique.x - original.x) > 5 &&
      end.x === original.x &&
      end.y === original.y &&
      restored.selected === state.selected &&
      restored.nodes === state.nodes &&
      restored.edges === state.edges,
    toBe(true),
  );
});
