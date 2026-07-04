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
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * A column's sticky header — the framework version of the
 * pattern the workbench example hand-wrote (`.ex-colhead`):
 * a title, and (for a pushed column) a close link back to
 * the shallower URL, because **leaving a column is the
 * same gesture as entering one — a link**. The close is
 * `aria-label`led and carries the `focusRing` interaction
 * rule; the class hooks are derived from `cssPrefix`
 * (`pm-colhead`), styled by the framework chrome CSS. The
 * close link rides `style_` (the sole class authority) so
 * its atomic classes are not clobbered by a separate
 * `class` attribute.
 */
export type ColHeadProps = Readonly<{
  title: SoftStr;
  close: Option<SoftStr>;
}>;

export const colHead = <Msg>(
  props: ColHeadProps,
): Html<Msg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-colhead`)],
    [
      span(
        [
          attr(
            "class",
            `${cssPrefix}-colhead-title`,
          ),
        ],
        [text(props.title)],
      ),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (to: SoftStr) => [
          a(
            [
              href(to),
              attr(
                "aria-label",
                `Close ${props.title}`,
              ),
              style_(
                `${cssPrefix}-close`,
                focusRing,
              ),
            ],
            [text("×")],
          ),
        ],
      )(props.close),
    ],
  );
