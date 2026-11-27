import {
  test,
  check,
  toBe,
  toEqual,
} from "plgg-test";
import { renderToString, text } from "plgg-view";
import { some, none } from "plgg";
import {
  accordion,
  floatingIconButton,
  iconButton,
  menuButton,
  pageNumbers,
  pagination,
  popover,
  steps,
  tabs,
  toolButton,
  toolGroup,
  toolbar,
} from "plggmatic/Component/usecase/navigation";

test("tabs say which one is selected", () =>
  check(
    renderToString(
      tabs({
        label: "表示",
        items: [
          { id: "a", label: "概要" },
          { id: "b", label: "履歴" },
        ],
        current: "b",
        onSelect: (id: string) => id,
      }),
    ),
    toBe(
      '<div class="pm-tabs" role="tablist" aria-label="表示"><button type="button" class="pm-tab" role="tab" aria-selected="false">概要</button><button type="button" class="pm-tab" role="tab" aria-selected="true">履歴</button></div>',
    ),
  ));

test("page numbers keep the ends and the neighbours, a gap as zero", () =>
  check(
    pageNumbers(5, 10),
    toEqual([1, 0, 4, 5, 6, 0, 10]),
  ));

test("few pages are all shown, with no gap", () =>
  check(pageNumbers(2, 3), toEqual([1, 2, 3])));

test("no pages, no numbers", () =>
  check(pageNumbers(1, 0), toEqual([])));

test("at the first page the step back is really disabled", () =>
  check(
    renderToString(
      pagination({
        label: "ページ",
        page: 1,
        pages: 2,
        onGo: (n: number) => n,
      }),
    ),
    toBe(
      '<nav class="pm-pager" aria-label="ページ"><button type="button" class="pm-pager-item" aria-label="前のページ" disabled="">‹</button><button type="button" class="pm-pager-item" aria-current="page">1</button><button type="button" class="pm-pager-item">2</button><button type="button" class="pm-pager-item" aria-label="次のページ">›</button></nav>',
    ),
  ));

test("steps before the current are done, the current is marked", () =>
  check(
    renderToString(
      steps({
        label: "手順",
        items: ["入力", "確認", "完了"],
        current: 1,
      }),
    ),
    toBe(
      '<ol class="pm-steps" aria-label="手順"><li class="pm-step" data-done="">入力</li><li class="pm-step" aria-current="step">確認</li><li class="pm-step">完了</li></ol>',
    ),
  ));

test("an accordion is native disclosures, open where asked", () =>
  check(
    renderToString(
      accordion([
        {
          title: "一",
          open: true,
          body: [text("あ")],
        },
        { title: "二", open: false, body: [] },
      ]),
    ),
    toBe(
      '<div class="pm-accordion"><details class="pm-accordion-item" open=""><summary>一</summary><div class="pm-accordion-body">あ</div></details><details class="pm-accordion-item"><summary>二</summary><div class="pm-accordion-body"></div></details></div>',
    ),
  ));

test("a menu lists its choices, marking the one that destroys", () =>
  check(
    renderToString(
      menuButton({
        label: "操作",
        items: [
          {
            label: "写す",
            onPress: "c",
            danger: false,
          },
          {
            label: "消す",
            onPress: "d",
            danger: true,
          },
        ],
      }),
    ),
    toBe(
      '<details class="pm-menu-button"><summary>操作</summary><div class="pm-menu-list" role="menu"><button type="button" class="pm-menu-item" role="menuitem">写す</button><button type="button" class="pm-menu-item" role="menuitem" data-danger="">消す</button></div></details>',
    ),
  ));

test("an icon button is named, its glyph unheard", () =>
  check(
    renderToString(
      iconButton({
        label: "足す",
        glyph: "+",
        onPress: "a",
        disabled: false,
      }),
    ) +
      renderToString(
        iconButton({
          label: "足す",
          glyph: "+",
          onPress: "a",
          disabled: true,
        }),
      ),
    toBe(
      '<button type="button" class="pm-icon-btn" aria-label="足す"><span aria-hidden="true">+</span></button><button type="button" class="pm-icon-btn" aria-label="足す" disabled=""><span aria-hidden="true">+</span></button>',
    ),
  ));

test("a popover is a native disclosure: its label, then its panel", () =>
  check(
    renderToString(
      popover({
        label: "くわしく",
        body: [text("中身")],
      }),
    ),
    toBe(
      '<details class="pm-popover"><summary>くわしく</summary><div class="pm-popover-body">中身</div></details>',
    ),
  ));

test("a tool with a glyph is the glyph alone, its label spoken; one that holds a state says it", () =>
  check(
    renderToString(
      toolButton({
        label: "立体",
        glyph: some("⬡"),
        pressed: some(true),
        disabled: false,
        onPress: "p",
      }),
    ),
    toBe(
      '<button type="button" class="pm-tool pm-tool-icon" aria-label="立体" aria-pressed="true"><span aria-hidden="true">⬡</span></button>',
    ),
  ));

test("a tool that only acts carries no pressed state, and a disabled one is really disabled", () =>
  check(
    renderToString(
      toolButton({
        label: "最適配置",
        glyph: none(),
        pressed: none(),
        disabled: true,
        onPress: "p",
      }),
    ),
    toBe(
      '<button type="button" class="pm-tool" disabled="">最適配置</button>',
    ),
  ));

test("a toolbar is a named toolbar of named groups", () =>
  check(
    renderToString(
      toolbar({
        label: "図の操作",
        items: [
          toolGroup({
            label: "履歴",
            items: [text("a"), text("b")],
          }),
        ],
      }),
    ),
    toBe(
      '<div class="pm-toolbar" role="toolbar" aria-label="図の操作"><div class="pm-tool-group" role="group" aria-label="履歴">ab</div></div>',
    ),
  ));

test("a floating icon button is the icon button, marked round", () =>
  check(
    renderToString(
      floatingIconButton({
        label: "追加",
        glyph: "+",
        onPress: "p",
        disabled: false,
      }),
    ),
    toBe(
      '<button type="button" class="pm-icon-btn pm-icon-btn-round" aria-label="追加"><span aria-hidden="true">+</span></button>',
    ),
  ));
