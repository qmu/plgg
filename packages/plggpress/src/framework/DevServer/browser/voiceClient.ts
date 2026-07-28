// The DEV-ONLY browser edge of the voice assistant: the panel,
// the microphone, the WebRTC peer connection, and the
// `oai-events` data channel. Only bytes and pixels move here —
// every decision this loop makes lives in the pure
// `./voiceProtocol` beside it (decode, transcript fold) or on
// the server (instructions, grounding, the mint).
//
// COVERAGE-EXCLUDED, deliberately and by the same rule
// `plgg-poc3-voice/src/vendors/realtime.ts` records: this file
// can only run against a live browser, a real microphone, and
// the Realtime endpoint, so a unit test of it would be a test
// of mocks. It is still REAL TypeScript — `tsc --noEmit`
// checks it with the rest of the package, and the dev server
// serves it by type-stripping this very file.
//
// Import-free apart from its own relative sibling: a browser
// has no resolver for a bare `plgg` specifier, so the module
// route can serve both files as plain ES modules with no
// bundler in the loop.
import {
  type VoiceEvent,
  type VoiceLine,
  type FocusTarget,
  voiceEventOf,
  foldTranscript,
  patchBodyOf,
  toolOutputOf,
  sectionHeadingsOf,
  focusTargetOf,
  focusAnswerOf,
} from "./voiceProtocol";
import {
  type ArbiterState,
  type ArbiterAction,
  RELOAD_HOOK_NAME,
  arbiterInit,
  stepArbiter,
} from "./reloadArbiter";

const HEALTH_PATH = "/__plggpress_voice/health";
const SESSION_PATH = "/__plggpress_voice/session";
const PATCH_PATH = "/__plggpress_patch";
const SDP_URL =
  "https://api.openai.com/v1/realtime/calls?model=gpt-realtime";
const PANEL_ID = "plggpress-voice";
const PANEL_STYLE_ID = "plggpress-voice-style";

type Grant = Readonly<{
  value: string;
  instructions: string;
  doc: string;
  tools: unknown;
}>;

type Live = Readonly<{
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
  mic: MediaStream;
}>;

// The panel's three moving parts, captured once at boot.
type Panel = Readonly<{
  button: HTMLButtonElement;
  status: HTMLElement;
  log: HTMLElement;
}>;

// The session, the visible transcript, and the arbitration
// state are this module's only mutable slots — the runtime
// seams a page-embedded client cannot avoid.
let live: Live | null = null;
let lines: ReadonlyArray<VoiceLine> = [];
let arbiter: ArbiterState = arbiterInit;
// Which section the page was last moved to. Held as the same
// closed target the resolver returns — a swap replaces the
// body's children, so an element reference would go stale but
// an id the page re-emits does not.
let focused: FocusTarget = {
  kind: "FocusMissing",
};

// The panel is anchored to the TOP RIGHT, immediately left
// of the chrome rail — the assistant's dialog belongs to
// the same control group as GitHub and the light/dark
// toggle, not to a corner of its own. It sits OUTSIDE every
// `[data-pm-column]`, so opening a column never touches it.
const styleOf = (): string =>
  `#${PANEL_ID}{position:fixed;right:60px;top:12px;z-index:2147483000;` +
  `width:320px;max-height:60vh;display:flex;flex-direction:column;gap:8px;` +
  `padding:12px;border:1px solid currentColor;background:Canvas;color:CanvasText;` +
  `font:13px/1.5 ui-sans-serif,system-ui,sans-serif}` +
  `#${PANEL_ID} button{font:inherit;padding:6px 10px;border:1px solid currentColor;` +
  `background:transparent;color:inherit;cursor:pointer}` +
  `#${PANEL_ID} .plggpress-voice-status{opacity:.7}` +
  `#${PANEL_ID} .plggpress-voice-log{overflow-y:auto;display:flex;` +
  `flex-direction:column;gap:6px}` +
  `#${PANEL_ID} .plggpress-voice-log b{font-weight:600}`;

