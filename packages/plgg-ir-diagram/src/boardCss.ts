export const boardCss = (root: string) => `
${root} .flow-board{display:block;width:100%;height:auto;aspect-ratio:900/580;background:var(--paper)!important;border:1px solid var(--ink);user-select:none;touch-action:none}
${root} .flow-board text{font-family:inherit;font-size:13px;font-weight:500;fill:var(--ink)!important}
${root} .flow-board [stroke]:not([stroke="none"]){stroke:var(--ink)}
${root} .flow-board [fill]:not([fill="none"]){fill:var(--paper)}
${root} .flow-board circle[fill]:not([fill="none"]):not([fill="#fff"]):not([fill="white"]){fill:var(--ink)}
${root} .flow-board polygon[data-arrow][fill]{fill:var(--ink)}
${root} .flow-board [stroke-dasharray]{stroke:var(--graphite)}
${root} .flow-board .scroll-hint rect{fill:var(--ink)!important}
${root} .flow-board .scroll-hint text{fill:var(--paper)!important;font-size:16px}
${root} .flow-board [data-node]:focus,${root} .flow-board [data-port]:focus{outline:none}
${root} .flow-board [data-node]:focus-visible polygon{stroke-dasharray:3 2}
${root} .flow-board [data-node][aria-pressed="true"] polygon{stroke-width:2.4}
${root} :focus:not(:focus-visible){outline:none}
${root} .flow-board:focus,${root} .flow-board :focus{outline:none}
${root} .flow-board path.edge[stroke="#e36731"]{stroke-width:3px}
${root} .flow-board .world-grid{stroke:var(--trace)!important;stroke-width:.8}
${root} .flow-board .edge-label{paint-order:stroke;stroke:var(--paper)!important;stroke-width:5px}
${root} .flow-board,${root} .flow-board g{cursor:default}
${root} .flow-board:active,${root} .flow-board:active g{cursor:grabbing}
${root} .flow-board path.edge,${root} .flow-board .edge-hit{cursor:pointer}
${root} .flow-board circle{cursor:crosshair}
${root} .flow-board .edge-hit{stroke-opacity:0!important}
${root} .flow-board .marquee{fill:color-mix(in srgb,var(--ink) 2.5%,transparent);stroke:var(--ink);stroke-opacity:.55;stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;animation:plgg-marquee 1.8s linear infinite}
@keyframes plgg-marquee{to{stroke-dashoffset:-18}}
@media (prefers-reduced-motion:reduce){
${root} .flow-board .marquee{animation:none}
}
`;
