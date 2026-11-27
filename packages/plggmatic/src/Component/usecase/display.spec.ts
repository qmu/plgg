import { test, check, toBe } from "plgg-test";
import { some, none } from "plgg";
import { renderToString, text } from "plgg-view";
import {
  avatar,
  badge,
  card,
  codeBlock,
  dataTable,
  descList,
  divider,
  emptyState,
  itemList,
  tag,
} from "plggmatic/Component/usecase/display";

test("a badge with no tone is plain; with one it carries the tone", () =>
  check(
    renderToString(
      badge({ label: "3", tone: none() }),
    ) +
      renderToString(
        badge({
          label: "済",
          tone: some("success"),
        }),
      ),
    toBe(
      '<span class="pm-badge">3</span><span class="pm-badge pm-badge-success">済</span>',
    ),
  ));

test("a tag that can be taken off carries a named button", () =>
  check(
    renderToString(
      tag({ label: "急ぎ", onRemove: some("x") }),
    ),
    toBe(
      '<span class="pm-tag">急ぎ<button type="button" class="pm-tag-remove" aria-label="急ぎのタグを外す">×</button></span>',
    ),
  ));

test("a tag that stays has no button", () =>
  check(
    renderToString(
      tag({ label: "急ぎ", onRemove: none() }),
    ),
    toBe('<span class="pm-tag">急ぎ</span>'),
  ));

test("a card draws its head only when named and its foot only when filled", () =>
  check(
    renderToString(
      card({
        title: none(),
        body: [text("中身")],
        foot: [],
      }),
    ),
    toBe(
      '<section class="pm-card"><div class="pm-card-body">中身</div></section>',
    ),
  ));

test("a named card with a foot has all three parts", () =>
  check(
    renderToString(
      card({
        title: some("名前"),
        body: [text("中身")],
        foot: [text("足")],
      }),
    ),
    toBe(
      '<section class="pm-card"><header class="pm-card-head">名前</header><div class="pm-card-body">中身</div><footer class="pm-card-foot">足</footer></section>',
    ),
  ));

test("a numeric column is set to the right in head and body alike", () =>
  check(
    renderToString(
      dataTable({
        caption: "売上",
        columns: [
          { label: "店", numeric: false },
          { label: "額", numeric: true },
        ],
        rows: [[text("東"), text("40")]],
      }),
    ),
    toBe(
      '<div class="pm-table-wrap"><table class="pm-table" aria-label="売上"><thead><tr><th scope="col">店</th><th scope="col" class="pm-num">額</th></tr></thead><tbody><tr><td>東</td><td class="pm-num">40</td></tr></tbody></table></div>',
    ),
  ));

test("a description list pairs each term with its value", () =>
  check(
    renderToString(
      descList([
        { term: "名前", value: [text("東店")] },
      ]),
    ),
    toBe(
      '<dl class="pm-desc"><dt>名前</dt><dd>東店</dd></dl>',
    ),
  ));

test("a divider is a rule", () =>
  check(
    renderToString(divider()),
    toBe('<hr class="pm-divider" />'),
  ));

test("an avatar shows the first letter and says the whole name", () =>
  check(
    renderToString(avatar(" 田村 ")),
    toBe(
      '<span class="pm-avatar" role="img" aria-label=" 田村 ">田</span>',
    ),
  ));

test("a code block keeps the source as written", () =>
  check(
    renderToString(codeBlock("a < b")),
    toBe(
      '<pre class="pm-code"><code>a &lt; b</code></pre>',
    ),
  ));

test("an empty state says what is missing and what to do", () =>
  check(
    renderToString(
      emptyState({
        title: "まだありません",
        hint: "最初の1件を足してください。",
        action: [],
      }),
    ),
    toBe(
      '<div class="pm-empty"><p class="pm-empty-title">まだありません</p><p>最初の1件を足してください。</p></div>',
    ),
  ));

test("a list row has its title, its note when there is one, and what trails", () =>
  check(
    renderToString(
      itemList([
        {
          title: "東店",
          note: some("営業中"),
          trailing: [text("3")],
        },
        {
          title: "西店",
          note: none(),
          trailing: [],
        },
      ]),
    ),
    toBe(
      '<ul class="pm-items"><li class="pm-items-row"><div><div class="pm-items-title">東店</div><div class="pm-items-note">営業中</div></div><div class="pm-items-trail">3</div></li><li class="pm-items-row"><div><div class="pm-items-title">西店</div></div><div class="pm-items-trail"></div></li></ul>',
    ),
  ));