const mountPanel = (): Panel => {
  const style = document.createElement("style");
  style.id = PANEL_STYLE_ID;
  style.textContent = styleOf();
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = PANEL_ID;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Talk about this page";

  const status = document.createElement("div");
  status.className = "plggpress-voice-status";
  status.textContent = "ready";

  const log = document.createElement("div");
  log.className = "plggpress-voice-log";

  root.appendChild(button);
  root.appendChild(status);
  root.appendChild(log);
  document.body.appendChild(root);
  return { button, status, log };
};

const render = (panel: Panel): void => {
  panel.log.replaceChildren(
    ...lines.map((line: VoiceLine) => {
      const row = document.createElement("div");
      const who = document.createElement("b");
      who.textContent =
        line.who === "writer" ? "You: " : "AI: ";
      row.appendChild(who);
      row.appendChild(
        document.createTextNode(line.text),
      );
      return row;
    }),
  );
  panel.log.scrollTop = panel.log.scrollHeight;
};

const say = (
  panel: Panel,
  text: string,
): void => {
  panel.status.textContent = text;
};

const errorText = (cause: unknown): string =>
  cause instanceof Error
    ? cause.message
    : String(cause);

/** Is a key configured on this dev surface at all? */
const configured = (): Promise<boolean> =>
  fetch(HEALTH_PATH)
    .then((res: Response): Promise<unknown> =>
      res.ok ? res.json() : Promise.resolve({}),
    )
    .then(
      (body: unknown): boolean =>
        typeof body === "object" &&
        body !== null &&
        Reflect.get(body, "configured") === true,
    )
    .catch((): boolean => false);

/** Mint a grant for the route this page is on. */
const requestGrant = async (): Promise<Grant> => {
  const res = await fetch(SESSION_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      route: window.location.pathname,
    }),
  });
  const body: unknown = await res
    .json()
    .catch((): unknown => ({}));
  const read = (key: string): string => {
    const got: unknown =
      typeof body === "object" && body !== null
        ? Reflect.get(body, key)
        : undefined;
    return typeof got === "string" ? got : "";
  };
  if (!res.ok) {
    throw new Error(
      read("error") ||
        `the mint answered ${res.status}`,
    );
  }
  return {
    value: read("value"),
    instructions: read("instructions"),
    doc: read("doc"),
    tools:
      typeof body === "object" && body !== null
        ? Reflect.get(body, "tools")
        : [],
  };
};

// Hand a tool result back to the model and ask it to continue
// speaking — the second half of the Realtime tool-call loop.
const replyToTool = (
  callId: string,
  output: string,
): void => {
  if (live !== null) {
    live.channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      }),
    );
    live.channel.send(
      JSON.stringify({ type: "response.create" }),
    );
  }
};

/**
 * Run ONE `edit_doc` call: post it to the EXISTING live-edit
 * bridge and report the bridge's own answer back to the model.
 * The bridge — not this client — authorizes the path, applies
 * the span, writes atomically, and pushes the reload.
 */
const runEditTool = async (
  panel: Panel,
  doc: string,
  event: Readonly<{
    callId: string;
    find: string;
    replace: string;
  }>,
): Promise<void> => {
  say(panel, "editing…");
  try {
    const res = await fetch(PATCH_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        patchBodyOf(
          doc,
          event.find,
          event.replace,
        ),
      ),
    });
    const body: unknown = await res
      .json()
      .catch((): unknown => ({}));
    replyToTool(
      event.callId,
      toolOutputOf(res.ok, body),
    );
    say(
      panel,
      res.ok
        ? `edited ${doc}`
        : `the edit was refused — ${doc}`,
    );
  } catch (cause) {
    replyToTool(
      event.callId,
      toolOutputOf(false, {
        error: errorText(cause),
      }),
    );
    say(panel, errorText(cause));
  }
};

/**
 * Put one resolved section under the reader's eyes AND under
 * the keyboard: assistive technology follows focus, not
 * scroll, so a programmatic move that only scrolled would
 * leave a screen-reader user where they were. `preventScroll`
 * keeps the focus call from jumping instantly and cancelling
 * the smooth scroll that follows. The fragment is replaced,
 * not navigated to, so the focused section is addressable
 * without re-entering the page.
 */
