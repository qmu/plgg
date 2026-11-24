import { boardCss } from "plgg-ir-diagram/boardCss";
const root = '[data-island="plgg-diagram"]';
export const diagramCss = `
${root}{--ink:var(--pm-text);--paper:var(--pm-surface);--graphite:var(--pm-muted);--trace:var(--pm-border);}
${root} figure{margin:0}
${root} figcaption,${root} summary{padding:.45rem;font-weight:600}
${root} summary,${root} button{cursor:pointer}
${boardCss(root)}
${root} .flow-board{height:clamp(200px,54vh,560px)}
${root} .controls{display:flex;gap:.45rem;margin:.5rem 0}
${root} button{background:var(--pm-surface);color:inherit;border:1px solid var(--pm-border);padding:.4rem .75rem}
${root} textarea,${root} pre{color:var(--ink);background:var(--paper);width:100%;font:14px/1.45 ui-monospace,monospace;padding:.6rem;overflow:auto}
${root} textarea{min-height:13rem}
`;
