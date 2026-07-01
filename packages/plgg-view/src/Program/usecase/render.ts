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
  css$,
  key$,
  easeOut,
  easeInOut,
} from "plgg-view/Html/model/Attribute";
import {
  isSafeAttrName,
  safeAttrValue,
} from "plgg-view/Html/usecase/escape";

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
  // a keyed node remembers its `key` here (off the node, no expando/cast) so the
  // keyed child reconcile can match a live DOM node to its vnode across renders.
  keyed: WeakMap<Element, SoftStr>;
  // nodes mid-exit: held in the DOM until their exit motion ends. The keyed
  // reconcile skips them when matching so a node leaving is never mistaken for a
  // survivor (and a re-add lands on a fresh node, not the one fading away).
  exiting: WeakSet<Element>;
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
    // same URL-scheme guard as SSR (one shared `safeAttrValue`) so a
    // `javascript:` href/src can't execute after the client takes over
    const safe = safeAttrValue(name, value);
    node.setAttribute(name, safe);
    syncSetProperty(node, name, safe);
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
      // a css() directive contributes the element's `class` (atomic names).
      [
        css$(),
        ({ content }): void =>
          setStaticAttr(
            node,
            "class",
            content.classes,
          ),
      ],
      // a key() is identity metadata, not a DOM attribute: recorded on the node
      // (createNode) and read by the keyed reconcile, never written to the DOM.
      [key$(), (): void => undefined],
    );

/**
 * Folds two {@link Option}s "last-some-wins": a later `none` preserves an earlier
 * `some`. Lets {@link enterOf}/{@link exitOf} collect the enter/exit motion from
 * *any* `Anim` directive in the list — so an element carrying both `fadeIn`
 * (enter-only) and `fadeOut` (exit-only) keeps each channel, instead of a later
 * directive's absent channel clobbering an earlier directive's present one.
 */
const keepSome = <T>(
  previous: Option<T>,
  next: Option<T>,
): Option<T> =>
  matchOption(
    (): Option<T> => previous,
    (value: T): Option<T> => some(value),
  )(next);

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
            keepSome(acc, content.enter),
        ],
        [css$(), (): Option<Motion> => acc],
        [key$(), (): Option<Motion> => acc],
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
            keepSome(acc, content.exit),
        ],
        [css$(), (): Option<Motion> => acc],
        [key$(), (): Option<Motion> => acc],
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

/** The {@link key} carried by an attribute list, if any. */
const keyOf = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
): Option<SoftStr> =>
  attributes.reduce<Option<SoftStr>>(
    (acc, attribute) =>
      match(attribute)(
        [attr$(), (): Option<SoftStr> => acc],
        [handler$(), (): Option<SoftStr> => acc],
        [anim$(), (): Option<SoftStr> => acc],
        [css$(), (): Option<SoftStr> => acc],
        [
          key$(),
          ({ content }): Option<SoftStr> =>
            some(content.value),
        ],
      ),
    none(),
  );

