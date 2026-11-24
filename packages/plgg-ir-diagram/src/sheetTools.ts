import {
  insertOnEdge,
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
          onClick(insertOnEdge),
        ],
        [text("接続の途中に挿入")],
      ),
  },
  {
    name: "views",
    view: (f) =>
      f.rooms || f.layered?.options.layerAxis
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
