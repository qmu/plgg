import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isSome } from "plgg";
import {
  type VoiceModel,
  initVoice,
  voiceUpdate,
  startSession,
  connected,
  userQuery,
  answerReady,
  spoke,
  failed,
  stop,
} from "plgg-cms/agent/voiceAgent";

test("the model starts idle and empty", () =>
  all([
    check(initVoice.state, toBe("idle")),
    check(initVoice.transcript.length, toBe(0)),
  ]));

test("a full turn drives connect → listen → search → answer → listen", () => {
  const [m1, c1] = voiceUpdate(
    startSession,
    initVoice,
  );
  const [m2] = voiceUpdate(connected, m1);
  const [m3, c3] = voiceUpdate(
    userQuery("how do I deploy"),
    m2,
  );
  const [m4, c4] = voiceUpdate(
    answerReady("run the deploy script"),
    m3,
  );
  const [m5] = voiceUpdate(spoke, m4);
  return all([
    check(m1.state, toBe("connecting")),
    check(c1.__tag, toBe("Connect")),
    check(m2.state, toBe("listening")),
    check(m3.state, toBe("searching")),
    check(c3.__tag, toBe("Search")),
    check(
      c3.__tag === "Search"
        ? c3.content
        : "",
      toBe("how do I deploy"),
    ),
    check(m4.state, toBe("answering")),
    check(c4.__tag, toBe("Speak")),
    check(m5.state, toBe("listening")),
    check(m4.transcript.length, toBe(2)),
  ]);
});

test("Failed moves to error and records the reason", () => {
  const [m1] = voiceUpdate(startSession, initVoice);
  const [m2] = voiceUpdate(
    failed("mint 404"),
    m1,
  );
  return all([
    check(m2.state, toBe("error")),
    check(isSome(m2.lastError), toBe(true)),
  ]);
});

test("Stop disconnects any live session to idle", () => {
  const [m1] = voiceUpdate(startSession, initVoice);
  const [m2] = voiceUpdate(connected, m1);
  const [m3, c3] = voiceUpdate(stop, m2);
  return all([
    check(m3.state, toBe("idle")),
    check(c3.__tag, toBe("Disconnect")),
  ]);
});

test("an out-of-order message is ignored (model untouched, no command)", () => {
  // Connected while still idle is illegal → no-op
  const [m, c]: readonly [VoiceModel, { __tag: string }] =
    voiceUpdate(connected, initVoice);
  return all([
    check(m.state, toBe("idle")),
    check(c.__tag, toBe("NoCmd")),
  ]);
});
