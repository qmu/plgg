import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  asVoiceState,
  matchVoiceState,
  transitionVoiceState,
} from "plgg-cms/agent/VoiceState";

test("asVoiceState accepts every member and rejects the rest", () =>
  all([
    check(isOk(asVoiceState("idle")), toBe(true)),
    check(isOk(asVoiceState("connecting")), toBe(true)),
    check(isOk(asVoiceState("listening")), toBe(true)),
    check(isOk(asVoiceState("searching")), toBe(true)),
    check(isOk(asVoiceState("answering")), toBe(true)),
    check(isOk(asVoiceState("error")), toBe(true)),
    check(isErr(asVoiceState("nope")), toBe(true)),
    check(isErr(asVoiceState(7)), toBe(true)),
  ]));

test("matchVoiceState folds every arm", () => {
  const f = matchVoiceState(
    () => "i",
    () => "c",
    () => "l",
    () => "s",
    () => "a",
    () => "e",
  );
  return all([
    check(f("idle"), toBe("i")),
    check(f("connecting"), toBe("c")),
    check(f("listening"), toBe("l")),
    check(f("searching"), toBe("s")),
    check(f("answering"), toBe("a")),
    check(f("error"), toBe("e")),
  ]);
});

test("transitionVoiceState allows the voice loop", () =>
  all([
    check(isOk(transitionVoiceState("idle", "connecting")), toBe(true)),
    check(isOk(transitionVoiceState("connecting", "listening")), toBe(true)),
    check(isOk(transitionVoiceState("connecting", "error")), toBe(true)),
    check(isOk(transitionVoiceState("listening", "searching")), toBe(true)),
    check(isOk(transitionVoiceState("searching", "answering")), toBe(true)),
    check(isOk(transitionVoiceState("searching", "error")), toBe(true)),
    check(isOk(transitionVoiceState("answering", "listening")), toBe(true)),
    // any live state can disconnect to idle
    check(isOk(transitionVoiceState("listening", "idle")), toBe(true)),
    check(isOk(transitionVoiceState("error", "idle")), toBe(true)),
  ]));

test("transitionVoiceState rejects illegal moves and same-state no-ops", () =>
  all([
    check(isErr(transitionVoiceState("idle", "idle")), toBe(true)),
    check(isErr(transitionVoiceState("idle", "listening")), toBe(true)),
    check(isErr(transitionVoiceState("listening", "answering")), toBe(true)),
    check(isErr(transitionVoiceState("answering", "searching")), toBe(true)),
    check(isErr(transitionVoiceState("error", "listening")), toBe(true)),
  ]));
