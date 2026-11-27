import { test, check, toBe } from "plgg-test";
import { some, none } from "plgg";
import { renderToString, text } from "plgg-view";
import {
  alert,
  progress,
  skeleton,
  spinner,
  tooltip,
} from "plggmatic/Component/usecase/feedback";

test("a danger alert interrupts; the others are a status", () =>
  check(
    renderToString(
      alert({
        tone: "danger",
        title: some("失敗"),
        body: [text("もう一度")],
      }),
    ) +
      renderToString(
        alert({
          tone: "info",
          title: none(),
          body: [text("お知らせ")],
        }),
      ),
    toBe(
      '<div class="pm-alert pm-alert-danger" role="alert"><p class="pm-alert-title">失敗</p>もう一度</div><div class="pm-alert pm-alert-info" role="status">お知らせ</div>',
    ),
  ));

test("a progress with a share is that long, kept between nothing and all", () =>
  check(
    renderToString(
      progress({
        label: "取り込み",
        share: some(1.4),
      }),
    ),
    toBe(
      '<div class="pm-progress" role="progressbar" aria-label="取り込み" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="pm-progress-track"><div class="pm-progress-bar" style="width:100%"></div></div></div>',
    ),
  ));

test("a progress with no share only says that work goes on", () =>
  check(
    renderToString(
      progress({
        label: "取り込み",
        share: none(),
      }),
    ),
    toBe(
      '<div class="pm-progress" role="progressbar" aria-label="取り込み" data-pm-busy=""><div class="pm-progress-track"><div class="pm-progress-bar"></div></div></div>',
    ),
  ));

test("a spinner says what is waited for", () =>
  check(
    renderToString(spinner("読み込み中")),
    toBe(
      '<span class="pm-spinner" role="status"><span class="pm-spinner-mark" aria-hidden="true"></span>読み込み中</span>',
    ),
  ));

test("a skeleton has as many lines as asked, at least one, unheard", () =>
  check(
    renderToString(skeleton(2)) +
      renderToString(skeleton(0)),
    toBe(
      '<div class="pm-skeleton" aria-hidden="true"><div class="pm-skeleton-line"></div><div class="pm-skeleton-line"></div></div><div class="pm-skeleton" aria-hidden="true"><div class="pm-skeleton-line"></div></div>',
    ),
  ));

test("a tooltip's word is also the thing's description, and it can be focused", () =>
  check(
    renderToString(
      tooltip({
        tip: "税込み",
        children: [text("額")],
      }),
    ),
    toBe(
      '<span class="pm-tip" data-pm-tip="税込み" aria-description="税込み" tabindex="0">額</span>',
    ),
  ));
