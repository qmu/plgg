import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  some,
  none,
  ok,
  err,
  isSome,
  isNone,
} from "plgg";
import {
  type Model,
  update,
  init,
  defaultDoc,
} from "./app.ts";
import {
  keptSegment,
  changedSegment,
} from "./edit.ts";
import { buildFtsIndex } from "./poc1.ts";

// The reducer is pure — the session lifecycle, BOTH tool
// loops (search in-browser, edit via the server seam), the
// typed-turn path, the live-preview state (doc load, the
// granular edit's diff + two-phase animation), the viz
// toggle, and the post-edit index refresh are unit-tested
// without a browser, a microphone, or a network. Effects
// are asserted as DATA via the Cmd tag.

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
  docText:
    "handle errors with Result, never throw",
  preview: [
    {
      kind: "kept",
      text: "handle errors with Result, never throw",
    },
  ],
};

const LIVE: Model = {
  ...READY,
  session: { kind: "live" },
};

const LANDED = {
  path: "concepts/result.md",
  outcome: { kind: "landed", spans: 1 },
} as const;

test("the default document prefers the corpus front page", () => {
  const picked = defaultDoc({
    index: INDEX,
    configured: true,
  });
  return all([
    check(
      isSome(picked) &&
        picked.content === "index.md",
      toBe(true),
    ),
  ]);
});

