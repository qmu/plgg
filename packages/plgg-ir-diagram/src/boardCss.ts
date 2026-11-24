export const boardCss = (root: string) => `
@scope (${root}) {
  .flow-board {
    --shade: light-dark(#e9e9e9, #1f1f1f);
    display: block;
    width: 100%;
    height: clamp(340px, 64vh, 760px);
    margin: 0;
    background-color: var(--paper) !important;
    border: 1px solid var(--ink);
    border-radius: 0;
    touch-action: none;
    user-select: none;
  }
  .flow-board text {
    font: 500 13px var(--body);
    fill: var(--ink) !important;
  }
  /* the ordinary arrow over the sheet and its nodes, a
       closed hand only while something is being dragged, a
       pointing hand on a wire, a cross on a socket */
  .flow-board,
  .flow-board g {
    cursor: default;
  }
  /* a node can be picked up: an open hand over it */
  .flow-board [data-node],
  .flow-board [data-node] * {
    cursor: grab;
  }
  .flow-board:active,
  .flow-board:active g,
  .flow-board:active [data-node],
  .flow-board:active [data-node] * {
    cursor: grabbing;
  }
  .flow-board [data-node] circle {
    cursor: crosshair;
  }
  .flow-board circle {
    cursor: crosshair;
  }
  /* Monochrome: every colour drawn by the library or the
       examples is folded onto the ink scale. */
  .flow-board [stroke]:not([stroke='none']) {
    stroke: var(--ink);
  }
  .flow-board [fill]:not([fill='none']) {
    fill: var(--paper);
  }
  .flow-board [fill='#000'],
  .flow-board [fill='black'],
  .flow-board [fill='currentColor'],
  .flow-board
    circle[fill]:not([fill='none']):not(
      [fill='#fff']
    ):not([fill='white']) {
    fill: var(--ink);
  }
  .flow-board polygon[data-arrow][fill] {
    fill: var(--ink);
  }
  .flow-board .scroll-hint rect {
    fill: var(--ink) !important;
  }
  .flow-board .scroll-hint text {
    fill: var(--paper) !important;
    font-size: 16px;
  }
  .flow-board [data-node]:focus,
  .flow-board [data-port]:focus {
    outline: none;
  }
  .flow-board [data-node]:focus-visible polygon[data-node-face] {
    stroke-dasharray: 3 2;
  }
  .flow-board
    [data-node][aria-pressed='true']
    polygon[data-node-face] {
    stroke-width: 2.4;
  }
  .flow-board polygon[data-group][fill='var(--wash)'] {
    fill: var(--wash);
  }
  .flow-board [data-node]:focus-visible .tray-label {
    text-decoration: underline;
  }
  .flow-board .tray-label {
    font-weight: 600;
  }
  .flow-board [data-node] [data-group-handle] {
    cursor: nwse-resize;
  }
  :focus:not(:focus-visible),
  .flow-board:focus,
  .flow-board :focus {
    outline: none;
  }
  .flow-board path.edge[stroke='#e36731'] {
    stroke-width: 3px;
  }
  .flow-board path.edge,
  .flow-board .edge-hit {
    cursor: pointer;
  }
  .flow-board [stroke-dasharray] {
    stroke: var(--graphite);
  }
  .world-grid,
  .flow-board .world-grid {
    stroke: var(--trace) !important;
    stroke-width: 0.8;
  }
  .flow-board .quiet-node:not(:hover) [stroke], .flow-board path.quiet-wire { stroke: var(--pencil); }
  .flow-board .quiet-node:not(:hover) text, .flow-board polygon.quiet-wire { fill: var(--pencil) !important; }
  .flow-board g:has(> .edge-hit):hover > .quiet-wire { stroke: var(--ink); }
  .edge-label {
    paint-order: stroke;
    stroke: var(--paper) !important;
    stroke-width: 5px;
  }
  .animated {
    stroke-dasharray: 9 6;
    animation: travel 0.8s linear infinite;
  }
  @keyframes travel {
    from {
      stroke-dashoffset: var(--arc, 0px);
    }
    to {
      stroke-dashoffset: calc(
        var(--arc, 0px) - 30px
      );
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .animated {
      animation: none;
    }
  }
  /* the selection area: a faint wash inside a dashed
       line that walks slowly round it */
  /* !important: the monochrome fold above paints every
       filled shape with paper, which made this an opaque
       white box hiding what was being selected */
  .flow-board .marquee {
    fill: var(--ink) !important;
    fill-opacity: 0.07;
    stroke: var(--ink);
    stroke-opacity: 0.8;
    stroke-width: 1;
    stroke-dasharray: 5 4;
    vector-effect: non-scaling-stroke;
    animation: marquee 1.8s linear infinite;
  }
  @keyframes marquee {
    to {
      stroke-dashoffset: -18;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-board .marquee {
      animation: none;
    }
  }
  .flow-board .edge-hit {
    stroke-opacity: 0 !important;
  }
}
`;
