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
    flex-wrap: wrap;
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
    border: 1px solid var(--ink);
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
    border: 1px solid var(--ink);
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
    border-top: 1px solid var(--ink);
    border-left: 1px solid var(--ink);
  }
  .canvas-wrap::after {
    bottom: -6px;
    right: -6px;
    border-bottom: 1px solid var(--ink);
    border-right: 1px solid var(--ink);
  }
  .add-node {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--ink);
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
    border: 1px solid var(--ink);
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
    border: 1px solid var(--ink);
    padding: 2px 10px;
    font-size: 12px;
  }
  [data-ground-side='below'] + .ground-side {
    background: var(--ink);
    color: var(--paper);
  }
  .minimap {
    background: var(--paper);
    border: 1px solid var(--ink);
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
    border-top: 1px solid var(--ink);
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
    border: 1px solid var(--ink);
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
    flex-wrap: wrap;
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
    flex-wrap: wrap;
    max-width: calc(100% - 48px);
  }
  .board-controls .feature {
    min-height: 0;
    margin: 0;
    padding: 4px 10px;
    background: var(--paper);
    border: 1px solid var(--ink);
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
    border-left: 1px solid var(--ink);
    background: var(--paper);
  }
  .dsl-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 14px;
    border-bottom: 1px solid var(--ink);
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
  .dsl textarea:focus-visible {
    outline-offset: -3px;
  }
  .dsl-status {
    padding: 8px 14px;
    border-top: 1px solid var(--ink);
    font-size: 12px;
    line-height: 1.6;
    color: var(--graphite);
  }
  .dsl-status[data-error] {
    background: var(--ink);
    color: var(--paper);
  }
  @media (max-width: 1000px) {
    .stage {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto 320px;
    }
    .dsl {
      border-left: 0;
      border-top: 1px solid var(--ink);
    }
    .dsl textarea {
      min-height: 220px;
    }
  }
  @media (min-width: 1001px) {
    .stage {
      flex: 1 1 auto;
      min-height: 0;
      margin-bottom: 10px;
    }
    .stage .canvas-wrap {
      aspect-ratio: auto;
      height: 100%;
    }
    :scope > small {
      flex: none;
    }
  }
  .board-controls .add-node {
    background: var(--paper);
    color: var(--ink);
  }
  .board-controls .add-node:hover {
    background: var(--ink);
    color: var(--paper);
  }

  /* the DSL lies over the right of the board, the sheet
       showing faintly through it */
  @media (min-width: 1001px) {
    .stage {
      position: relative;
      grid-template-columns: minmax(0, 1fr);
    }
    .stage .dsl {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: clamp(260px, 30%, 380px);
      height: auto;
      border-left: 1px solid var(--ink);
      background: color-mix(
        in srgb,
        var(--paper) 60%,
        transparent
      );
      contain: none;
    }
    .stage .dsl textarea {
      background: transparent;
    }
    .stage:has(.dsl) .board-controls {
      right: calc(
        clamp(260px, 30%, 380px) + 12px
      );
    }
  }
  .dsl-head {
    align-items: center;
  }
  .dsl-help {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--ink);
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
    border: 1px solid var(--ink);
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
    border-top: 1px solid var(--ink);
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
    top: 0;
    right: 0;
    width: 34px;
    height: 34px;
    padding: 0;
    display: grid;
    place-items: center;
    place-content: center;
    font-size: 0;
  }
  .board-controls .remove {
    top: 42px;
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
  :scope > small {
    max-width: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
  }
  .dsl .dsl-rows {
    min-height: 0;
    color: var(--ink);
  }
  .dsl-mode {
    margin-left: auto;
    margin-right: 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .dsl-mode input {
    vertical-align: middle;
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
    border: 1px solid var(--ink);
  }
  .dsl .dsl-properties {
    margin: 0;
    padding: 6px 0 10px;
  }
  .dsl-properties {
    flex: 0 1 auto;
    max-height: 45%;
    overflow: auto;
    border-top: 1px solid var(--ink);
    color: var(--ink);
    font-size: 13px;
  }
  .dsl-properties strong {
    display: block;
    padding: 4px 14px 6px;
    font-weight: 600;
  }
  .property-row {
    display: grid;
    grid-template-columns: 7.5em minmax(0, 1fr);
    align-items: center;
    height: 28px;
    box-sizing: border-box;
    border-top: 1px solid var(--trace);
    padding: 0 14px;
  }
  .property-row > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .property-row > div {
    display: flex;
    min-width: 0;
    align-items: center;
  }
  .dsl-properties :is(input, select, button) {
    min-width: 0;
    max-width: 100%;
    border: 1px solid var(--ink);
    border-radius: 0;
    box-shadow: none;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    padding: 1px 4px;
  }
  .dsl-properties :is(input, select) {
    flex: 1;
  }
  .dsl .dsl-properties button[aria-pressed='true'],
  .dsl .dsl-properties button[aria-pressed='true']:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .dsl-properties [data-mixed],
  .dsl-properties small,
  .dsl-properties input::placeholder,
  .dsl-properties :disabled {
    color: var(--pencil);
  }
  .flow-board .dsl-hover {
    filter: drop-shadow(0 0 2px var(--graphite));
  }

}
`;
