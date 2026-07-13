import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, isSome, ok, err } from "plgg";
import {
  type Model,
  update,
  init,
  defaultDoc,
} from "./app.ts";
import { buildFtsIndex } from "./poc1.ts";

// The reducer is pure — the session lifecycle, BOTH
// tool loops (search in-browser, edit via the server
// seam), the typed-turn path, and the post-edit index
// refresh are unit-tested without a browser, a
// microphone, or a network. Effects are asserted as
// DATA via the Cmd tag.

const INDEX = buildFtsIndex([
  {
    file: "index.md",
    headingPath: "index.md > plgg",
    text: "a functional programming toolkit",
  },
  {
    file: "concepts/result.md",
    headingPath: "concepts/result.md > Result",
    text: "handle errors with Result, never throw",
  },
]);

const READY: Model = {
  ...init,
  assets: {
    kind: "ready",
    ready: {
      index: INDEX,
      configured: true,
    },
  },
  doc: some("concepts/result.md"),
};

const LIVE: Model = {
  ...READY,
  session: { kind: "live" },
};

test("the default document prefers the corpus front page", () => {
  const picked = defaultDoc({
    index: INDEX,
    configured: true,
  });
  return all([
    check(isSome(picked), toBe(true)),
    check(
      isSome(picked) &&
        picked.content === "index.md",
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

test("a search call runs the local index, records the trail, and replies", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SearchCalled",
        callId: "call_1",
        keywords: "result errors",
      },
    },
    LIVE,
  );
  return all([
    check(model.trail.length, toBe(1)),
    check(
      (model.trail[0]?.hits.length ?? 0) > 0,
      toBe(true),
    ),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("an edit call becomes the server round-trip effect", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "EditCalled",
        callId: "call_2",
        path: "concepts/result.md",
        content: "# Result\n\nnew text\n",
      },
    },
    LIVE,
  );
  return all([
    // The trail entry is appended when the seam
    // ANSWERS (EditFinished), not when the call is
    // heard — the page never claims an unconfirmed
    // write.
    check(model.edits.length, toBe(0)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("a landed edit records the trail and refetches the index", () => {
  const [landed, landedCmd] = update(
    {
      kind: "EditFinished",
      trail: {
        path: "concepts/result.md",
        outcome: { kind: "landed" },
      },
    },
    LIVE,
  );
  const [refused, refusedCmd] = update(
    {
      kind: "EditFinished",
      trail: {
        path: "../escape.md",
        outcome: {
          kind: "refused",
          reason:
            "couldn't write ../escape.md — it steps outside the content root",
        },
      },
    },
    LIVE,
  );
  return all([
    check(landed.edits.length, toBe(1)),
    check(
      landed.edits[0]?.outcome.kind ?? "?",
      toBe("landed"),
    ),
    check(landedCmd.__tag, toBe("CmdEffect")),
    check(refused.edits.length, toBe(1)),
    check(
      refused.edits[0]?.outcome.kind ?? "?",
      toBe("refused"),
    ),
    check(refusedCmd.__tag, toBe("CmdNone")),
  ]);
});

test("a refreshed index replaces the ready assets, and a failed refresh keeps the last good one", () => {
  const fresh = buildFtsIndex([
    {
      file: "concepts/result.md",
      headingPath: "concepts/result.md > Result",
      text: "the edited text",
    },
  ]);
  const [refreshed] = update(
    {
      kind: "IndexRefreshed",
      result: ok(fresh),
    },
    LIVE,
  );
  const [kept] = update(
    {
      kind: "IndexRefreshed",
      result: err(new Error("offline")),
    },
    LIVE,
  );
  return all([
    check(
      refreshed.assets.kind === "ready" &&
        refreshed.assets.ready.index.chunks
          .length === 1,
      toBe(true),
    ),
    check(
      kept.assets.kind === "ready" &&
        kept.assets.ready.index.chunks.length ===
          INDEX.chunks.length,
      toBe(true),
    ),
  ]);
});

test("the typed path sends over the live session only, and echoes the writer line", () => {
  const drafted = update(
    {
      kind: "DraftEdited",
      value: "fix the typo",
    },
    LIVE,
  )[0];
  const [sent, sentCmd] = update(
    { kind: "TextSubmitted" },
    drafted,
  );
  const [idle, idleCmd] = update(
    { kind: "TextSubmitted" },
    {
      ...READY,
      draft: "fix the typo",
    },
  );
  const [blank, blankCmd] = update(
    { kind: "TextSubmitted" },
    { ...LIVE, draft: "   " },
  );
  return all([
    check(sent.draft, toBe("")),
    check(sent.transcript.length, toBe(1)),
    check(
      sent.transcript[0]?.who ?? "?",
      toBe("writer"),
    ),
    check(sentCmd.__tag, toBe("CmdEffect")),
    check(idle.transcript.length, toBe(0)),
    check(idleCmd.__tag, toBe("CmdNone")),
    check(blank.transcript.length, toBe(0)),
    check(blankCmd.__tag, toBe("CmdNone")),
  ]);
});

test("transcripts accumulate from both speakers", () => {
  const [heard] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "WriterSaid",
        text: "fix the typo",
      },
    },
    LIVE,
  );
  const [answered] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "AssistantSaid",
        text: "Done — I fixed it.",
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
