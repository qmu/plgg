import { test, check, toBe } from "plgg-test";
import { renderToString, text } from "plgg-view";
import {
  cluster,
  exampleBox,
  preview,
  split,
  swatches,
} from "plggmatic/Component/usecase/presenting";

test("an example box and a cluster only wrap what they are given", () =>
  check(
    renderToString(
      exampleBox([
        cluster([text("a"), text("b")]),
      ]),
    ),
    toBe(
      '<div class="pm-example"><div class="pm-example-item"><div class="pm-cluster">ab</div></div></div>',
    ),
  ));

test("a split is two panes with the kit's splitter between them", () =>
  check(
    renderToString(
      split({
        label: "幅を変える",
        orientation: "vertical",
        first: [text("左")],
        second: [text("右")],
      }),
    ),
    toBe(
      '<div class="pm-split" data-orientation="vertical"><div class="pm-split-pane">左</div><div class="pm-splitter" role="separator" aria-orientation="vertical" aria-label="幅を変える"></div><div class="pm-split-pane">右</div></div>',
    ),
  ));

test("a swatch shows its colour, its name and how it is written", () =>
  check(
    renderToString(
      swatches([
        {
          name: "text",
          written: "--pm-text",
          color: "var(--pm-text)",
        },
      ]),
    ),
    toBe(
      '<div class="pm-swatches"><div class="pm-swatch"><span class="pm-swatch-chip" style="background:var(--pm-text)"></span><strong>text</strong><code>--pm-text</code></div></div>',
    ),
  ));

test("a preview names its page, offers it in its own tab, and loads it lazily", () =>
  check(
    renderToString(
      preview({
        title: "画面の例",
        src: "demo1.html",
        openLabel: "新しいタブで開く",
      }),
    ),
    toBe(
      '<div class="pm-preview"><div class="pm-preview-bar"><span>画面の例</span><a href="demo1.html" target="_blank" rel="noopener">新しいタブで開く</a></div><iframe src="demo1.html" title="画面の例" loading="lazy"></iframe></div>',
    ),
  ));
