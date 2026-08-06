import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  slot,
  span,
  a,
  text,
  attr,
  href,
} from "plgg-view";
import { style_ } from "plggmatic/styleEntry";
import { focusRing } from "plggmatic/Component/model/interaction";
import {
  colHeadClass,
  colHeadLinkClass,
  colHeadTitleClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * A column's sticky header — the framework version of the
 * pattern the workbench example hand-wrote (`.ex-colhead`):
 * a title, which for a PUSHED column (a `close` URL is
 * present) IS the reset affordance — clicking the title
 * navigates to `close`, collapsing back to this column,
 * because **leaving a column is the same gesture as
 * entering one — a link** (there is no separate close/×
 * button). A root column (no `close`) shows a plain,
 * non-clickable title. The title link is `aria-label`led
 * and rides `style_` (the sole class authority, so its
 * atomic focus-ring classes are not clobbered by a separate
 * `class` attribute); the class hooks are derived from
 * `cssPrefix` (`pm-colhead`/`pm-colhead-title`), styled by
 * the framework chrome CSS.
 */
export type ColHeadProps = Readonly<{
  title: SoftStr;
  close: Option<SoftStr>;
  links: ReadonlyArray<
    Readonly<{
      label: SoftStr;
      href: SoftStr;
    }>
  >;
}>;

export const colHead = <Msg>(
  props: ColHeadProps,
): Html<Msg, "div"> =>
  slot(
    [attr("class", colHeadClass)],
    [
      matchOption<SoftStr, Html<Msg>>(
        () =>
          span(
            [attr("class", colHeadTitleClass)],
            [text(props.title)],
          ),
        (to: SoftStr) =>
          a(
            [
              href(to),
              attr(
                "aria-label",
                `Reset to ${props.title}`,
              ),
              style_(
                colHeadTitleClass,
                focusRing,
              ),
            ],
            [text(props.title)],
          ),
      )(props.close),
      ...props.links.map((link) =>
        a(
          [
            href(link.href),
            style_(colHeadLinkClass, focusRing),
          ],
          [text(link.label)],
        ),
      ),
    ],
  );
