import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  initVoice,
  voiceUpdate,
  startSession,
  connected,
  userQuery,
  failed,
} from "plggpress/agent/voiceAgent";
import { renderVoice } from "plggpress/agent/voiceView";

test("idle renders the status + a Start button", () => {
  const html = renderVoice(initVoice);
  return all([
    check(html.includes("Idle"), toBe(true)),
    check(
      html.includes("Start voice session"),
      toBe(true),
    ),
  ]);
});

test("a live session renders Listening + a Stop button", () => {
  const [m1] = voiceUpdate(
    startSession,
    initVoice,
  );
  const [m2] = voiceUpdate(connected, m1);
  const html = renderVoice(m2);
  return all([
    check(
      html.includes("Listening"),
      toBe(true),
    ),
    check(html.includes("Stop"), toBe(true)),
  ]);
});

test("the transcript renders as it accumulates", () => {
  const [m1] = voiceUpdate(
    startSession,
    initVoice,
  );
  const [m2] = voiceUpdate(connected, m1);
  const [m3] = voiceUpdate(
    userQuery("how do I deploy"),
    m2,
  );
  const html = renderVoice(m3);
  return check(
    html.includes("how do I deploy"),
    toBe(true),
  );
});

test("the error state surfaces the reason", () => {
  const [m1] = voiceUpdate(
    startSession,
    initVoice,
  );
  const [m2] = voiceUpdate(
    failed("mint 404"),
    m1,
  );
  const html = renderVoice(m2);
  return all([
    check(html.includes("wrong"), toBe(true)),
    check(
      html.includes("mint 404"),
      toBe(true),
    ),
  ]);
});
