import { lazyLayer } from "plgg-flow/lazyLayer";
import { some, type Option } from "plgg";
import { project } from "plgg-board";
import {
  el,
  attr,
  onEvent,
  text,
  type Html,
} from "plgg-view";
import type { Flow, Change } from "./model";
import type { Mark } from "plgg-flow/annotations";
const a = (key: string, v: string | number) =>
  attr(key, String(v));
const markLayer = lazyLayer();
export const annotationView = (
  flow: Flow,
): Html<Change>[] => {
  if (!flow.marks?.length) return [];
  const at = project(flow.camera),
    nodes = new Map(
      flow.nodes.map((n) => [n.id, n]),
    );
  const click =
    (m: Mark) =>
    (e: Event): Option<Change> => {
      e.stopPropagation();
      return some((s) =>
        s.ink === "erase"
          ? {
              ...s,
              marks:
                s.marks?.filter(
                  (x) => x.id !== m.id,
                ) ?? [],
            }
          : { ...s, activeMark: m.id },
      );
    };
  return (flow.marks ?? []).flatMap((m) => {
    if (m.kind === "stroke")
      return [
        markLayer(
          m,
          [flow.camera, m.id === flow.activeMark],
          () =>
            el(
              "path",
              [
                a("data-mark", m.id),
                a(
                  "d",
                  m.points
                    .map((v, i) => {
                      const p = at(v);
                      return (
                        (i ? "L" : "M") +
                        p.x +
                        " " +
                        p.y
                      );
                    })
                    .join(""),
                ),
                a(
                  "stroke",
                  m.id === flow.activeMark
                    ? "#ce6232"
                    : "#5465a5",
                ),
                a("fill", "none"),
                a("stroke-width", 3),
                a("stroke-linecap", "round"),
                onEvent("pointerdown", click(m)),
              ],
              [],
            ),
        ),
      ];
    if (m.resolved && !flow.showResolved)
      return [];
    const xyz = m.node
      ? nodes.get(m.node)?.position
      : m.position;
    if (!xyz) return [];
    const active = m.id === flow.activeMark;
    return [
      markLayer(
        m,
        [flow.camera, xyz, active],
        () => {
          const p = at(xyz);
          return el(
            "g",
            [
              a("data-mark", m.id),
              a(
                "transform",
                `translate(${p.x + 36} ${p.y - 36})`,
              ),
              onEvent("pointerdown", click(m)),
            ],
            [
              el(
                "circle",
                [
                  a("r", 11),
                  a(
                    "fill",
                    m.resolved
                      ? "#80958c"
                      : active
                        ? "#b77720"
                        : "#e0ae51",
                  ),
                  a("stroke", "#775221"),
                ],
                [],
              ),
              el(
                "text",
                [
                  a("text-anchor", "middle"),
                  a("y", 4),
                ],
                [text(String(m.messages.length))],
              ),
              el(
                "title",
                [],
                [text(m.messages[0] ?? "")],
              ),
            ],
          );
        },
      ),
    ];
  });
};
