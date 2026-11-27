import {
  sheetTools,
  type SheetTool,
} from "plgg-ir-diagram/flowSheet";
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
  tools?: ReadonlyMap<string, SheetTool>;
  css: string;
  runtime: string;
  /** A block written with no options reads complete as
   * it is drawn on the page: its runtime is fetched only
   * when a reader reaches for it. */
  lazy?: boolean;
}>;

export const builtins: readonly Part[] = [
  {
    name: "plgg-flow",
    render: flowWidget,
    tools: sheetTools,
    css: flowCss,
    runtime: "plgg-ir-diagram/flow-interactive",
    lazy: true,
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
        ...(part.lazy === true &&
        info
          .split(/\s+/)
          .every(
            (word) =>
              word === "" || word === part.name,
          )
          ? [attr("data-island-lazy", "")]
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

const loader = `const modules=new Map(),mounted=new Map(),waiting=new WeakSet();
function load(root,url,data){
 mounted.set(root,null);
 import(url).then(({default:mount})=>{
  if(root.isConnected && mounted.has(root))mounted.set(root,mount(root,JSON.parse(data.textContent)));
 }).catch(error=>{mounted.delete(root);console.error(error);});
}
function scan(){
 for(const [root,dispose] of mounted){
  if(!root.isConnected){mounted.delete(root);dispose?.();}
 }
 for(const map of document.querySelectorAll('script[data-island-map]')){
  for(const [name,url] of Object.entries(JSON.parse(map.textContent)))modules.set(name,url);
 }
 for(const root of document.querySelectorAll('[data-island]')){
  const url=modules.get(root.dataset.island), data=root.querySelector(':scope > script[type="application/json"]');
  if(!url||!data||mounted.has(root)||waiting.has(root))continue;
  if(!root.hasAttribute('data-island-lazy')){load(root,url,data);continue;}
  waiting.add(root);
  const reach=()=>{if(waiting.delete(root))load(root,url,data);};
  for(const type of ['pointerenter','pointerdown','focusin','touchstart'])root.addEventListener(type,reach,{once:true,passive:true});
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