test("AssetsLoaded readies the fleet and kicks off the doc-text fetch", () => {
  const [model, cmd] = update(
    {
      kind: "AssetsLoaded",
      result: ok({
        index: INDEX,
        configured: true,
      }),
    },
    init,
  );
  return all([
    check(model.assets.kind, toBe("ready")),
    check(
      isSome(model.doc) &&
        model.doc.content === "index.md",
      toBe(true),
    ),
    // The default doc's raw text is fetched for the
    // preview.
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("picking a document fetches its text; DocTextLoaded fills the preview", () => {
  const [picked, pickedCmd] = update(
    {
      kind: "DocPicked",
      value: "index.md",
    },
    READY,
  );
  const [loaded] = update(
    {
      kind: "DocTextLoaded",
      file: "index.md",
      result: ok("# plgg\n\na toolkit"),
    },
    picked,
  );
  return all([
    check(
      isSome(picked.doc) &&
        picked.doc.content === "index.md",
      toBe(true),
    ),
    check(pickedCmd.__tag, toBe("CmdEffect")),
    check(
      loaded.docText,
      toBe("# plgg\n\na toolkit"),
    ),
    check(loaded.preview.length, toBe(1)),
    check(
      loaded.preview[0]?.kind ?? "?",
      toBe("kept"),
    ),
    check(loaded.editPhase, toBe("idle")),
  ]);
});

test("a stale DocTextLoaded for a no-longer-open doc is ignored", () => {
  const [ignored] = update(
    {
      kind: "DocTextLoaded",
      file: "some/other.md",
      result: ok("stale"),
    },
    { ...READY, doc: some("index.md") },
  );
  return check(
    ignored.docText,
    toBe(READY.docText),
  );
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

test("a granular edit call becomes the server round-trip effect", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "EditCalled",
        callId: "call_2",
        path: "concepts/result.md",
        edits: [
          {
            find: "throw",
            replace: "return err",
          },
        ],
      },
    },
    LIVE,
  );
  return all([
    // The trail entry is appended when the seam ANSWERS
    // (EditFinished), not when the call is heard.
    check(model.edits.length, toBe(0)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("a landed edit swaps the preview to the diff, enters the erase phase, and batches refetch+reveal", () => {
  const [landed, landedCmd] = update(
    {
      kind: "EditFinished",
      trail: LANDED,
      applied: some({
        text: "handle errors with Result, never return err",
        segments: [
          keptSegment(
            "handle errors with Result, never ",
          ),
          changedSegment("throw", "return err"),
        ],
      }),
    },
    LIVE,
  );
  return all([
    check(landed.edits.length, toBe(1)),
    check(
      landed.edits[0]?.outcome.kind ?? "?",
      toBe("landed"),
    ),
    check(landed.editSeq, toBe(1)),
    check(landed.editPhase, toBe("erasing")),
    check(landed.preview.length, toBe(2)),
    check(
      landed.docText,
      toBe(
        "handle errors with Result, never return err",
      ),
    ),
    // refetchIndex + revealEdit batched.
    check(landedCmd.__tag, toBe("CmdBatch")),
  ]);
});

test("the reveal tick flips the latest edit to the write phase, ignoring a stale seq", () => {
  const erasing: Model = {
    ...LIVE,
    editSeq: 1,
    editPhase: "erasing",
  };
  const [revealed] = update(
    { kind: "EditRevealed", seq: 1 },
    erasing,
  );
  const [stale] = update(
    { kind: "EditRevealed", seq: 0 },
    erasing,
  );
  return all([
    check(revealed.editPhase, toBe("writing")),
    check(stale.editPhase, toBe("erasing")),
  ]);
});

test("a refused edit records the trail and leaves the preview untouched", () => {
  const [refused, refusedCmd] = update(
    {
      kind: "EditFinished",
      trail: {
        path: "concepts/result.md",
        outcome: {
          kind: "refused",
          reason:
            'couldn\'t apply the edit — "throw" appears 2 times',
        },
      },
      applied: none(),
    },
    LIVE,
  );
  return all([
    check(refused.edits.length, toBe(1)),
    check(
      refused.edits[0]?.outcome.kind ?? "?",
      toBe("refused"),
    ),
    check(refused.editSeq, toBe(0)),
    check(
      refused.preview.length,
      toBe(LIVE.preview.length),
    ),
    check(refusedCmd.__tag, toBe("CmdNone")),
  ]);
});

test("the viz mode toggles between animation and diff", () => {
  const [diff] = update(
    { kind: "VizModePicked", mode: "diff" },
    LIVE,
  );
  const [back] = update(
    { kind: "VizModePicked", mode: "animation" },
    diff,
  );
  return all([
    check(LIVE.vizMode, toBe("animation")),
    check(diff.vizMode, toBe("diff")),
    check(back.vizMode, toBe("animation")),
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
    { ...READY, draft: "fix the typo" },
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

test("clearing the document picker empties the preview", () => {
  const [cleared, clearedCmd] = update(
    { kind: "DocPicked", value: "" },
    READY,
  );
  return all([
    check(isNone(cleared.doc), toBe(true)),
    check(cleared.docText, toBe("")),
    check(cleared.preview.length, toBe(0)),
    check(clearedCmd.__tag, toBe("CmdNone")),
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

test("guards hold on the quiet branches: idle stop, failed-close, non-ready search/refresh, doc-read failure", () => {
  const [, stopIdleCmd] = update(
    { kind: "StopRequested" },
    READY,
  );
  const [closedAfterFail] = update(
    { kind: "SessionClosed" },
    {
      ...READY,
      session: { kind: "failed", reason: "x" },
    },
  );
  // A search/refresh that arrives before assets are ready
  // is a no-op (the index isn't loaded yet).
  const notReadyLive: Model = {
    ...init,
    session: { kind: "live" },
  };
  const [searchNoop, searchNoopCmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SearchCalled",
        callId: "c",
        keywords: "x",
      },
    },
    notReadyLive,
  );
  const [refreshNoop] = update(
    {
      kind: "IndexRefreshed",
      result: ok(INDEX),
    },
    notReadyLive,
  );
  // A failed doc read empties the preview for the open doc.
  const [readFailed] = update(
    {
      kind: "DocTextLoaded",
      file: "concepts/result.md",
      result: err(new Error("404")),
    },
    READY,
  );
  return all([
    check(stopIdleCmd.__tag, toBe("CmdNone")),
    check(
      closedAfterFail.session.kind,
      toBe("failed"),
    ),
    check(searchNoopCmd.__tag, toBe("CmdNone")),
    check(searchNoop.trail.length, toBe(0)),
    check(
      refreshNoop.assets.kind,
      toBe("loading"),
    ),
    check(readFailed.docText, toBe("")),
    check(readFailed.preview.length, toBe(0)),
  ]);
});

test("a tool reply and assets-failed are inert / honest", () => {
  const [replied, repliedCmd] = update(
    { kind: "ToolReplied" },
    LIVE,
  );
  const [failed] = update(
    {
      kind: "AssetsLoaded",
      result: err(new Error("bad shape")),
    },
    init,
  );
  return all([
    check(repliedCmd.__tag, toBe("CmdNone")),
    check(replied.session.kind, toBe("live")),
    check(failed.assets.kind, toBe("failed")),
  ]);
});
