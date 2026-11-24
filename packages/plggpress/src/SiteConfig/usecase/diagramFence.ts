import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  diagramWidget,
  diagramCss,
} from "plgg-ir-diagram/widget";
import {
  flowWidget,
  flowCss,
} from "plgg-ir-diagram/flow";
import {
  el,
  attr,
  raw,
  type Html,
} from "plgg-view";

export type Part = Readonly<{
  name: string;
  render: (
    code: string,
    info: string,
  ) => Html<never>;
  css: string;
  runtime: string;
}>;

export const builtins: readonly Part[] = [
  {
    name: "plgg-flow",
    render: flowWidget,
    css: flowCss,
    runtime: "plgg-ir-diagram/flow-interactive",
  },
  {
    name: "plgg-diagram",
    render: diagramWidget,
    css: diagramCss,
    runtime: "plgg-ir-diagram/interactive",
  },
];

const json = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export const islandFence =
  (part: Part) =>
  (code: string, info = part.name): Html<never> =>
    el(
      "div",
      [
        attr("data-island", part.name),
        ...(info.split(/\s+/).includes("fill")
          ? [attr("data-fill", "")]
          : []),
      ],
      [
        part.render(code, info),
        el(
          "script",
          [attr("type", "application/json")],
          [raw(json({ code, info }))],
        ),
      ],
    );

export const islandAsset = (part: Part) => {
  const bytes = readFileSync(
    new URL(import.meta.resolve(part.runtime)),
  );
  const hash = createHash("sha256")
    .update(bytes)
    .digest("hex")
    .slice(0, 16);
  return {
    file:
      "assets/islands/" +
      part.name +
      "." +
      hash +
      ".js",
    bytes,
  };
};

const loader = `const modules=new Map(),mounted=new Map();
function scan(){
 for(const [root,dispose] of mounted){
  if(!root.isConnected){mounted.delete(root);dispose?.();}
 }
 for(const map of document.querySelectorAll('script[data-island-map]')){
  for(const [name,url] of Object.entries(JSON.parse(map.textContent)))modules.set(name,url);
 }
 for(const root of document.querySelectorAll('[data-island]')){
  const url=modules.get(root.dataset.island), data=root.querySelector(':scope > script[type="application/json"]');
  if(!url||!data||mounted.has(root))continue;
  mounted.set(root,null);
  import(url).then(({default:mount})=>{
   if(root.isConnected && mounted.has(root))mounted.set(root,mount(root,JSON.parse(data.textContent)));
  }).catch(error=>{mounted.delete(root);console.error(error);});
 }
}
document.addEventListener('plgg:columns',scan);scan();`;

export const islandPage = (
  html: string,
  parts: readonly Part[],
  url: (part: Part) => string,
) => {
  const used = [...new Set(parts)];
  if (!used.length) return html;
  const styles = used
    .map(
      (part) =>
        '<style data-island-style="' +
        part.name +
        '" data-column-style="' +
        part.name +
        '">' +
        part.css +
        "</style>",
    )
    .join("");
  const map = json(
    Object.fromEntries(
      used.map((part) => [part.name, url(part)]),
    ),
  );
  return html
    .replace("</head>", () => styles + "</head>")
    .replace(
      "</body>",
      () =>
        '<script type="application/json" data-island-map data-column-data>' +
        map +
        '</script><script type="module" data-island-loader data-column-init>' +
        loader +
        "</script></body>",
    );
};