/** The {@link key} of a vnode — `none` for a text leaf or an unkeyed element. */
const keyOfVnode = <Msg>(
  vnode: Html<Msg>,
): Option<SoftStr> =>
  match(vnode)(
    [text$(), (): Option<SoftStr> => none()],
    [
      element$(),
      ({ content }): Option<SoftStr> =>
        keyOf(content.attributes),
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

/**
 * A {@link Motion}'s timing as WAAPI options (end state retained). With a delay,
 * `fill: "both"` holds the `from` frame through the wait (a held survivor), then
 * settles on the end state; with no delay, plain `forwards`.
 */
const optsOf = (
  motion: Motion,
): KeyframeAnimationOptions =>
  motion.delayMs !== undefined && motion.delayMs > 0
    ? {
        duration: motion.durationMs,
        easing: motion.easing,
        delay: motion.delayMs,
        fill: "both",
      }
    : {
        duration: motion.durationMs,
        easing: motion.easing,
        fill: "forwards",
      };

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
          // remember the node's key (if any) for the keyed child reconcile
          pipe(
            keyOf(content.attributes),
            matchOption(
              (): void => undefined,
              (k: SoftStr): void => {
                wiring.keyed.set(el, k);
              },
            ),
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
        [
          css$(),
          ({ content }): Map<SoftStr, SoftStr> =>
            acc.set("class", content.classes),
        ],
        [
          key$(),
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
        [
          css$(),
          (): Map<
            SoftStr,
            (payload: SoftStr) => Msg
          > => acc,
        ],
        [
          key$(),
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
                // `CharacterData` (not `Text`) — `Text extends CharacterData`
                // and exposes the writable `.data`; the test DOM brands text
                // nodes as `CharacterData`, so this is the reliable guard
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
 * `i`, append when the slot is new, then drop any surplus trailing nodes. The
 * fallback path for unkeyed children (a static-shape list — a toolbar, a form);
 * a list whose every child carries a {@link key} takes {@link keyedPatchChildren}
 * instead, which reuses by identity (correct under reorder/insert/delete).
 */
const indexPatchChildren =
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

/** How long a FLIP move glides; eased to match the enter/exit curves. */
const FLIP_DURATION_MS = 200;

/**
 * The FLIP {@link Motion} for a node that moved `(dx, dy)` from its old box: it
 * starts at the inverse offset and tweens to identity, so the node *appears* to
 * glide from where it was to where it now is. Touches transform only (opacity
 * left to any enter/exit), so it composites on the GPU like the rest.
 */
const flipMotion = (
  dx: number,
  dy: number,
  delayMs: number,
): Motion => ({
  from: {
    opacity: none(),
    transform: some(
      `translate(${dx}px, ${dy}px)`,
    ),
  },
  to: {
    opacity: none(),
    transform: some("translate(0px, 0px)"),
  },
  durationMs: FLIP_DURATION_MS,
  easing: easeInOut,
  // when a row is leaving, hold survivors at their old box until it has faded,
  // then slide — so they never glide over the still-visible deleted row.
  delayMs,
});

/**
 * Lifts an exiting node *out of flow* so its in-flow followers immediately take
 * its space — which the survivor FLIP then animates into, so the row fades in
 * place (no squish) while the others slide up. Pinned with `box-sizing:
 * border-box` at its current offset box, so `width`/`height` set to the
 * border-box `offset*` values keep it visually put with no padding jump (the
 * defect that sank the earlier out-of-flow attempt). The parent is made a
 * positioning context if it is `static`. Narrowed to `HTMLElement` — never cast.
 */
const takeOutOfFlow = (node: Element): void => {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const parent = node.parentElement;
  if (
    parent instanceof HTMLElement &&
    window.getComputedStyle(parent).position ===
      "static"
  ) {
    parent.style.position = "relative";
  }
  const top = node.offsetTop;
  const left = node.offsetLeft;
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  node.style.boxSizing = "border-box";
  node.style.position = "absolute";
  node.style.margin = "0";
  node.style.top = `${top}px`;
  node.style.left = `${left}px`;
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
  node.style.pointerEvents = "none";
};

/**
 * Animates a parent's height from `fromH` to its current (post-removal) height,
 * so the container's bottom edge closes smoothly instead of snapping when a row
 * leaves the flow (incl. deleting the last row). No `fill`, so height reverts to
 * `auto` once done — and the natural height already equals the target, so there
 * is no end jump. `overflow: hidden` is restored after. A confined DOM seam:
 * feature-detects WAAPI and honours reduced-motion.
 */
const animateParentHeight = (
  parent: Node,
  fromH: number,
  durationMs: number,
  delayMs: number,
): void => {
  if (
    parent instanceof HTMLElement &&
    typeof parent.animate === "function" &&
    !prefersReducedMotion()
  ) {
    const toH =
      parent.getBoundingClientRect().height;
    if (toH === fromH) {
      return;
    }
    const prevOverflow = parent.style.overflow;
    parent.style.overflow = "hidden";
    const restore = (): void => {
      parent.style.overflow = prevOverflow;
    };
    void parent
      .animate(
        [
          { height: `${fromH}px` },
          { height: `${toH}px` },
        ],
        {
          duration: durationMs,
          delay: delayMs,
          // hold the old height during the fade, then ease shut
          easing: easeOut,
          fill: "both",
        },
      )
      .finished.then(restore, restore);
  }
};

/**
 * Removes a keyed node the new tree dropped, returning the exit's duration (0
 * when none) so the caller can size the container's height close. With no exit
 * motion it detaches at once; with one it is marked exiting, lifted out of flow
 * ({@link takeOutOfFlow}) so its in-flow followers immediately close up — which
 * the survivor FLIP animates as a slide — while its declared opacity/transform
 * exit fades it in place through the {@link Play} seam. Detaches when the exit
 * finishes; removal is gated on the injectable `Play` (testable).
 */
const playKeyedExit = <Msg>(
  wiring: Wiring<Msg>,
  node: Element,
  motionOpt: Option<Motion>,
): number =>
  matchOption(
    (): number => {
      node.remove();
      return 0;
    },
    (motion: Motion): number => {
      wiring.exiting.add(node);
      // confined DOM seam: out of flow so survivors take the space (and FLIP
      // into it), then fade in place via the seam; detach when the fade ends
      takeOutOfFlow(node);
      void wiring.play(node, motion).then(() => {
        node.remove();
      });
      return motion.durationMs;
    },
  )(motionOpt);

/**
 * Patches a reused keyed node in place and returns the resulting node: same node
 * when its kind/tag still match (the focus-preserving reuse), a freshly built
 * replacement otherwise. The {@link reconcile} counterpart that *returns* the
 * node, so {@link keyedPatchChildren} can then position it.
 */
const patchKeyed =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    parent: Node,
    node: Element,
    oldVnode: Html<Msg>,
    newVnode: Html<Msg>,
  ): Node => {
    const replace = (): Node => {
      const fresh = createNode(wiring)(newVnode);
      parent.replaceChild(fresh, node);
      return fresh;
    };
    return match(newVnode)(
      [text$(), (): Node => replace()],
      [
        element$(),
        ({ content: newContent }): Node =>
          match(oldVnode)(
            [text$(), (): Node => replace()],
            [
              element$(),
              ({ content: oldContent }): Node => {
                if (
                  oldContent.tag ===
                  newContent.tag
                ) {
                  patchElement(wiring)(
                    node,
                    oldContent,
                    newContent,
                  );
                  return node;
                }
                return replace();
              },
            ],
          ),
      ],
    );
  };

/**
 * Keyed child reconcile — the smooth path. Matches each new child to its old
 * self by {@link key} (not by index): the genuinely new ones are created (enter
 * motion fires), the genuinely gone ones fade + collapse and detach
 * ({@link playKeyedExit}), and survivors that change position in the *synchronous*
 * reorder FLIP from their old box to the new one. Deleting a middle item fades
 * and collapses *that* row while the rest slide up by natural layout reflow (the
 * collapse), and a reorder glides the moved rows (FLIP) — the fix for the index
 * path's "wrong element fades, the rest snap".
 */
const keyedPatchChildren =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    parent: Node,
    oldChildren: ReadonlyArray<Html<Msg>>,
    newChildren: ReadonlyArray<Html<Msg>>,
  ): void => {
    // old vnode by key (to diff a reused node against), live DOM node by key
    // (skipping nodes mid-exit), and the set of keys the new tree keeps.
    const oldByKey = new Map<
      SoftStr,
      Html<Msg>
    >();
    oldChildren.forEach((child) =>
      matchOption(
        (): void => undefined,
        (k: SoftStr): void => {
          oldByKey.set(k, child);
        },
      )(keyOfVnode(child)),
    );
    const domByKey = new Map<SoftStr, Element>();
    Array.from(parent.childNodes).forEach(
      (domChild) => {
        if (
          domChild instanceof Element &&
          !wiring.exiting.has(domChild)
        ) {
          matchOption(
            (): void => undefined,
            (k: SoftStr): void => {
              domByKey.set(k, domChild);
            },
          )(
            fromNullable(
              wiring.keyed.get(domChild),
            ),
          );
        }
      },
    );
    const newKeys = new Set<SoftStr>();
    newChildren.forEach((child) =>
      matchOption(
        (): void => undefined,
        (k: SoftStr): void => {
          newKeys.add(k);
        },
      )(keyOfVnode(child)),
    );

    // FLIP step 1: snapshot every survivor's box before any mutation.
    const firstRects = new Map<
      Element,
      DOMRect
    >();
    domByKey.forEach((node, k) => {
      if (newKeys.has(k)) {
        firstRects.set(
          node,
          node.getBoundingClientRect(),
        );
      }
    });
    // the parent's height before any exit, to close it down smoothly after.
    const firstParentHeight =
      parent instanceof HTMLElement
        ? parent.getBoundingClientRect().height
        : 0;

    // exits first (out of flow), so the layout has already closed when the
    // survivors are measured below — they then FLIP from old box to new (slide).
    let exitDuration = 0;
    domByKey.forEach((node, k) => {
      if (!newKeys.has(k)) {
        exitDuration = Math.max(
          exitDuration,
          playKeyedExit(
            wiring,
            node,
            chainOption(exitMotionOf)(
              fromNullable(oldByKey.get(k)),
            ),
          ),
        );
      }
    });

    // reuse-or-create each new child's node, in new order.
    const finalNodes: ReadonlyArray<Node> =
      newChildren.map((child) =>
        matchOption(
          (): Node => createNode(wiring)(child),
          (k: SoftStr): Node =>
            matchOption(
              (): Node =>
                createNode(wiring)(child),
              (node: Element): Node =>
                matchOption(
                  (): Node =>
                    createNode(wiring)(child),
                  (oldVnode: Html<Msg>): Node =>
                    patchKeyed(wiring)(
                      parent,
                      node,
                      oldVnode,
                      child,
                    ),
                )(fromNullable(oldByKey.get(k))),
            )(fromNullable(domByKey.get(k))),
        )(keyOfVnode(child)),
      );

    // position the survivors/new nodes in order, leaving exiting nodes WHERE
    // THEY ARE: they collapse in flow, so displacing them (the old walk made
    // survivors leapfrog over them, teleporting the dying row to the bottom)
    // would break the very motion the collapse provides. The anchor walk skips
    // mid-exit siblings instead of inserting in front of them.
    const pastExiting = (
      from: Node | null,
    ): Node | null => {
      let cursor = from;
      while (
        cursor instanceof Element &&
        wiring.exiting.has(cursor)
      ) {
        cursor = cursor.nextSibling;
      }
      return cursor;
    };
    let anchor: Node | null = pastExiting(
      parent.firstChild,
    );
    finalNodes.forEach((node) => {
      if (anchor !== null && node === anchor) {
        anchor = pastExiting(anchor.nextSibling);
      } else {
        parent.insertBefore(node, anchor);
      }
    });

    // FLIP step 2: glide each survivor from its old box to its new one. When a
    // row is leaving, the slide is delayed by its fade so survivors hold their
    // old spots first, then slide into the cleared space (never over the row).
    firstRects.forEach((first, node) => {
      const last = node.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx !== 0 || dy !== 0) {
        void wiring.play(
          node,
          flipMotion(dx, dy, exitDuration),
        );
      }
    });

    // close the container's height to its new (smaller) layout — also after the
    // fade — so the bottom edge holds, then eases shut as the survivors slide,
    // instead of snapping when the exiting row(s) left the flow.
    if (exitDuration > 0) {
      animateParentHeight(
        parent,
        firstParentHeight,
        FLIP_DURATION_MS,
        exitDuration,
      );
    }
  };

/** Whether a children list is non-empty and keyed throughout. */
const allKeyed = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): boolean =>
  children.length > 0 &&
  children.every((child) =>
    matchOption(
      (): boolean => false,
      (): boolean => true,
    )(keyOfVnode(child)),
  );

/**
 * Reconciles a parent's children: the {@link keyedPatchChildren} identity path
 * when every new child carries a {@link key} — or when a fully-keyed list
 * *empties*, so the last row still exits through the keyed fade + collapse
 * rather than the index path's bare surplus removal (which would snap its
 * footprint away on detach). Else the {@link indexPatchChildren} positional
 * fallback. Keying is thus opt-in per list — exactly the lists that
 * reorder/insert/delete (and want smooth motion) ask for it.
 */
const patchChildren =
  <Msg>(wiring: Wiring<Msg>) =>
  (
    parent: Node,
    oldChildren: ReadonlyArray<Html<Msg>>,
    newChildren: ReadonlyArray<Html<Msg>>,
  ): void =>
    allKeyed(newChildren) ||
    (newChildren.length === 0 &&
      allKeyed(oldChildren))
      ? keyedPatchChildren(wiring)(
          parent,
          oldChildren,
          newChildren,
        )
      : indexPatchChildren(wiring)(
          parent,
          oldChildren,
          newChildren,
        );

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
    keyed: new WeakMap(),
    exiting: new WeakSet(),
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
