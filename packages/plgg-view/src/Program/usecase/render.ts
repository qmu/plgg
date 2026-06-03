import {
  Option,
  SoftStr,
  some,
  none,
  pipe,
  match,
  fromNullable,
  chainOption,
  matchOption,
} from "plgg";
import {
  Html,
  ElementContent,
  element$,
  text$,
} from "plgg-view/Html/model/Html";
import {
  Attribute,
  Motion,
  Frame,
  attr$,
  handler$,
  anim$,
} from "plgg-view/Html/model/Attribute";
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
 * Per-DOM-node event bookkeeping (kept off the node, in the renderer's
 * {@link Wiring} registry, so no expando property and no cast is needed):
 * `on` is the current handler for each wired event, `attached` records which
 * events already carry a real listener. Patching swaps an `on` entry; the
 * single attached listener reads it live — so a re-render never adds, removes,
 * or duplicates DOM listeners (no leaks, no stale closures).
 */
type NodeWiring<Msg> = Readonly<{
  on: Map<SoftStr, (payload: SoftStr) => Msg>;
  attached: Set<SoftStr>;
}>;

/**
 * Everything the renderer threads through the tree: the app's `dispatch` and a
 * weak registry of per-node event {@link NodeWiring}. One {@link Wiring} is
 * created per mount by {@link makeRenderer}; the `WeakMap` lets node bookkeeping
 * be collected with the nodes themselves.
 */
export type Wiring<Msg> = Readonly<{
  dispatch: (msg: Msg) => void;
  registry: WeakMap<Element, NodeWiring<Msg>>;
  play: Play;
}>;

/** The node's {@link NodeWiring}, created and registered on first use. */
const nodeWiringOf = <Msg>(
  wiring: Wiring<Msg>,
  node: Element,
): NodeWiring<Msg> =>
  pipe(
    fromNullable(wiring.registry.get(node)),
    matchOption(
      (): NodeWiring<Msg> => {
        const created: NodeWiring<Msg> = {
          on: new Map(),
          attached: new Set(),
        };
        wiring.registry.set(node, created);
        return created;
      },
      (existing: NodeWiring<Msg>) => existing,
    ),
  );

/**
 * Wires (or re-points) an event handler on a node. The first time an event is
 * seen the single real listener is attached — it reads the *current* handler
 * from the registry each fire, so later patches only swap the `on` entry.
 */
const setHandler = <Msg>(
  wiring: Wiring<Msg>,
  node: Element,
  event: SoftStr,
  toMsg: (payload: SoftStr) => Msg,
): void => {
  // confined DOM seam: attach at most one listener per (node, event)
  const nodeWiring = nodeWiringOf(wiring, node);
  if (!nodeWiring.attached.has(event)) {
    nodeWiring.attached.add(event);
    node.addEventListener(event, (domEvent) =>
      pipe(
        fromNullable(nodeWiring.on.get(event)),
        matchOption(
          () => undefined,
          (current: (p: SoftStr) => Msg) => {
            if (event === "submit") {
              domEvent.preventDefault();
            }
            wiring.dispatch(
              current(payloadOf(domEvent)),
            );
          },
        ),
      ),
    );
  }
  nodeWiring.on.set(event, toMsg);
};

/**
 * Drops a handler the new tree no longer carries: the `on` entry is removed so
 * the still-attached listener becomes a no-op until (if ever) re-added.
 */
const clearHandler = <Msg>(
  wiring: Wiring<Msg>,
  node: Element,
  event: SoftStr,
): void => {
  nodeWiringOf(wiring, node).on.delete(event);
};

/**
 * Whether a node is a text-entry control whose `value` must be driven as a
 * property (not just an attribute) to stay correct under node reuse.
 * `<select>` is excluded: its value is governed by its `<option>` children,
 * which a parent's attribute pass would set before they exist.
 */
const isValueControl = (
  node: Element,
): node is
  | HTMLInputElement
  | HTMLTextAreaElement =>
  node instanceof HTMLInputElement ||
  node instanceof HTMLTextAreaElement;

/**
 * Reflects `value`/`checked` onto the live DOM *property* of a form control.
 * Under node reuse the attribute and the property diverge once a user edits the
 * field, so a controlled view (`value_(model.draft)`, a conditional `checked`)
 * must drive the property — e.g. so the add form's input actually clears after
 * submit. Narrowed with `instanceof`, never cast.
 */
const syncSetProperty = (
  node: Element,
  name: SoftStr,
  value: SoftStr,
): void => {
  if (name === "value" && isValueControl(node)) {
    if (node.value !== value) {
      node.value = value;
    }
  } else if (
    name === "checked" &&
    node instanceof HTMLInputElement
  ) {
    if (!node.checked) {
      node.checked = true;
    }
  }
};

