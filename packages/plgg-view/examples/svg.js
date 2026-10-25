import {
  div,
  span,
  text,
  svg,
  g,
  rect,
  circle,
  ellipse,
  line,
  polyline,
  polygon,
  attr,
  onClick,
  button,
  raw,
} from "plgg-view";
import { makeRenderer } from "plgg-view/client";

const shapes = [
  [
    "rect",
    rect,
    [
      attr("x", "4"),
      attr("y", "5"),
      attr("width", "16"),
      attr("height", "14"),
      attr("rx", "2"),
    ],
  ],
  [
    "circle",
    circle,
    [
      attr("cx", "12"),
      attr("cy", "12"),
      attr("r", "8"),
    ],
  ],
  [
    "ellipse",
    ellipse,
    [
      attr("cx", "12"),
      attr("cy", "12"),
      attr("rx", "9"),
      attr("ry", "6"),
    ],
  ],
  [
    "line",
    line,
    [
      attr("x1", "4"),
      attr("y1", "19"),
      attr("x2", "20"),
      attr("y2", "5"),
    ],
  ],
  [
    "polyline",
    polyline,
    [attr("points", "3 17 8 7 14 16 21 5")],
  ],
  [
    "polygon",
    polygon,
    [attr("points", "12 3 21 19 3 19")],
  ],
];
const markup =
  '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>';
const root = document.getElementById("app");
// Browser event seam: retain the model locally; renderer owns DOM updates.
let revision = 0;
let filled = false;
const render = makeRenderer(root, (msg) => {
  revision += 1;
  if (msg === "toggle") filled = !filled;
  render(view());
});
const view = () =>
  div(
    [],
    [
      div(
        [attr("class", "grid")],
        shapes.map(([name, shape, geometry]) =>
          div(
            [attr("class", "row")],
            [
              svg(
                [
                  attr("viewBox", "0 0 24 24"),
                  attr("aria-label", name),
                ],
                [
                  g(
                    [
                      attr(
                        "fill",
                        filled
                          ? "currentColor"
                          : "none",
                      ),
                      attr(
                        "stroke",
                        "currentColor",
                      ),
                      attr("stroke-width", "1.5"),
                      attr(
                        "stroke-linejoin",
                        "round",
                      ),
                      attr(
                        "stroke-linecap",
                        "round",
                      ),
                    ],
                    [shape(geometry, [])],
                  ),
                ],
              ),
              text(name),
            ],
          ),
        ),
      ),
      button(
        [attr("id", "toggle"), onClick("toggle")],
        [text("Toggle fill")],
      ),
      button(
        [
          attr("id", "refresh"),
          onClick("refresh"),
        ],
        [text("Render same icons")],
      ),
      div(
        [attr("class", "status")],
        [
          span(
            [attr("id", "raw")],
            [raw(markup)],
          ),
          text(
            `Render ${revision} · ${filled ? "filled" : "outline"} · unchanged raw markup keeps its DOM node`,
          ),
        ],
      ),
    ],
  );
render(view());
