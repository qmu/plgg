export const boardCss = (root: string) => `
@scope (${root}) {
  .flow-board {
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
  .flow-board:active,
  .flow-board:active g {
    cursor: grabbing;
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
  .flow-board [data-node]:focus-visible polygon {
    stroke-dasharray: 3 2;
  }
  .flow-board
    [data-node][aria-pressed='true']
    polygon {
    stroke-width: 2.4;
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
  .flow-board .room-lattice .room-outer {
    stroke: var(--ink);
  }
  .flow-board .room-lattice .room-inner {
    stroke: var(--trace);
  }
  .flow-board .room-lattice .room-empty {
    stroke: var(--wash);
  }
  .flow-board .room-lattice .room-floor {
    fill: var(--wash);
  }
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
  .flow-board .marquee {
    fill: color-mix(
      in srgb,
      var(--ink) 2.5%,
      transparent
    );
    stroke: var(--ink);
    stroke-opacity: 0.55;
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