/** The {@link syncSetProperty} counterpart for a removed `value`/`checked`. */
const syncRemoveProperty = (
  node: Element,
  name: SoftStr,
): void => {
  if (name === "value" && isValueControl(node)) {
    node.value = "";
  } else if (
    name === "checked" &&
    node instanceof HTMLInputElement
  ) {
    node.checked = false;
  }
};

/** Sets a static attribute (unsafe names dropped) and syncs its property. */
const setStaticAttr = (
  node: Element,
  name: SoftStr,
  value: SoftStr,
): void => {
  if (isSafeAttrName(name)) {
    node.setAttribute(name, value);
    syncSetProperty(node, name, value);
  }
};

/** Removes a static attribute and resets its property. */
const removeStaticAttr = (
  node: Element,
  name: SoftStr,
): void => {
  if (isSafeAttrName(name)) {
    node.removeAttribute(name);
    syncRemoveProperty(node, name);
  }
};

/** Applies one {@link Attribute} to a freshly created node. */
const applyAttribute =
  <Msg>(wiring: Wiring<Msg>, node: Element) =>
  (attribute: Attribute<Msg>): void =>
    match(attribute)(
      [
        attr$(),
        ({ content }): void =>
          setStaticAttr(
            node,
            content.name,
            content.value,
          ),
      ],
      [
        handler$(),
        ({ content }): void =>
          setHandler(
            wiring,
            node,
            content.event,
            content.toMsg,
          ),
      ],
      // an animation directive is not a DOM attribute: the enter motion is
      // played in createNode once the node and its children exist.
      [anim$(), (): void => undefined],
    );

/**
 * The enter (node-creation) {@link Motion} carried by an attribute list, if any
 * — the {@link handlersOf} counterpart for the {@link anim$} channel.
 */
const enterOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): Option<Motion> =>
  attributes.reduce<Option<Motion>>(
    (acc, attribute) =>
      match(attribute)(
        [attr$(), (): Option<Motion> => acc],
        [handler$(), (): Option<Motion> => acc],
        [
          anim$(),
          ({ content }): Option<Motion> =>
            content.enter,
        ],
      ),
    none(),
  );

/** The exit (node-removal) {@link Motion} of an attribute list, if any. */
const exitOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): Option<Motion> =>
  attributes.reduce<Option<Motion>>(
    (acc, attribute) =>
      match(attribute)(
        [attr$(), (): Option<Motion> => acc],
        [handler$(), (): Option<Motion> => acc],
        [
          anim$(),
          ({ content }): Option<Motion> =>
            content.exit,
        ],
      ),
    none(),
  );

/**
 * The exit {@link Motion} of a vnode — `none` for a text leaf or an element
 * with no exit directive.
 */
const exitMotionOf = <Msg>(
  vnode: Html<Msg>,
): Option<Motion> =>
  match(vnode)(
    [text$(), (): Option<Motion> => none()],
    [
      element$(),
      ({ content }): Option<Motion> =>
        exitOf(content.attributes),
    ],
  );

/**
 * One {@link Frame} as a WAAPI keyframe — each present property contributed by
 * an {@link Option} spread, so nothing is set unless the frame names it.
 */
const frameToKeyframe = (
  frame: Frame,
): Keyframe => ({
  ...matchOption(
    () => ({}),
    (opacity: number) => ({ opacity }),
  )(frame.opacity),
  ...matchOption(
    () => ({}),
    (transform: SoftStr) => ({ transform }),
  )(frame.transform),
});

/** A {@link Motion}'s two endpoints as WAAPI keyframes. */
const framesOf = (
  motion: Motion,
): ReadonlyArray<Keyframe> => [
  frameToKeyframe(motion.from),
  frameToKeyframe(motion.to),
];

/** A {@link Motion}'s timing as WAAPI options (end state retained). */
const optsOf = (
  motion: Motion,
): KeyframeAnimationOptions => ({
  duration: motion.durationMs,
  easing: motion.easing,
  fill: "forwards",
});

/**
 * Whether the user has asked to reduce motion (WCAG 2.2 AA). A missing
 * `matchMedia` reads as "motion allowed".
 */
const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

/**
 * Plays a {@link Motion} on a node, resolving when it finishes — the renderer's
 * one animation seam. The default {@link waapiPlay} drives the Web Animations
 * API; {@link makeRenderer} accepts an alternative so a WAAPI-less test DOM can
 * inject a controllable stand-in.
 */
export type Play = (
  node: Element,
  motion: Motion,
) => Promise<void>;

/**
 * The default {@link Play}: feature-detects WAAPI and honours reduced-motion, so
 * it no-ops gracefully (a resolved promise, nothing animated) when motion is
 * unavailable or unwanted, and otherwise GPU-composites the tween.
 */
