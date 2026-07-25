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
  voiceEventOf,
  foldTranscript,
} from "./voiceProtocol";

const HEALTH_PATH = "/__plggpress_voice/health";
const SESSION_PATH = "/__plggpress_voice/session";
const SDP_URL =
  "https://api.openai.com/v1/realtime/calls?model=gpt-realtime";
const PANEL_ID = "plggpress-voice";

type Grant = Readonly<{
  value: string;
  instructions: string;
  doc: string;
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

// The session and the visible transcript are this module's
// only mutable state — the runtime seams a page-embedded
// client cannot avoid.
let live: Live | null = null;
let lines: ReadonlyArray<VoiceLine> = [];

const styleOf = (): string =>
  `#${PANEL_ID}{position:fixed;right:16px;bottom:16px;z-index:2147483000;` +
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
  };
};

const onFrame = (
  panel: Panel,
  raw: unknown,
): void => {
  const event: VoiceEvent = voiceEventOf(raw);
  if (event.kind === "SessionErrored") {
    say(panel, event.reason);
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
