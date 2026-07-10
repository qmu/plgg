import { getOr } from "plgg";
import {
  type Html,
  div,
  p,
  button,
  text,
  onClick,
  renderToString,
} from "plgg-view";
import { matchVoiceState } from "plgg-cms/agent/VoiceState";
import {
  type VoiceModel,
  type VoiceMsg,
  startSession,
  stop,
} from "plgg-cms/agent/voiceAgent";

/** A human status line for each lifecycle state. */
const statusLabel = matchVoiceState<string>(
  () => "Idle",
  () => "Connecting…",
  () =>
    "Listening — speak your question",
  () => "Searching the knowledge base…",
  () => "Answering…",
  () => "Something went wrong",
);

/**
 * The voice agent's VIEW — the visible half of the TEA program
 * (ticket 25), a pure `VoiceModel → Html<VoiceMsg>`. Idle shows
 * a Start button (→ `startSession`); a live session shows Stop
 * (→ `stop`); the transcript renders as paragraphs; the error
 * screen surfaces `lastError`. Pure + server-renderable
 * (`renderToString`) — the browser IO seam only drives the
 * model via the reducer; nothing browser-specific lives here.
 */
export const voiceView = (
  model: VoiceModel,
): Html<VoiceMsg> =>
  div(
    [],
    [
      p(
        [],
        [
          text(
            `Status: ${statusLabel(model.state)}`,
          ),
        ],
      ),
      model.state === "idle"
        ? button(
            [onClick(startSession)],
            [text("Start voice session")],
          )
        : button(
            [onClick(stop)],
            [text("Stop")],
          ),
      div(
        [],
        model.transcript.map((t) =>
          p([], [text(t)]),
        ),
      ),
      ...(model.state === "error"
        ? [
            p(
              [],
              [
                text(
                  getOr("unknown error")(
                    model.lastError,
                  ),
                ),
              ],
            ),
          ]
        : []),
    ],
  );

/** Server-render the voice widget to an HTML string. */
export const renderVoice = (
  model: VoiceModel,
): string => renderToString(voiceView(model));
