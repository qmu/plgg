import { boardCss } from "plgg-ir-diagram/boardCss";
export const sheetCss = `
${boardCss('.flow-sheet, [data-island="plgg-flow"] figure')}
@scope (.flow-sheet) {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .toolbar {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
  }
  .hint {
    margin: 0 0 12px;
    line-height: 1.85;
    max-width: 62ch;
  }
  :scope > small {
    display: block;
    max-width: 72ch;
    font-size: 12px;
    line-height: 1.7;
    color: var(--graphite);
  }

  /* ---------- controls ---------- */
  .toolbar button,
  .feature button,
  :where(:scope) > div button,
  .editing-tools button {
    padding: 6px 14px;
    border: 1px solid var(--rule, var(--ink));
    background: var(--paper);
    border-radius: 0;
    font-size: 13px;
    line-height: 1.5;
  }
  .toolbar button:hover:not(:disabled),
  .feature button:hover:not(:disabled),
  :where(:scope)
    > div
    button:hover:not(:disabled) {
    background: var(--wash);
  }
  .toolbar button[aria-pressed='true'],
  .feature button,
  :where(:scope)
    > div
    button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .feature button:hover:not(:disabled) {
    background: var(--graphite);
  }
  button:disabled {
    cursor: default;
    color: var(--pencil);
    border-color: var(--pencil);
  }
  .feature button:disabled {
    background: var(--paper);
  }
  .toolbar {
    gap: 0;
  }
  .toolbar button + button {
    margin-left: -1px;
  }
  .feature {
    min-height: 44px;
    display: flex;
    gap: 8px 16px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .feature label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  input,
  select,
  textarea {
    accent-color: var(--ink);
    font: inherit;
    color: inherit;
    border: 1px solid var(--rule, var(--ink));
    border-radius: 0;
    background: var(--paper);
  }

  /* ---------- the board: a drafting sheet ---------- */
  .canvas-wrap {
    touch-action: none;
    position: relative;
    margin: 14px 0;
  }
  .canvas-wrap::before,
  .canvas-wrap::after {
    content: '';
    position: absolute;
    z-index: 1;
    width: 14px;
    height: 14px;
    pointer-events: none;
  }
  .canvas-wrap::before {
    top: -6px;
    left: -6px;
    border-top: 1px solid var(--rule, var(--ink));
    border-left: 1px solid var(--rule, var(--ink));
  }
  .canvas-wrap::after {
    bottom: -6px;
    right: -6px;
    border-bottom: 1px solid var(--rule, var(--ink));
    border-right: 1px solid var(--rule, var(--ink));
  }
  .add-node {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--rule, var(--ink));
    background: var(--paper);
    color: var(--ink);
    font: 400 22px/1 var(--display);
    cursor: pointer;
    pointer-events: auto;
  }
  .add-node:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .board-controls .remove {
    position: absolute;
    top: 56px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--rule, var(--ink));
    background: var(--ink);
    color: var(--paper);
    font: 400 20px/1 var(--display);
    cursor: pointer;
    pointer-events: auto;
  }
  .ground-side {
    pointer-events: none;
    position: absolute;
    inset: auto auto 14px 14px;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--rule, var(--ink));
    padding: 2px 10px;
    font-size: 12px;
  }
  [data-ground-side='below'] + .ground-side {
    background: var(--ink);
    color: var(--paper);
  }
  .minimap {
    background: var(--paper);
    border: 1px solid var(--rule, var(--ink));
    width: 180px;
    height: 85px;
  }
  .minimap * {
    stroke: var(--ink);
  }
  .minimap circle {
    cursor: pointer;
    fill: var(--ink);
  }

  /* ---------- secondary panels ---------- */
  :scope > div:last-child {
    display: grid;
    gap: 12px;
    margin-top: 18px;
  }
  .editing-tools {
    margin-top: 18px;
    border-top: 1px solid var(--rule, var(--ink));
    padding-top: 12px;
  }
  .editing-tools summary {
    cursor: pointer;
    font-weight: 700;
  }
  .editing-tools > div {
    display: grid;
    gap: 10px;
    margin-top: 10px;
    max-width: 65ch;
    grid-template-columns: minmax(0, 1fr);
  }
  .editing-tools > div > *,
  .editing-tools label > * {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }
  .editing-tools table {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
  }
  .editing-tools td,
  .editing-tools th {
    border-bottom: 1px solid var(--trace);
    padding: 4px 10px 4px 0;
    text-align: left;
  }
  .editing-tools input,
  .editing-tools select,
  .editing-tools textarea {
    padding: 6px;
  }
  .editing-tools textarea {
    height: 9em;
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }
  .editing-tools output {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .editing-tools label {
    display: grid;
    gap: 4px;
  }

  .stage {
    order: -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(
        280px,
        28%
      );
    border: 1px solid var(--rule, var(--ink));
    margin: 0 0 18px;
  }
  .stage .canvas-wrap {
    margin: 0;
    aspect-ratio: 900 / 580;
    overflow: hidden;
  }
  .stage .dsl {
    position: relative;
    height: auto;
    padding: 0;
    border-right: 0;
    border-bottom: 0;
    min-height: 0;
    overflow: hidden;
    contain: size;
  }
  .stage .dsl textarea {
    min-height: 0;
  }
  .stage .canvas-wrap::before,
  .stage .canvas-wrap::after {
    display: none;
  }
  .stage .flow-board {
    border: 0;
    height: 100%;
  }
  .board-controls {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    align-items: flex-start;
    pointer-events: none;
  }
  .board-controls > * {
    pointer-events: auto;
  }
  .board-controls .toolbar button {
    background: var(--paper);
  }
  /* the pressed state must outrank the rule above, or a
     pressed button is paper on paper */
  .board-controls .toolbar button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .board-controls .toolbar {
    flex-wrap: nowrap;
    min-width: 0;
    flex: 1;
    overflow: clip;
    white-space: nowrap;
  }
  .toolbar-item {display:inline-flex;flex:none;width:max-content}
  .sheet-history { display: inline-flex; }
  .toolbar .sheet-history button { width: 34px; height: 34px; padding: 0; display: grid; place-items: center; color: var(--ink); }
  .toolbar .sheet-history button + button { margin-left: -1px; }
  .toolbar .sheet-history button:disabled { color: var(--pencil); }
  .board-controls .feature {
    min-height: 0;
    margin: 0;
    padding: 4px 10px;
    background: var(--paper);
    border: 1px solid var(--rule, var(--ink));
    font-size: 13px;
  }
  .board-controls .feature:empty {
    display: none;
  }
  .board-controls .feature button {
    padding: 3px 10px;
  }
  .dsl {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-left: 1px solid var(--rule, var(--ink));
    background: var(--paper);
  }
  .dsl-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 14px;
    border-bottom: 1px solid var(--rule, var(--ink));
  }
  .dsl-head strong {
    font: 600 14px var(--display);
  }
  .dsl-head span {
    font-size: 12px;
    color: var(--graphite);
  }
  .dsl textarea, .dsl-rows {
    flex: 1;
    min-height: 240px;
    width: 100%;
    resize: none;
    border: 0;
    padding: 14px;
    font:
      13px/1.7 ui-monospace,
      'SF Mono',
      Menlo,
      monospace;
    white-space: pre;
    overflow: auto;
    tab-size: 2;
  }
  .dsl-status {
    padding: 8px 14px;
    border-top: 1px solid var(--rule, var(--ink));
    font-size: 12px;
    line-height: 1.6;
    color: var(--graphite);
  }
  .dsl-status[data-error] {
    background: var(--ink);
    color: var(--paper);
  }
  .stage {--panel:320px;position:relative;display:block;flex:1;min-height:0; margin:0}
  .stage .canvas-wrap {height:100%;aspect-ratio:auto}
  .stage .dsl {position:absolute;inset:0 0 0 auto;width:var(--panel);background:color-mix(in srgb,var(--paper) 82%,transparent);border-left:1px solid var(--rule, var(--ink));contain:none}
  .stage .dsl textarea{background:transparent}
  .stage:has(.dsl) .board-controls{right:calc(var(--panel) + 12px)}
  .dsl-handle,.tool-trigger{display:none}
  .maximise{position:absolute;right:calc(var(--panel) + 12px);bottom:12px;width:34px;height:34px;padding:0;display:grid;place-items:center;border:1px solid var(--rule, var(--ink));border-radius:50%;background:var(--paper);color:var(--ink);cursor:pointer}
  .maximise:hover,.maximise[aria-pressed="true"]{background:var(--ink);color:var(--paper)}
  :scope[data-max="true"]{position:fixed;inset:0;z-index:100;height:auto;padding:0;background:var(--paper)}
  :scope[data-max="true"] .stage{--panel:0px}
  :scope[data-max="true"] .stage .dsl{display:none}
  .session-tool,.tool-content[popover]{display:contents}
  .tool-content .editing-tools{margin:0;padding:0}
  .toolbar .minimap{width:100px;height:44px}
  .dsl-head {
    align-items: center;
  }
  .dsl-help {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--rule, var(--ink));
    border-radius: 50%;
    background: var(--paper);
    font: 500 12px/1 var(--display);
  }
  .dsl-help:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .help-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 20;
    display: grid;
    gap: 10px;
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 16px 18px;
    border: 1px solid var(--rule, var(--ink));
    background: var(--paper);
    text-align: left;
    font-size: 13px;
    line-height: 1.6;
  }
  .help-toast strong {
    font: 600 14px var(--display);
  }
  .help-lead,
  .help-close {
    color: var(--graphite);
  }
  .help-close {
    font-size: 12px;
  }
  .help-rows {
    display: grid;
    grid-template-columns: max-content minmax(
        0,
        1fr
      );
    gap: 8px 16px;
    padding: 10px 0;
    border-top: 1px solid var(--rule, var(--ink));
    border-bottom: 1px solid var(--trace);
  }
  .help-rows code {
    font:
      12px/1.6 ui-monospace,
      'SF Mono',
      Menlo,
      monospace;
    white-space: nowrap;
  }

  /* the round buttons sit on the toolbar's own line, the
       sign drawn exactly in the middle */
  .board-controls .add-node,
  .board-controls .remove {
    position: static;
    flex: none;
    width: 34px;
    height: 34px;
    padding: 0;
    display: grid;
    place-items: center;
    place-content: center;
    font-size: 0;
  }

  .board-controls .add-node::before,
  .board-controls .add-node::after,
  .board-controls .remove::before {
    content: '';
    grid-area: 1 / 1;
    width: 12px;
    height: 1px;
    background: currentColor;
  }
  .board-controls .add-node::after {
    transform: rotate(90deg);
  }

  /* the hint under the board names the gestures of the
       pointer in use */
  .hint-touch {
    display: none;
  }
  @media (hover: none) and (pointer: coarse) {
    .hint-mouse {
      display: none;
    }
    .hint-touch {
      display: inline;
    }
  }
  .stage {
    margin-bottom: 6px;
  }
  /* the hint lies on the picture's own floor, bottom left,
     and stops short of the panel beside the picture */
  :scope {
    position: relative;
  }
  :scope > small {
    position: absolute;
    left: 12px;
    bottom: 10px;
    margin: 0;
    max-width: calc(100% - 320px - 70px);
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
  }
  :scope[data-max="true"] > small {
    max-width: calc(100% - 70px);
  }
  .dsl .dsl-rows {
    min-height: 0;
    color: var(--ink);
  }
  .dsl-mode {
    margin-left: auto;
    margin-right: 8px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 1px solid var(--rule, var(--ink));
    border-radius: 50%;
    background: var(--paper);
    cursor: pointer;
  }
  .dsl-mode input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .dsl-mode:hover,
  .dsl-mode:has(input:checked) {
    background: var(--ink);
    color: var(--paper);
  }
  /* No focus rings on the sheet: a ring around a row or a field
     reads as a second selection. Focus shows as a hairline inside. */
  .dsl-row:focus,
  .dsl :is(input, select, button, textarea):focus,
  .dsl-mode:has(input:focus-visible),
  :is(.toolbar, .board-controls) button:focus {
    outline: none;
  }
  .dsl :is(input, select, textarea):focus-visible {
    box-shadow: inset 0 -1px 0 var(--ink);
  }
  .dsl:not(:has(.dsl-mode input:checked))
    textarea,
  .dsl:has(.dsl-mode input:checked)
    :is(.dsl-rows, .dsl-overlay) {
    display: none;
  }
  .dsl-row {
    user-select: none;
    -webkit-user-select: none;
    position: relative;
    min-height: 1.7em;
    width: max-content;
    min-width: 100%;
  }
  .dsl-row[aria-selected='true'],
  .dsl-row:hover {
    background: var(--wash);
  }
  .dsl-row[aria-selected='true']::before {
    content: '';
    position: absolute;
    inset: 0 100% 0 auto;
    width: 2px;
    background: var(--ink);
  }
  .dsl-row[aria-invalid='true'] {
    text-decoration: underline wavy var(--ink);
  }
  .dsl-field {
    position: absolute;
    z-index: 4;
    font:
      13px/1.7 ui-monospace,
      monospace;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--rule, var(--ink));
  }
  .dsl .dsl-properties {
    margin: 0;
    padding: 6px 0 10px;
  }
  /* The property list is plggmatic's (its hooks, its
     rules, the appearance's look). What stays here is
     where the list sits in this panel. */
  .dsl-properties {
    flex: 0 1 auto;
    max-height: 45%;
    overflow: auto;
    border-top: 1px solid var(--rule, var(--ink));
    color: var(--ink);
  }
  .dsl-properties strong {
    display: block;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
  }
  .dsl-properties > button {
    margin: 0 14px 8px;
  }
  .dsl-properties > div {
    padding-inline: 14px;
  }
  .dsl-properties [data-mixed],
  .dsl-properties small {
    color: var(--pencil);
  }
  .flow-board .dsl-hover {
    filter: drop-shadow(0 0 2px var(--graphite));
  }

  @media(min-width:760px) and (max-width:1099px){
    :scope>small{max-width:calc(100% - 280px - 70px)}
    .stage{--panel:280px}
    .stage .dsl{padding-left:28px}
    .dsl-handle{display:block;position:absolute;inset:0 auto 0 0;width:28px;font-size:0;background:var(--paper);border:0;border-right:1px solid var(--trace);touch-action:none}
    .dsl-handle::before{content:"✎";font-size:16px}
    [data-folded="true"] .stage{--panel:28px}
  }
  @media(min-width:760px) and (max-width:899px){
    .stage{--panel:28px}
    [data-folded="false"] .stage{--panel:280px}
  }
  @media(max-width:759px),(orientation:landscape) and (max-height:499px){
    .maximise{display:none}
    :scope{position:relative}
    :scope{--panel:44px}
    .stage{--panel:inherit;margin:0;border:0}
    :scope[data-level="half"]{--panel:45%}
    :scope[data-level="full"]{--panel:85%}
    .stage .dsl{inset:auto 0 0;width:auto;height:var(--panel);padding:0;background:var(--paper);border:0;border-top:1px solid var(--rule, var(--ink))}
    .dsl-handle{position:static;display:block;width:100%;flex:0 0 44px;font:inherit;font-size:14px;border:0;background:var(--paper);touch-action:none}
    .dsl-head{order:-2;flex:0 0 44px;padding:0;min-width:0}
    .dsl-head strong{display:none}
    .dsl-head .dsl-handle{flex:1;min-width:0;width:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dsl-handle::before{content:none}
    .stage .canvas-wrap{touch-action:auto}
    .board-controls .tool-trigger{display:block}
    .tool-content[popover]{display:none}
    .tool-content:popover-open{display:grid;gap:8px;position:fixed;inset:auto 0 env(safe-area-inset-bottom);margin:0 auto;box-sizing:border-box;width:min(100%,32rem);max-height:70dvh;overflow:auto;padding:12px;background:var(--paper);color:var(--ink);border:1px solid var(--rule, var(--ink));white-space:normal}
    .tool-content:popover-open::backdrop{background:color-mix(in srgb,var(--ink) 16%,transparent)}
    .tool-content:popover-open :is(button,input,select,summary){min-height:44px;font-size:14px}
    .tool-content:popover-open .minimap{width:100%;height:150px}
    .stage .dsl-rows{min-height:0}
    :scope:not([data-level="full"]) .dsl-properties{display:none}
    .dsl .dsl-row{min-height:44px}
    .stage .dsl:has(details[open]){height:85%;overflow:auto}
    .stage .dsl summary{min-height:44px}
    .stage .help-rows{grid-template-columns:minmax(0,1fr)}
    .stage .help-rows code{white-space:normal}
    .stage .board-controls,.stage:has(.dsl) .board-controls{inset:0;display:block}
    .board-controls .toolbar{scrollbar-width:none;width:100%;max-width:none;overflow:clip;display:flex;flex-flow:row nowrap;align-items:center;background:var(--paper);white-space:nowrap}
    .toolbar>*{flex:none}.toolbar span{display:inline-flex}
    .toolbar :is(input,select,summary){min-height:44px}
    .toolbar button,.toolbar .sheet-history button,.stage .dsl :is(button,input,select){min-height:44px;min-width:44px}
    .toolbar button[data-icon]{font-size:0}.toolbar button[data-icon]::before{content:attr(data-icon);font-size:20px}
    .toolbar-item[slot] button[data-icon]{font-size:14px}
    .toolbar-item[slot] button[data-icon]::before{content:none}
    .dsl-properties>div{grid-template-columns:minmax(0,1fr);height:auto;min-height:64px}
    .dsl-properties{max-height:45%}
    [data-level="full"] .dsl-properties[data-selected]{order:-1}

    .dsl .dsl-mode{width:44px;height:44px}
    .stage .help-toast{inset:0 0 auto;width:100%;max-width:none;max-height:85%;overflow:auto}
    :scope>small{position:absolute;max-width:none;bottom:calc(var(--panel) + 12px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--paper);pointer-events:none}
    :scope>small[hidden],.hint-mouse{display:none}.hint-touch{display:inline}
    .stage :is(input,select,textarea,small,.dsl-row){font-size:max(12px,1em)}
  }
  @media(orientation:landscape) and (max-height:499px){
    [data-level="half"] .stage,[data-level="full"] .stage{--panel:50%}
    .stage .dsl{inset:0 0 0 auto;width:var(--panel);height:auto;padding-left:44px}
    .stage .dsl-handle{position:absolute;inset:0 auto 0 0;width:44px;writing-mode:vertical-rl}
    .stage:has(.dsl) .toolbar{width:calc(100% - var(--panel))}
  }

}
`;