export const waapiPlay: Play = (node, motion) =>
  typeof node.animate === "function" &&
  !prefersReducedMotion()
    ? node
        .animate(
          [...framesOf(motion)],
          optsOf(motion),
        )
        .finished.then(
          () => undefined,
          () => undefined,
        )
    : Promise.resolve();

/**
 * Builds a fresh DOM node from an {@link Html} tree — text becomes a `Text`
 * node, an element a created node with safe attributes, wired handlers, and
 * appended children. Used on first paint and whenever a node must be replaced.
 */
export const createNode =
  <Msg>(wiring: Wiring<Msg>) =>
  (node: Html<Msg>): Node =>
    match(node)(
      [
        text$(),
        ({ content }): Node =>
          document.createTextNode(content.value),
      ],
      [
        element$(),
        ({ content }): Node => {
          const el = document.createElement(
            content.tag,
          );
          content.attributes.forEach(
            applyAttribute(wiring, el),
          );
          content.children.forEach((child) =>
            el.appendChild(
              createNode(wiring)(child),
            ),
          );
          // confined DOM seam: play the enter motion on the freshly built node
          // (a no-op when none is declared or motion is unavailable). Fire and
          // forget — the Model is uninvolved.
          pipe(
            enterOf(content.attributes),
            matchOption(
              (): void => undefined,
              (motion: Motion): void => {
                void wiring.play(el, motion);
              },
            ),
          );
          return el;
        },
      ],
    );

/** The static attributes of an attribute list, as a `name → value` map. */
const staticAttrsOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): Map<SoftStr, SoftStr> =>
  attributes.reduce(
    (acc, attribute) =>
      match(attribute)(
        [
          attr$(),
          ({ content }): Map<SoftStr, SoftStr> =>
            acc.set(content.name, content.value),
        ],
        [
          handler$(),
          (): Map<SoftStr, SoftStr> => acc,
        ],
        [
          anim$(),
          (): Map<SoftStr, SoftStr> => acc,
        ],
      ),
    new Map<SoftStr, SoftStr>(),
  );

/** The handlers of an attribute list, as an `event → toMsg` map. */
const handlersOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): Map<SoftStr, (payload: SoftStr) => Msg> =>
  attributes.reduce(
    (acc, attribute) =>
      match(attribute)(
        [
          attr$(),
          (): Map<
            SoftStr,
            (payload: SoftStr) => Msg
          > => acc,
        ],
        [
          handler$(),
          ({
            content,
          }): Map<
            SoftStr,
            (payload: SoftStr) => Msg
          > =>
            acc.set(content.event, content.toMsg),
        ],
        [
          anim$(),
          (): Map<
            SoftStr,
            (payload: SoftStr) => Msg
          > => acc,
        ],
      ),
    new Map<SoftStr, (payload: SoftStr) => Msg>(),
  );

/** Patches a reused element's attributes: add/change, remove, re-point. */
const patchAttributes =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    node: Element,
    oldAttributes: ReadonlyArray<Attribute<Msg>>,
    newAttributes: ReadonlyArray<Attribute<Msg>>,
  ): void => {
    const oldStatic = staticAttrsOf(
      oldAttributes,
    );
    const newStatic = staticAttrsOf(
      newAttributes,
    );
    newStatic.forEach((value, name) => {
      if (oldStatic.get(name) !== value) {
        setStaticAttr(node, name, value);
      }
    });
    oldStatic.forEach((_value, name) => {
      if (!newStatic.has(name)) {
        removeStaticAttr(node, name);
      }
    });
    const newHandlers = handlersOf(newAttributes);
    const oldHandlers = handlersOf(oldAttributes);
    newHandlers.forEach((toMsg, event) =>
      setHandler(wiring, node, event, toMsg),
    );
    oldHandlers.forEach((_toMsg, event) => {
      if (!newHandlers.has(event)) {
        clearHandler(wiring, node, event);
      }
    });
  };

/** Patches a reused element in place: its attributes, then its children. */
const patchElement =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    node: Element,
    oldContent: ElementContent<Msg>,
    newContent: ElementContent<Msg>,
  ): void => {
    patchAttributes(wiring)(
      node,
      oldContent.attributes,
      newContent.attributes,
    );
    patchChildren(wiring)(
      node,
      oldContent.children,
      newContent.children,
    );
  };

/**
 * Reconciles `newVnode` against `oldVnode` at one DOM slot. A node is reused
 * (the focus/selection/scroll-preserving path) only when its kind and — for
 * elements — its tag match, *and* the live DOM node still has that shape;
 * otherwise the whole node is swapped. The `instanceof` guards make the swap
 * the safe fallback if the DOM has drifted from the old vnode. The client
 * counterpart to the SSR fold — same tree, incremental target.
 */
