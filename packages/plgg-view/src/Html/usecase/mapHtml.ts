import { box, match } from "plgg";
import {
  Html,
  element$,
  text$,
} from "plgg-view/Html/model/Html";
import {
  Attribute,
  attr$,
  handler$,
  anim$,
  css$,
} from "plgg-view/Html/model/Attribute";

/**
 * Re-tags an {@link Attribute}'s `Msg` through `f` — static attrs and animation
 * directives carry no `Msg` so they pass through, a handler's `toMsg` is
 * post-composed with `f`.
 */
const mapAttribute =
  <A, B>(f: (a: A) => B) =>
  (attribute: Attribute<A>): Attribute<B> =>
    match(attribute)(
      [
        attr$(),
        ({ content }): Attribute<B> =>
          box("Attr")(content),
      ],
      [
        handler$(),
        ({ content }): Attribute<B> =>
          box("Handler")({
            event: content.event,
            toMsg: (payload) =>
              f(content.toMsg(payload)),
          }),
      ],
      [
        anim$(),
        ({ content }): Attribute<B> =>
          box("Anim")(content),
      ],
      [
        css$(),
        ({ content }): Attribute<B> =>
          box("Css")(content),
      ],
    );

/**
 * The functor over `Msg`: re-tags every handler in an `Html<A>` tree to produce
 * `Html<B>` (Elm's `Html.map`). Lets a parent embed a child component's view by
 * wrapping the child's messages.
 */
export const mapHtml =
  <A, B>(f: (a: A) => B) =>
  (node: Html<A>): Html<B> =>
    match(node)(
      [
        element$(),
        ({ content }): Html<B> =>
          box("Element")({
            tag: content.tag,
            attributes: content.attributes.map(
              mapAttribute(f),
            ),
            children: content.children.map(
              mapHtml(f),
            ),
          }),
      ],
      [
        text$(),
        ({ content }): Html<B> =>
          box("Text")(content),
      ],
    );