const applyFocus = (id: string): void => {
  const target = document.getElementById(id);
  if (target !== null) {
    // A heading is not focusable by default; -1 makes it
    // programmatically focusable without adding it to the tab
    // order the writer moves through by hand.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    window.history.replaceState(
      null,
      "",
      `#${id}`,
    );
  }
};

/**
 * Move the page to the section the writer named, and answer
 * with what happened. The DECISION is the pure resolver's;
 * this only reads the body the page is showing and moves the
 * viewport and the keyboard.
 *
 * Exported so the focus path can be driven — and therefore
 * verified — from a real browser without a microphone and a
 * live model, exactly as {@link swapContent} is.
 */
export const focusSectionNow = (
  heading: string,
): FocusTarget => {
  const target = focusTargetOf(
    sectionHeadingsOf(document.body.innerHTML),
    heading,
  );
  if (target.kind === "FocusMatched") {
    focused = target;
    applyFocus(target.id);
  }
  return target;
};

/**
 * Run ONE `focus_section` call: move the page, tell the
 * writer, and hand the same outcome back to the model so an
 * unresolved heading becomes a question it can ask rather
 * than a silence.
 */
const runFocusTool = (
  panel: Panel,
  event: Readonly<{
    callId: string;
    heading: string;
  }>,
): void => {
  const answer = focusAnswerOf(
    event.heading,
    focusSectionNow(event.heading),
  );
  replyToTool(event.callId, answer.output);
  say(panel, answer.say);
};

const onFrame = (
  panel: Panel,
  doc: string,
  raw: unknown,
): void => {
  const event: VoiceEvent = voiceEventOf(raw);
  if (event.kind === "SessionErrored") {
    say(panel, event.reason);
    return;
  }
  if (event.kind === "EditRequested") {
    void runEditTool(panel, doc, event);
    return;
  }
  if (event.kind === "FocusRequested") {
    runFocusTool(panel, event);
    return;
  }
  lines = foldTranscript(lines, event);
  render(panel);
};

/** Open the WebRTC session from a short-lived grant. */
const open = async (
  panel: Panel,
  grant: Grant,
): Promise<void> => {
  const pc = new RTCPeerConnection();
  const audio = document.createElement("audio");
  audio.autoplay = true;
  pc.ontrack = (event: RTCTrackEvent): void => {
    const stream = event.streams[0];
    if (stream !== undefined) {
      audio.srcObject = stream;
    }
  };
  const mic =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  for (const track of mic.getTracks()) {
    pc.addTrack(track, mic);
  }
  const channel =
    pc.createDataChannel("oai-events");
  channel.onopen = (): void => {
    // The GA `session.update` shape, probed live
    // 2026-07-12: `session.type` is REQUIRED and
    // transcription nests under `audio.input`.
    channel.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: grant.instructions,
          tools: grant.tools,
          audio: {
            input: {
              transcription: {
                model: "whisper-1",
              },
            },
          },
        },
      }),
    );
  };
  channel.onmessage = (
    event: MessageEvent,
  ): void => {
    // Boundary parse: a non-JSON frame is dropped, never a
    // throw into the page.
    try {
      onFrame(
        panel,
        grant.doc,
        JSON.parse(String(event.data)),
      );
    } catch {
      /* a frame that is not JSON tells this page nothing */
    }
  };
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const res = await fetch(SDP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grant.value}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp ?? "",
  });
  if (!res.ok) {
    for (const track of mic.getTracks()) {
      track.stop();
    }
    pc.close();
    throw new Error(
      `the realtime SDP exchange failed (${res.status})`,
    );
  }
  await pc.setRemoteDescription({
    type: "answer",
    sdp: await res.text(),
  });
  live = { pc, channel, mic };
};

const stop = (panel: Panel): void => {
  if (live !== null) {
    for (const track of live.mic.getTracks()) {
      track.stop();
    }
    live.pc.close();
    live = null;
  }
  armArbiter(panel, false);
  panel.button.textContent =
    "Talk about this page";
  say(panel, "ready");
};