export const reconcile =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    parent: Node,
    domNode: ChildNode,
    oldVnode: Html<Msg>,
    newVnode: Html<Msg>,
  ): void => {
    const replace = (): void => {
      parent.replaceChild(
        createNode(wiring)(newVnode),
        domNode,
      );
    };
    match(newVnode)(
      [
        text$(),
        ({ content }): void =>
          match(oldVnode)(
            [
              text$(),
              (): void => {
                // `CharacterData` (not `Text`) — `Text extends CharacterData`,
                // exposes the writable `.data`, and unlike `Text` is honoured by
                // happy-dom's `instanceof`
                if (
                  domNode instanceof CharacterData
                ) {
                  // reuse the text node — touch data only when it changed
                  if (
                    domNode.data !== content.value
                  ) {
                    domNode.data = content.value;
                  }
                } else {
                  replace();
                }
              },
            ],
            [element$(), (): void => replace()],
          ),
      ],
      [
        element$(),
        ({ content: newContent }): void =>
          match(oldVnode)(
            [
              element$(),
              ({ content: oldContent }): void => {
                if (
                  domNode instanceof Element &&
                  oldContent.tag ===
                    newContent.tag
                ) {
                  patchElement(wiring)(
                    domNode,
                    oldContent,
                    newContent,
                  );
                } else {
                  replace();
                }
              },
            ],
            [text$(), (): void => replace()],
          ),
      ],
    );
  };

/**
 * Index-based child reconcile: pair `new[i]` with the DOM node and old vnode at
 * `i`, append when the slot is new, then drop any surplus trailing nodes. (Keyed
 * matching — needed for correct reuse on list *reorders* — is a follow-up.)
 */
const patchChildren =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    parent: Node,
    oldChildren: ReadonlyArray<Html<Msg>>,
    newChildren: ReadonlyArray<Html<Msg>>,
  ): void => {
    newChildren.forEach((child, index) =>
      pipe(
        fromNullable(
          parent.childNodes.item(index),
        ),
        matchOption(
          () => {
            parent.appendChild(
              createNode(wiring)(child),
            );
          },
          (domNode: ChildNode) =>
            pipe(
              fromNullable(oldChildren[index]),
              matchOption(
                () => {
                  parent.appendChild(
                    createNode(wiring)(child),
                  );
                },
                (oldChild: Html<Msg>) =>
                  reconcile(wiring)(
                    parent,
                    domNode,
                    oldChild,
                    child,
                  ),
              ),
            ),
        ),
      ),
    );
    Array.from(parent.childNodes)
      .slice(newChildren.length)
      .forEach((surplus, offset) => {
        if (surplus instanceof Element) {
          pipe(
            chainOption(exitMotionOf)(
              fromNullable(
                oldChildren[
                  newChildren.length + offset
                ],
              ),
            ),
            matchOption(
              (): void => {
                surplus.remove();
              },
              (motion: Motion): void => {
                // confined DOM seam: hold the node until its exit motion
                // ends, then detach (`remove` tolerates concurrent churn).
                void wiring
                  .play(surplus, motion)
                  .then(() => {
                    surplus.remove();
                  });
              },
            ),
          );
        } else {
          surplus.remove();
        }
      });
  };

/**
 * Builds a stateful renderer for `container`: each call diffs the next
 * {@link Html} tree against the previously rendered one and patches the DOM in
 * place (full build only on first paint). Replaces the old replace-everything
 * renderer — re-renders are now O(changes), and a focused input keeps its
 * focus, caret, and IME state across a re-render.
 *
 * The remembered previous tree is the renderer's one mutable seam, mirroring the
 * live model owned by `sandbox`/`application`; the DOM itself is the other.
 */
export const makeRenderer = <Msg>(
  container: Element,
  dispatch: (msg: Msg) => void,
  play: Play = waapiPlay,
): ((next: Html<Msg>) => void) => {
  const wiring: Wiring<Msg> = {
    dispatch,
    registry: new WeakMap(),
    play,
  };
  // mutable seam: the last tree rendered into `container` (none until first paint)
  let previous: Option<Html<Msg>> = none();
  return (next: Html<Msg>): void => {
    pipe(
      previous,
      matchOption(
        () => {
          container.replaceChildren(
            createNode(wiring)(next),
          );
        },
        (old: Html<Msg>) =>
          pipe(
            fromNullable(container.firstChild),
            matchOption(
              () => {
                container.replaceChildren(
                  createNode(wiring)(next),
                );
              },
              (domNode: ChildNode) =>
                reconcile(wiring)(
                  container,
                  domNode,
                  old,
                  next,
                ),
            ),
          ),
      ),
    );
    previous = some(next);
  };
};
