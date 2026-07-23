import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none, isSome } from "plgg";
import {
  type Model,
  type DocRef,
  update,
  init,
  encodeDoc,
  decodeDoc,
  defaultDoc,
} from "./app.ts";
import { buildFtsIndex } from "./poc1.ts";

// The reducer is pure — the whole session lifecycle and
// the tool loop are unit-tested without a browser, a
// microphone, or a network. Effects are asserted as
// DATA via the Cmd tag.
const EN = buildFtsIndex([
  {
    file: "concepts/result.md",
    headingPath: "concepts/result.md > Result",
    text: "handle errors with Result, never throw",
  },
]);

const JA = buildFtsIndex(
  [
    {
      file: "implementation/objective-documentation.md",
      headingPath:
        "implementation/objective-documentation.md > 客観的な文書化",
      text: "文書化の基準を定める。",
    },
  ],
  "segmenter",
);

const READY: Model = {
  ...init,
  assets: {
    kind: "ready",
    ready: {
      en: EN,
      ja: some(JA),
      configured: true,
    },
  },
  doc: some<DocRef>({
    corpus: "qmu-ja",
    file: "implementation/objective-documentation.md",
  }),
};

test("doc refs round-trip through the select encoding", () => {
  const ref: DocRef = {
    corpus: "qmu-ja",
    file: "implementation/objective-documentation.md",
  };
  const decoded = decodeDoc(encodeDoc(ref));
  return all([
    check(isSome(decoded), toBe(true)),
    check(
      isSome(decoded) &&
        decoded.content.file === ref.file &&
        decoded.content.corpus === ref.corpus,
      toBe(true),
    ),
    check(
      isSome(decodeDoc("nonsense")),
      toBe(false),
    ),
  ]);
});

test("the default document prefers tonight's article when the JA index ships", () => {
  const picked = defaultDoc({
    en: EN,
    ja: some(JA),
    configured: true,
  });
  const fallback = defaultDoc({
    en: EN,
    ja: none(),
    configured: true,
  });
  return all([
    check(
      isSome(picked) &&
        picked.content.corpus === "qmu-ja",
      toBe(true),
    ),
    check(
      isSome(fallback) &&
        fallback.content.corpus === "guide",
      toBe(true),
    ),
  ]);
});

test("StartRequested mints+opens once, guarded by phase", () => {
  const [starting, cmd] = update(
    { kind: "StartRequested" },
    READY,
  );
  const [again, againCmd] = update(
    { kind: "StartRequested" },
    starting,
  );
  const [notReady, notReadyCmd] = update(
    { kind: "StartRequested" },
    init,
  );
  return all([
    check(
      starting.session.kind,
      toBe("starting"),
    ),
    check(cmd.__tag, toBe("CmdEffect")),
    check(again.session.kind, toBe("starting")),
    check(againCmd.__tag, toBe("CmdNone")),
    check(notReady.session.kind, toBe("idle")),
    check(notReadyCmd.__tag, toBe("CmdNone")),
  ]);
});

const LIVE: Model = {
  ...READY,
  session: { kind: "live" },
};

test("the session lifecycle folds through open/fail/stop/close", () => {
  const [opened] = update(
    { kind: "SessionOpened" },
    { ...READY, session: { kind: "starting" } },
  );
  const [failed] = update(
    {
      kind: "SessionFailed",
      reason: "mic denied",
    },
    { ...READY, session: { kind: "starting" } },
  );
  const [stopping, stopCmd] = update(
    { kind: "StopRequested" },
    LIVE,
  );
  const [closed] = update(
    { kind: "SessionClosed" },
    LIVE,
  );
  return all([
    check(opened.session.kind, toBe("live")),
    check(failed.session.kind, toBe("failed")),
    check(stopping.session.kind, toBe("live")),
    check(stopCmd.__tag, toBe("CmdEffect")),
    check(closed.session.kind, toBe("idle")),
  ]);
});

test("a tool call runs the local search, records the trail, and replies", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "ToolCalled",
        callId: "call_1",
        keywords: "文書化 基準",
      },
    },
    LIVE,
  );
  return all([
    check(model.trail.length, toBe(1)),
    check(
      model.trail[0]?.corpus ?? "missing",
      toBe("qmu-ja"),
    ),
    check(
      (model.trail[0]?.hits.length ?? 0) > 0,
      toBe(true),
    ),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("transcripts accumulate from both speakers", () => {
  const [heard] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "WriterSaid",
        text: "文書化の基準は?",
      },
    },
    LIVE,
  );
  const [answered] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "AssistantSaid",
        text: "客観的な文書化が…",
      },
    },
    heard,
  );
  return all([
    check(answered.transcript.length, toBe(2)),
    check(
      answered.transcript[0]?.who ?? "?",
      toBe("writer"),
    ),
    check(
      answered.transcript[1]?.who ?? "?",
      toBe("assistant"),
    ),
  ]);
});

test("a session error is honest and tears down", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SessionErrored",
        reason: "upstream closed",
      },
    },
    LIVE,
  );
  return all([
    check(model.session.kind, toBe("failed")),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});
