// Generate a standalone gallery page with CSS playback, including offline.
import { writeFileSync } from "node:fs";
import {
  box,
  render,
  toSvg,
} from "../dist/index.es.js";
const p = (x, y, z) => ({ x, y, z });
const scene = {
  solids: [box(p(0, 0, 0), p(96, 48, 24))],
  lines: [
    {
      id: "w",
      style: "wire",
      points: [p(-120, 0, -60), p(120, 0, -60)],
    },
  ],
  sheets: [],
  labels: [],
  marks: [],
};
const frames = 48;
const figures = Array.from(
  { length: frames },
  (_, i) => {
    const drawing = render(
      scene,
      {
        origin: p(0, 0, 0),
        yaw: (2 * Math.PI * i) / frames,
        pitch: 0.25,
        scale: 1,
      },
      { direction: p(0.5, 1, -0.3) },
    );
    const svg = toSvg(drawing, {
      up: "fill:#f3e6cc",
      lit: "fill:#dbc297",
      shade: "fill:#ae8d62",
      silhouette: "stroke:#33291d;fill:none",
      crease: "stroke:#776449;fill:none",
      line: "stroke:#22527d",
      hidden: "stroke:#888;stroke-dasharray:3 3",
    }).replace(
      /viewBox="[^"]+"/,
      'viewBox="-145 -85 290 170"',
    );
    return (
      '<figure style="animation-delay:-' +
      (frames - i) / 8 +
      's">' +
      svg +
      "</figure>"
    );
  },
);
const page =
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Line behind a box</title><style>body{font:18px system-ui;max-width:48rem;margin:3rem auto;background:#faf7f1;color:#33291d}section{display:grid}figure{grid-area:1/1;margin:0;visibility:hidden;animation:turn 6s steps(1) infinite}@keyframes turn{0%{visibility:visible}' +
  100 / frames +
  '%{visibility:hidden}}input:checked~section figure{animation-play-state:paused}</style><h1>Line behind a box</h1><input type="checkbox" id="pause"><label for="pause">Pause rotation</label><section>' +
  figures.join("") +
  "</section></html>";
writeFileSync(
  new URL(
    "../dist/gallery.html",
    import.meta.url,
  ),
  page,
);
