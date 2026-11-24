import { project, type Point } from "plgg-board";
import { check, test, toBe } from "plgg-test";
import {
  renderToString,
  type Html,
} from "plgg-view";
import {
  createFlow,
  flowView,
  viewAt,
  selectedNodes,
  nodeSize,
  type Change,
} from "plgg-flow/index";

// Exercise the view's actual event decoders. The sheet coordinates are
// already SVG-local, so its screen transform is the identity.
class Target {
  attrs: Record<string, string>;
  constructor(
    attrs: Record<string, string> = {},
  ) {
    this.attrs = attrs;
  }
  closest(selector: string) {
    return selector
      .split(",")
      .some(
        (s) =>
          s.startsWith("[") &&
          s.slice(1, -1) in this.attrs,
      )
      ? this
      : null;
  }
  getAttribute(key: string) {
    return this.attrs[key] ?? null;
  }
}
class Surface extends Target {
  hit = new Target();
  ownerDocument = {
    elementFromPoint: () => this.hit,
  };
  contains(t: Target) {
    return t === this.hit;
  }
  getScreenCTM() {
    return { inverse: () => ({}) };
  }
  setPointerCapture() {}
  focus() {}
}
class ScreenPoint {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  matrixTransform() {
    return this;
  }
}
class Input extends Event {
  isPrimary = true;
  pointerId = 1;
  pointerType = "mouse";
  button = 0;
  shiftKey = false;
  key = "";
  clientX = 0;
  clientY = 0;
}
function control(
  tree: Html<Change>,
  attrs: Record<string, string>,
): Target | undefined {
  if (tree.__tag === "Lazy")
    return control(tree.content.render(), attrs);
  if (tree.__tag !== "Element") return;
  const values: Record<string, string> = {};
  for (const a of tree.content.attributes)
    if (a.__tag === "Attr")
      values[a.content.name] = a.content.value;
  if (
    Object.entries(attrs).every(
      ([k, v]) => values[k] === v,
    )
  )
    return new Target(values);
  for (const child of tree.content.children) {
    const match = control(child, attrs);
    if (match) return match;
  }
  return undefined;
}
test("flat and spatial sheets dispatch the same editing gestures", () => {
  const globals = {
    PointerEvent: Input,
    KeyboardEvent: Input,
    MouseEvent: Input,
    Element: Target,
    SVGSVGElement: Surface,
    DOMPoint: ScreenPoint,
    window: { prompt: () => "Renamed" },
  };
  const saved = new Map(
    Object.keys(globals).map((k) => [
      k,
      Object.getOwnPropertyDescriptor(
        globalThis,
        k,
      ),
    ]),
  );
  try {
    for (const [k, value] of Object.entries(
      globals,
    ))
      Object.defineProperty(globalThis, k, {
        configurable: true,
        value,
      });
    const exercise = (
      z: number,
      yaw: number,
      pitch: number,
    ) => {
      const svg = new Surface();
      let state = viewAt(
        yaw,
        pitch,
      )(
        createFlow({
          nodes: ["a", "b", "c"].map((id, i) => ({
            id,
            label: id,
            position: { x: i * 240, y: 0, z },
          })),
          edges: [],
        }),
      );
      const at = (id: string) =>
        project(state.camera)(
          state.nodes.find((n) => n.id === id)!
            .position,
        );
      const send = (
        type: string,
        point: Point,
        attrs?: Record<string, string>,
        extra: {
          shiftKey?: boolean;
          key?: string;
        } = {},
      ) => {
        const tree = flowView(state);
        if (tree.__tag !== "Element")
          throw Error("missing sheet");
        const target = attrs
          ? control(tree, attrs)
          : svg;
        if (!target)
          throw Error(
            "missing control " +
              JSON.stringify(attrs),
          );
        svg.hit = target;
        const e = Object.assign(
          new Input(type),
          { clientX: point.x, clientY: point.y },
          extra,
        );
        Object.defineProperties(e, {
          target: { value: target },
          currentTarget: { value: svg },
        });
        for (const a of tree.content.attributes)
          if (
            a.__tag === "EventHandler" &&
            a.content.event === type
          ) {
            const msg = a.content.toMsg(e);
            if (msg.__tag === "Some")
              state = msg.content(state);
          }
      };
      const a = at("a"),
        b = at("b");
      const body = z
        ? undefined
        : { "data-node": "a" };
      send("pointerdown", a, body);
      send("pointerup", a);
      const html = renderToString(
        flowView(state),
      );
      const result = [
        selectedNodes(state).join() === "a",
        html.includes("world-grid"),
        ["right", "left", "top", "bottom"].every(
          (side) =>
            control(flowView(state), {
              "data-port": "a",
              "data-side": side,
            }),
        ),

        (html.match(/data-port="a"/g) ?? [])
          .length === 4,
        html.includes("engine-drawing") ===
          Boolean(z),
      ];
      send("pointermove", a, body);
      result.push(state.hoveredNode === "a");
      send("dblclick", a, body);
      result.push(
        state.nodes[0]?.label === "Renamed",
      );
      send("pointerdown", a, {
        "data-port": "a",
        "data-side": "right",
      });
      send("pointermove", b);
      send("pointerup", b, {
        "data-port": "b",
        "data-side": "left",
      });
      result.push(
        state.edges[0]?.source === "a" &&
          state.edges[0]?.target === "b",
      );
      const mid = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
      send("pointerdown", mid, {
        "data-wire-control": "0",
      });
      send("pointerdown", b, {
        "data-endpoint": "target",
      });
      send("pointerup", at("c"), {
        "data-port": "c",
        "data-side": "left",
      });
      result.push(
        state.edges.length === 1 &&
          state.edges[0]?.target === "c",
      );
      send("keydown", mid, undefined, {
        key: "Insert",
      });
      result.push(
        state.edges.length === 2 &&
          state.nodes.length === 4,
      );
      const start = { x: a.x - 60, y: a.y - 50 },
        end = {
          x: b.x + 25,
          y: Math.max(a.y, b.y) + 50,
        };
      send("pointerdown", start, undefined, {
        shiftKey: true,
      });
      send("pointermove", end);
      send("pointerup", end);
      result.push(
        ["a", "b"].every((id) =>
          selectedNodes(state).includes(id),
        ),
      );
      send("pointerdown", a, body);
      const moved = { x: a.x + 40, y: a.y + 16 };
      send("pointermove", moved);
      send("pointerup", moved);
      result.push(
        state.nodes[0]!.position.x !== 0,
      );
      const n = state.nodes[0]!,
        size = nodeSize(n);
      const corner = (delta: number) =>
        project(state.camera)({
          ...n.position,
          x:
            n.position.x + size.width / 2 + delta,
          y:
            n.position.y +
            size.height / 2 +
            delta,
        });
      send("pointerdown", corner(0), {
        "data-group-handle": "a",
      });
      send("pointermove", corner(48));
      send("pointerup", corner(48));
      result.push(
        nodeSize(state.nodes[0]!).width >
          size.width,
      );
      send("keydown", a, undefined, {
        key: "Delete",
      });
      result.push(
        !state.nodes.some((n) => n.id === "a"),
      );
      return result;
    };
    for (const [z, yaw, pitch] of [
      [0, 0, 0],
      [24, 0, 0],
      [24, 0.6, 0.4],
    ]) {
      const result = exercise(z!, yaw!, pitch!);
      if (result.includes(false))
        throw Error(
          JSON.stringify({
            z,
            yaw,
            pitch,
            result,
          }),
        );
    }
    return check(true, toBe(true));
  } finally {
    for (const k of Object.keys(globals)) {
      const d = saved.get(k);
      if (d)
        Object.defineProperty(globalThis, k, d);
      else Reflect.deleteProperty(globalThis, k);
    }
  }
});
