import {
  splitEdge,
  viewAt,
  type Flow,
  type Change,
} from "plgg-flow";
import {
  el,
  attr,
  onClick,
  text,
  type Html,
} from "plgg-view";

export type SheetTool = Readonly<{
  name: string;
  view: (flow: Flow) => Html<Change>;
}>;
const insert: Change = (f) => {
  const e = f.edges[0],
    a = f.nodes.find((n) => n.id === e?.source),
    b = f.nodes.find((n) => n.id === e?.target);
  if (!e || !a || !b) return f;
  const id =
    Array.from(
      { length: f.nodes.length + 1 },
      (_, i) => "Step " + (i + 1),
    ).find(
      (id) => !f.nodes.some((n) => n.id === id),
    ) ?? "Step";
  return {
    ...f,
    ...splitEdge(
      f,
      e,
      {
        id,
        label: id,
        position: {
          x: (a.position.x + b.position.x) / 2,
          y:
            (a.position.y + b.position.y) / 2 +
            65,
          z: (a.position.z + b.position.z) / 2,
        },
      },
      f.allowConnection
        ? { allow: f.allowConnection }
        : {},
    ),
  };
};
const button = (
  label: string,
  fn: Change,
  pressed: boolean,
) =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("aria-pressed", String(pressed)),
      onClick(fn),
    ],
    [text(label)],
  );
const tools: readonly SheetTool[] = [
  {
    name: "routes",
    view: (flow) =>
      el(
        "span",
        [],
        (
          [
            "straight",
            "step",
            "curve",
          ] satisfies Array<
            "straight" | "step" | "curve"
          >
        ).map((route) =>
          button(
            route,
            (f) => ({
              ...f,
              edges: f.edges.map((e) => ({
                ...e,
                route,
              })),
            }),
            flow.edges.length > 0 &&
              flow.edges.every(
                (e) =>
                  (e.route ?? "curve") === route,
              ),
          ),
        ),
      ),
  },
  {
    name: "snap",
    view: (flow) =>
      el(
        "span",
        [],
        [0, 8, 16, 32].map((step) =>
          button(
            step ? `snap ${step}` : "snap off",
            (f) => ({ ...f, snap: step }),
            flow.snap === step,
          ),
        ),
      ),
  },
  {
    name: "split",
    view: (flow) =>
      el(
        "button",
        [
          attr("type", "button"),
          ...(!flow.edges.length
            ? [attr("disabled", "")]
            : []),
          onClick(insert),
        ],
        [text("接続の途中に挿入")],
      ),
  },
  {
    name: "views",
    view: (f) =>
      f.rooms
        ? text("")
        : el(
            "span",
            [],
            (
              [
                ["正面", 0, 0],
                ["立体", -0.48, 0.42],
              ] satisfies [
                string,
                number,
                number,
              ][]
            ).map(([label, yaw, pitch]) =>
              button(
                label,
                viewAt(yaw, pitch),
                f.camera.yaw === yaw &&
                  f.camera.pitch === pitch,
              ),
            ),
          ),
  },
];
export const sheetTools: ReadonlyMap<
  string,
  SheetTool
> = new Map(
  tools.map((tool) => [tool.name, tool]),
);
export const sheetToolNames = (info: string) =>
  info
    .split(/\s+/)
    .flatMap((option) =>
      option.startsWith("tools=")
        ? option
            .slice(6)
            .split(",")
            .filter(Boolean)
        : [],
    );