const start = async (
  panel: Panel,
): Promise<void> => {
  say(panel, "connecting…");
  panel.button.disabled = true;
  try {
    const grant = await requestGrant();
    await open(panel, grant);
    armArbiter(panel, true);
    panel.button.textContent = "Stop";
    say(
      panel,
      grant.doc === ""
        ? "listening — no document on this route"
        : `listening — ${grant.doc}`,
    );
  } catch (cause) {
    stop(panel);
    say(panel, errorText(cause));
  } finally {
    panel.button.disabled = false;
  }
};

/* ------------------------------------------------ *
 * Hot-reload arbitration                             *
 * ------------------------------------------------ */

/**
 * Re-fetch THIS url and put its content in place, leaving the
 * page's JS context — and therefore the realtime session —
 * alive. Everything in `<body>` is replaced except the voice
 * panel, which lives outside the swapped region by
 * construction. Scripts parsed by DOMParser never execute, so
 * the reload client and this module are not re-run.
 *
 * Exported so the swap can be driven — and therefore verified —
 * from a real browser without a microphone and a live model.
 */
export const swapContent =
  async (): Promise<void> => {
    const res = await fetch(
      window.location.href,
      {
        cache: "no-store",
      },
    );
    const fresh = new DOMParser().parseFromString(
      await res.text(),
      "text/html",
    );
    const panel =
      document.getElementById(PANEL_ID);
    for (const child of [
      ...document.body.children,
    ]) {
      if (child !== panel) {
        child.remove();
      }
    }
    for (const child of [
      ...fresh.body.children,
    ]) {
      if (child.id !== PANEL_ID) {
        document.body.insertBefore(child, panel);
      }
    }
    // The theme inlines its collected atomic CSS in <head>, so a
    // content change can bring new rules with it. The panel's own
    // <style> carries an id and is skipped, so the panel keeps
    // looking like itself across a swap.
    for (const style of [
      ...document.head.querySelectorAll("style"),
    ]) {
      if (style.id !== PANEL_STYLE_ID) {
        style.remove();
      }
    }
    for (const style of [
      ...fresh.head.querySelectorAll("style"),
    ]) {
      document.head.appendChild(style);
    }
    document.title = fresh.title;
    // The swapped-in heading is a NEW element, so the focus
    // and the scroll the assistant put on the old one went
    // with it. Re-apply them to the section the page is still
    // meant to be showing.
    if (focused.kind === "FocusMatched") {
      applyFocus(focused.id);
    }
  };

const runArbiter = (panel: Panel): void => {
  const stepped = stepArbiter(
    arbiter,
    "ReloadFrame",
  );
  arbiter = stepped[0];
  void act(panel, stepped[1]);
};

const act = async (
  panel: Panel,
  action: ArbiterAction,
): Promise<void> => {
  if (action === "reload") {
    window.location.reload();
    return;
  }
  if (action === "swap") {
    try {
      await swapContent();
    } catch (cause) {
      say(panel, errorText(cause));
    }
    const done = stepArbiter(arbiter, "SwapDone");
    arbiter = done[0];
    await act(panel, done[1]);
  }
};

// Tell the arbiter a session opened or closed, and install or
// remove the reload hook the injected client consults.
const armArbiter = (
  panel: Panel,
  opened: boolean,
): void => {
  const stepped = stepArbiter(
    arbiter,
    opened ? "SessionOpened" : "SessionClosed",
  );
  arbiter = stepped[0];
  Reflect.set(
    window,
    RELOAD_HOOK_NAME,
    opened ? (): void => runArbiter(panel) : null,
  );
};

/**
 * Boot the panel — but ONLY when this dev surface actually
 * holds a key. A keyless run draws nothing at all, so the
 * writer is never offered an affordance that could only fail.
 */
export const bootVoiceClient =
  async (): Promise<void> => {
    if (
      document.getElementById(PANEL_ID) !== null
    ) {
      return;
    }
    if (!(await configured())) {
      return;
    }
    const panel = mountPanel();
    panel.button.addEventListener(
      "click",
      (): void => {
        if (live === null) {
          void start(panel);
        } else {
          stop(panel);
        }
      },
    );
  };

void bootVoiceClient();
