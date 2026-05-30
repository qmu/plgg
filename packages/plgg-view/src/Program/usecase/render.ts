import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  attr$,
  handler$,
} from "plgg-view/Html/model/Attribute";
import {
  HtmlAlgebra,
  foldHtml,
} from "plgg-view/Html/usecase/foldHtml";
import { isSafeAttrName } from "plgg-view/Html/usecase/escape";

/**
 * The DOM event payload a handler receives: the target's `value` where it has
 * one (input/textarea/select, narrowed via `instanceof`, never cast), else `""`.
 */
const payloadOf = (event: Event): SoftStr =>
  event.target instanceof HTMLInputElement ||
  event.target instanceof HTMLTextAreaElement ||
  event.target instanceof HTMLSelectElement
    ? event.target.value
    : "";

/**
 * Applies one {@link Attribute} to a real DOM element: a static attr is set
 * (unsafe names dropped); a handler is wired with `addEventListener`, calling
 * `dispatch(toMsg(payload))` (and `preventDefault` for `submit`). This is the
 * imperative DOM seam — confined here.
 */
const applyAttribute =
  <Msg>(
    node: Element,
    dispatch: (msg: Msg) => void,
  ) =>
  (attribute: Attribute<Msg>): void =>
    match(attribute)(
      [
        attr$(),
        ({ content }): void => {
          if (isSafeAttrName(content.name)) {
            node.setAttribute(
              content.name,
              content.value,
            );
          }
        },
      ],
      [
        handler$(),
        ({ content }): void => {
          node.addEventListener(
            content.event,
            (event) => {
              if (content.event === "submit") {
                event.preventDefault();
              }
              dispatch(
                content.toMsg(payloadOf(event)),
              );
            },
          );
        },
      ],
    );

/**
 * The CSR algebra: fold an {@link Html} into real DOM. Text becomes a `Text`
 * node; an element a created node with safe attributes, wired handlers, and
 * appended (already-built) children. The client counterpart to the SSR string
 * fold — same tree, different target.
 */
const domAlgebra = <Msg>(
  dispatch: (msg: Msg) => void,
): HtmlAlgebra<Msg, Node> => ({
  text: (value) => document.createTextNode(value),
  element: (tag, attributes, children) => {
    const node = document.createElement(tag);
    attributes.forEach(
      applyAttribute(node, dispatch),
    );
    children.forEach((child) =>
      node.appendChild(child),
    );
    return node;
  },
});

/**
 * Renders an {@link Html} tree into `container`, replacing its children. Event
 * handlers dispatch through `dispatch`. The only DOM-touching renderer — shipped
 * on the `plgg-view/client` subpath so the core/SSR entry stays DOM-free.
 */
export const render = <Msg>(
  node: Html<Msg>,
  container: Element,
  dispatch: (msg: Msg) => void,
): void =>
  container.replaceChildren(
    foldHtml(domAlgebra(dispatch))(node),
  );
