import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isSome, isNone, ok, err } from "plgg";
import {
  initVoice,
  voiceUpdate,
  startSession,
  connected,
  userQuery,
  answerReady,
  stop,
} from "plggpress/agent/voiceAgent";
import {
  type VoiceIo,
  interpretVoiceCmd,
} from "plggpress/agent/voiceIo";

const okIo: VoiceIo = {
  connect: async () => ok(null),
  search: async (q) => `answer for ${q}`,
  speak: async () => null,
  disconnect: async () => null,
};
const failIo: VoiceIo = {
  connect: async () => err("mint 404"),
  search: async () => "",
  speak: async () => null,
  disconnect: async () => null,
};

// Real, correctly-typed VoiceCmds straight from the reducer.
const connecting = voiceUpdate(
  startSession,
  initVoice,
);
const connectCmd = connecting[1];
const listening = voiceUpdate(
  connected,
  connecting[0],
)[0];
const searching = voiceUpdate(
  userQuery("how to deploy"),
  listening,
);
const searchCmd = searching[1];
const answering = voiceUpdate(
  answerReady("the answer"),
  searching[0],
);
const speakCmd = answering[1];
const disconnectCmd = voiceUpdate(
  stop,
  listening,
)[1];
const connectedCmd = voiceUpdate(
  connected,
  connecting[0],
)[1];

test("Connect maps to Connected on success and Failed on error", async () => {
  const okMsg = await interpretVoiceCmd(okIo)(
    connectCmd,
  );
  const failMsg = await interpretVoiceCmd(
    failIo,
  )(connectCmd);
  return all([
    check(
      isSome(okMsg) &&
        okMsg.content.__tag === "Connected",
      toBe(true),
    ),
    check(
      isSome(failMsg) &&
        failMsg.content.__tag === "Failed",
      toBe(true),
    ),
  ]);
});

test("Search maps to AnswerReady carrying the answer text", async () => {
  const msg = await interpretVoiceCmd(okIo)(
    searchCmd,
  );
  return all([
    check(
      isSome(msg) &&
        msg.content.__tag === "AnswerReady",
      toBe(true),
    ),
    check(
      isSome(msg) &&
        msg.content.__tag === "AnswerReady" &&
        msg.content.content.includes(
          "how to deploy",
        ),
      toBe(true),
    ),
  ]);
});

test("Speak maps to Spoke; Disconnect and NoCmd produce no message", async () => {
  const speakMsg = await interpretVoiceCmd(
    okIo,
  )(speakCmd);
  const discMsg = await interpretVoiceCmd(okIo)(
    disconnectCmd,
  );
  const noopMsg = await interpretVoiceCmd(okIo)(
    connectedCmd,
  );
  return all([
    check(
      isSome(speakMsg) &&
        speakMsg.content.__tag === "Spoke",
      toBe(true),
    ),
    check(isNone(discMsg), toBe(true)),
    check(isNone(noopMsg), toBe(true)),
  ]);
});
