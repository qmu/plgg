import { box, mapOption } from "plgg";
import {
  type Html,
  type LazyContent,
} from "plgg-view/Html/model/Html";
import { type Attribute } from "plgg-view/Html/model/Attribute";

/**
 * Re-tags an {@link Attribute}'s `Msg` through `f` — static attrs and animation
 * directives carry no `Msg` so they pass through, a handler's `toMsg` is
 * post-composed with `f`.
 */
const mapAttribute =
  <A, B>(f: (a: A) => B) =>
  (attribute: Attribute<A>): Attribute<B> => {
    switch (attribute.__tag) {
      case "Attr":
      case "Anim":
      case "Css":
      case "Key":
        return attribute;
      case "Handler":
        return box("Handler")({
          event: attribute.content.event,
          toMsg: (payload: string) =>
            f(attribute.content.toMsg(payload)),
        });
      case "EventHandler":
        return box("EventHandler")({
          event: attribute.content.event,
          toMsg: (event: Event) =>
            mapOption(f)(
              attribute.content.toMsg(event),
            ),
        });
      case "Host":
        return box("Host")({
          mount: (node, dispatch) =>
            attribute.content.mount(node, (msg) =>
              dispatch(f(msg)),
            ),
          update: (node, dispatch) =>
            attribute.content.update(
              node,
              (msg) => dispatch(f(msg)),
            ),
        });
    }
  };

/**
 * The functor over `Msg`: re-tags every handler in an `Html<A>` tree to produce
 * `Html<B>` (Elm's `Html.map`). Lets a parent embed a child component's view by
 * wrapping the child's messages.
 */
export const mapHtml =
  <A, B>(f: (a: A) => B) =>
  (node: Html<A>): Html<B> => {
    switch (node.__tag) {
      case "Text":
      case "Raw":
        return node;
      case "Element":
        return box("Element")({
          tag: node.content.tag,
          attributes: node.content.attributes.map(
            mapAttribute(f),
          ),
          children: node.content.children.map(
            mapHtml(f),
          ),
        });
      case "Lazy": {
        const content = node.content;
        return box("Lazy")<LazyContent<B>>({
          arg: content.arg,
          fn: content.fn,
          messageMaps: [
            ...content.messageMaps,
            f,
          ],
          render: () =>
            mapHtml(f)(content.render()),
        });
      }
    }
  };
