import {
  pipe,
  none,
  some,
  isSome,
  isNone,
  type Option,
} from "plgg";
import {
  type JoiningPolicy,
  mayOpenColumn,
} from "plggmatic/Joining/model/policy";
import {
  embeddedAttr,
  frameClass,
} from "plggmatic/Navigate/model/marker";

import {
  message,
  isJoiningMessage,
  matchesConnection,
  mayAnswer,
} from "plggmatic/Joining/model/handshake";
export type JoiningAdapter = Readonly<{
  // Mount the supplied frame within root. The cleanup owns its column.
  mount?: (
    href: string,
    frame: HTMLIFrameElement,
  ) => () => void;
}>;

const attachChild = (
  win: Window,
  policy: JoiningPolicy,
) => {
  // The current document can answer exactly one challenge.
  win.document.documentElement.hidden = true;
  let challenge: Option<{
    origin: string;
    nonce: string;
    path: string;
  }> = none();
  const receive = (
    event: MessageEvent<unknown>,
  ) => {
    const data = event.data;
    const loc = win.location;
    if (
      !isJoiningMessage(data) ||
      win.top !== win.parent ||
      event.source !== win.parent ||
      !pipe(
        policy,
        mayAnswer(
          event.origin,
          loc.href,
          data.path,
        ),
      )
    )
      return;
    if (
      data.kind === "hello" &&
      isNone(challenge)
    ) {
      challenge = some({
        origin: event.origin,
        nonce: data.nonce,
        path: data.path,
      });
      win.parent.postMessage(
        message("ready", data.nonce, data.path),
        event.origin,
      );
    } else if (
      isSome(challenge) &&
      event.origin === challenge.content.origin &&
      pipe(
        data,
        matchesConnection(
          "accept",
          challenge.content.nonce,
          challenge.content.path,
        ),
      )
    ) {
      win.document.documentElement.hidden = false;
      win.document.documentElement.setAttribute(
        embeddedAttr,
        "",
      );
    }
  };
  win.addEventListener("message", receive);
  return () => {
    win.removeEventListener("message", receive);
    win.document.documentElement.hidden = true;
    win.document.documentElement.removeAttribute(
      embeddedAttr,
    );
  };
};

export const attachJoining = (
  root: HTMLElement,
  policy: JoiningPolicy,
  adapter: JoiningAdapter,
): (() => void) => {
  const win = root.ownerDocument.defaultView;
  if (
    !win ||
    win.location.origin !== policy.origin
  )
    return () => {};
  if (win !== win.top)
    return attachChild(win, policy);
  const parentAllowed = () =>
    policy.parentRoutes.includes(
      win.location.pathname,
    );
  // Bind listeners to the frame's lifetime, independently of re-rendered links.
  const connections = new Map<
    string,
    {
      frame: HTMLIFrameElement;
      close: () => void;
    }
  >();
  const click = (e: MouseEvent) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      !parentAllowed() ||
      !adapter.mount ||
      !(e.target instanceof Element)
    )
      return;
    const a = e.target.closest("a[href]");
    if (
      !(a instanceof HTMLAnchorElement) ||
      !root.contains(a) ||
      a.hasAttribute("download") ||
      (a.target && a.target !== "_self") ||
      a.getAttribute("href") !==
        a.origin + a.pathname ||
      !pipe(
        policy,
        mayOpenColumn(a.origin, a.pathname),
      ) ||
      !policy.partners.some(
        (p) =>
          p.origin === a.origin &&
          p.trust === "public",
      )
    )
      return;
    const { origin, pathname, href } = a;
    e.preventDefault();
    const prior = connections.get(href);
    if (prior && root.contains(prior.frame))
      return;
    prior?.close();
    const frame =
      root.ownerDocument.createElement("iframe");
    frame.className = frameClass;
    frame.hidden = true;
    frame.title = href;
    frame.sandbox.add(
      "allow-scripts",
      "allow-same-origin",
    );
    frame.referrerPolicy =
      "strict-origin-when-cross-origin";
    // A load invalidates the preceding document before starting another handshake.
    let challenge: Option<string> = none();
    const load = () => {
      frame.hidden = true;
      const nonce = crypto.randomUUID();
      challenge = some(nonce);
      frame.contentWindow?.postMessage(
        message("hello", nonce, pathname),
        origin,
      );
    };
    const receive = (
      event: MessageEvent<unknown>,
    ) => {
      const data = event.data;
      if (
        !parentAllowed() ||
        !root.contains(frame) ||
        event.origin !== origin ||
        !event.source ||
        event.source !== frame.contentWindow ||
        !isSome(challenge) ||
        !pipe(
          data,
          matchesConnection(
            "ready",
            challenge.content,
            pathname,
          ),
        )
      )
        return;
      frame.contentWindow?.postMessage(
        message(
          "accept",
          challenge.content,
          pathname,
        ),
        origin,
      );
      frame.hidden = false;
    };
    frame.addEventListener("load", load);
    win.addEventListener("message", receive);
    frame.src = href + "?pm-embed=1";
    const unmount = adapter.mount(href, frame);
    connections.set(href, {
      frame,
      close: () => {
        frame.removeEventListener("load", load);
        win.removeEventListener(
          "message",
          receive,
        );
        connections.delete(href);
        unmount();
      },
    });
  };
  const observer = new MutationObserver(() => {
    for (const c of connections.values())
      if (!root.contains(c.frame)) c.close();
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
  });
  root.addEventListener("click", click);
  return () => {
    observer.disconnect();
    root.removeEventListener("click", click);
    for (const c of connections.values())
      c.close();
  };
};
