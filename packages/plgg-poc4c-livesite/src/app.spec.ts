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
  routeOf,
} from "./app.ts";
import { buildFtsIndex } from "./poc1.ts";

// The reducer is pure — the session lifecycle, both tool
// loops, the typed-turn path, and above all 4c's patch
// arbitration (arm before the write, animate on landing,
// stand down on a refusal, record what became of it on the
// REAL page) are unit-tested without a browser, a
// microphone, an iframe, or a network. Effects are
// asserted as DATA via the Cmd tag.

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
    ready: { index: INDEX, configured: true },
  },
  doc: some("concepts/result.md"),
  docText:
    "handle errors with Result, never throw",
};

const LIVE: Model = {
  ...READY,
  session: { kind: "live" },
};

const OPS = [
  { find: "never throw", replace: "never raise" },
];

/* ------------------------------------------------ *
 * Documents                                         *
 * ------------------------------------------------ */

test("the default document prefers the corpus front page", () =>
  check(
    isSome(defaultDoc({
      index: INDEX,
      configured: true,
    })) &&
      defaultDoc({
        index: INDEX,
        configured: true,
      }).content === "index.md",
    toBe(true),
  ));

test("routeOf maps a corpus file onto the proxied page it renders at", () =>
  all([
    check(routeOf("index.md"), toBe("/docs/")),
    check(
      routeOf("concepts/result.md"),
      toBe("/docs/concepts/result"),
    ),
    check(
      routeOf("concepts/index.md"),
      toBe("/docs/concepts"),
    ),
  ]));

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
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("a failed asset load is an honest failure state, not a crash", () => {
  const [model] = update(
    {
      kind: "AssetsLoaded",
      result: err(new Error("boom")),
    },
    init,
  );
  return check(
    model.assets.kind === "failed" &&
      model.assets.reason === "boom",
    toBe(true),
  );
});

test("DocTextLoaded stores the raw bytes the model will quote its find from", () => {
  const [model] = update(
    {
      kind: "DocTextLoaded",
      file: "concepts/result.md",
      result: ok("new text"),
    },
    READY,
  );
  return check(model.docText, toBe("new text"));
});

test("a STALE doc-text answer is dropped — the writer changed document while it was in flight", () => {
  const [model] = update(
    {
      kind: "DocTextLoaded",
      file: "index.md",
      result: ok("front page"),
    },
    READY,
  );
  return check(
    model.docText,
    toBe(
      "handle errors with Result, never throw",
    ),
  );
});

test("a failed doc read degrades the context to empty, never to broken", () => {
  const [model] = update(
    {
      kind: "DocTextLoaded",
      file: "concepts/result.md",
      result: err(new Error("404")),
    },
    READY,
  );
  return check(model.docText, toBe(""));
});

test("picking a document fetches its text; picking none clears it", () => {
  const [picked, pickedCmd] = update(
    { kind: "DocPicked", value: "index.md" },
    READY,
  );
  const [cleared] = update(
    { kind: "DocPicked", value: "" },
    READY,
  );
  return all([
    check(
      isSome(picked.doc) &&
        picked.doc.content === "index.md",
      toBe(true),
    ),
    check(pickedCmd.__tag, toBe("CmdEffect")),
    check(isNone(cleared.doc), toBe(true)),
  ]);
});

/* ------------------------------------------------ *
 * Session                                           *
 * ------------------------------------------------ */

test("starting is refused until the assets are ready, and is not started twice", () => {
  const [, cmd] = update(
    { kind: "StartRequested" },
    READY,
  );
  const [, againCmd] = update(
    { kind: "StartRequested" },
    LIVE,
  );
  const [, notReadyCmd] = update(
    { kind: "StartRequested" },
    init,
  );
  return all([
    check(cmd.__tag, toBe("CmdEffect")),
    check(againCmd.__tag, toBe("CmdNone")),
    check(notReadyCmd.__tag, toBe("CmdNone")),
  ]);
});

test("a session error fails the session and closes it", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SessionErrored",
        reason: "the channel dropped",
      },
    },
    LIVE,
  );
  return all([
    check(
      model.session.kind === "failed" &&
        model.session.reason ===
          "the channel dropped",
      toBe(true),
    ),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("a failed session is not silently revived by a late close", () => {
  const [model] = update(
    { kind: "SessionClosed" },
    {
      ...LIVE,
      session: { kind: "failed", reason: "x" },
    },
  );
  return check(
    model.session.kind,
    toBe("failed"),
  );
});

test("a typed turn is sent on the live session and appended to the transcript", () => {
  const [model, cmd] = update(
    { kind: "TextSubmitted" },
    { ...LIVE, draft: "  fix the typo  " },
  );
  return all([
    check(model.draft, toBe("")),
    check(model.transcript.length, toBe(1)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("an empty draft, or one with no live session, sends nothing", () => {
  const [, blankCmd] = update(
    { kind: "TextSubmitted" },
    { ...LIVE, draft: "   " },
  );
  const [, deadCmd] = update(
    { kind: "TextSubmitted" },
    { ...READY, draft: "hello" },
  );
  return all([
    check(blankCmd.__tag, toBe("CmdNone")),
    check(deadCmd.__tag, toBe("CmdNone")),
  ]);
});

/* ------------------------------------------------ *
 * The search loop                                   *
 * ------------------------------------------------ */

test("a search call answers the model and records the trail", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SearchCalled",
        callId: "c1",
        keywords: "result errors",
      },
    },
    LIVE,
  );
  return all([
    check(model.trail.length, toBe(1)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

/* ------------------------------------------------ *
 * The patch arbitration — 4c's own surface          *
 * ------------------------------------------------ */

test("an edit call ARMS the real page BEFORE the write goes out — the reload frame can beat our response back", () => {
  const [model, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "EditCalled",
        callId: "c1",
        path: "concepts/result.md",
        edits: OPS,
      },
    },
    LIVE,
  );
  return all([
    check(model.patch.kind, toBe("armed")),
    // Batched: the arm and the POST leave together.
    check(cmd.__tag, toBe("CmdBatch")),
  ]);
});

test("a landed edit hands the ops to the real page and refreshes the index", () => {
  const [model, cmd] = update(
    {
      kind: "EditFinished",
      trail: {
        path: "concepts/result.md",
        outcome: { kind: "landed", spans: 1 },
      },
      applied: some(OPS),
    },
    { ...LIVE, patch: { kind: "armed" } },
  );
  return all([
    check(model.edits.length, toBe(1)),
    check(cmd.__tag, toBe("CmdBatch")),
  ]);
});

test("a REFUSED edit stands the real page down — a client left armed would swallow the next external reload", () => {
  const [model, cmd] = update(
    {
      kind: "EditFinished",
      trail: {
        path: "concepts/result.md",
        outcome: {
          kind: "refused",
          reason: "find was ambiguous",
        },
      },
      applied: none(),
    },
    { ...LIVE, patch: { kind: "armed" } },
  );
  return all([
    check(model.edits.length, toBe(1)),
    // The drop, not a batch: nothing landed, nothing to
    // animate, nothing to reindex.
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("a WATCHED patch is recorded — this is the PoC's confidence signal", () => {
  const [model] = update(
    {
      kind: "PatchReported",
      report: { kind: "applied", spans: 2 },
    },
    { ...LIVE, patch: { kind: "armed" } },
  );
  return check(
    model.patch.kind === "watched" &&
      model.patch.spans === 2,
    toBe(true),
  );
});

test("an UNMAPPED span is recorded WITH its reason — the gap is reported, never hidden", () => {
  const [model] = update(
    {
      kind: "PatchReported",
      report: {
        kind: "unmapped",
        failure: "AmbiguousInDom",
        reason: "it appears twice",
      },
    },
    { ...LIVE, patch: { kind: "armed" } },
  );
  return check(
    model.patch.kind === "reloaded" &&
      model.patch.failure ===
        "AmbiguousInDom" &&
      model.patch.reason === "it appears twice",
    toBe(true),
  );
});

/* ------------------------------------------------ *
 * Index refresh                                     *
 * ------------------------------------------------ */

test("a refreshed index replaces the old one so the next search sees the edit", () => {
  const next = buildFtsIndex([
    {
      file: "index.md",
      headingPath: "index.md > plgg",
      text: "brand new text",
    },
  ]);
  const [model] = update(
    { kind: "IndexRefreshed", result: ok(next) },
    LIVE,
  );
  return check(
    model.assets.kind === "ready" &&
      model.assets.ready.index.chunks.length ===
        1,
    toBe(true),
  );
});

test("a failed refresh keeps the last good index — search degrades to stale, never to broken", () => {
  const [model] = update(
    {
      kind: "IndexRefreshed",
      result: err(new Error("offline")),
    },
    LIVE,
  );
  return check(
    model.assets.kind === "ready" &&
      model.assets.ready.index.chunks.length ===
        2,
    toBe(true),
  );
});

test("an index refresh before the assets are ready is ignored, not crashed on", () => {
  const [model] = update(
    { kind: "IndexRefreshed", result: ok(INDEX) },
    init,
  );
  return check(
    model.assets.kind,
    toBe("loading"),
  );
});

/* ------------------------------------------------ *
 * Transcript                                        *
 * ------------------------------------------------ */

test("both sides of the conversation land in the transcript", () => {
  const [heard] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "WriterSaid",
        text: "change it",
      },
    },
    LIVE,
  );
  const [said] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "AssistantSaid",
        text: "done",
      },
    },
    heard,
  );
  return all([
    check(said.transcript.length, toBe(2)),
    check(
      said.transcript[0]?.who,
      toBe("writer"),
    ),
    check(
      said.transcript[1]?.who,
      toBe("assistant"),
    ),
  ]);
});

test("a search call before the index is ready is ignored, not crashed on", () => {
  const [, cmd] = update(
    {
      kind: "FromRealtime",
      event: {
        kind: "SearchCalled",
        callId: "c1",
        keywords: "x",
      },
    },
    init,
  );
  return check(cmd.__tag, toBe("CmdNone"));
});

test("the draft edits, the tool reply is inert, and stop only acts on a running session", () => {
  const [drafted] = update(
    { kind: "DraftEdited", value: "hi" },
    READY,
  );
  const [, inert] = update(
    { kind: "ToolReplied" },
    LIVE,
  );
  const [, stopCmd] = update(
    { kind: "StopRequested" },
    LIVE,
  );
  const [, idleStopCmd] = update(
    { kind: "StopRequested" },
    READY,
  );
  return all([
    check(drafted.draft, toBe("hi")),
    check(inert.__tag, toBe("CmdNone")),
    check(stopCmd.__tag, toBe("CmdEffect")),
    check(idleStopCmd.__tag, toBe("CmdNone")),
  ]);
});

test("the session opens and fails into designed states", () => {
  const [opened] = update(
    { kind: "SessionOpened" },
    READY,
  );
  const [failed] = update(
    {
      kind: "SessionFailed",
      reason: "no key",
    },
    READY,
  );
  const [closed] = update(
    { kind: "SessionClosed" },
    LIVE,
  );
  return all([
    check(opened.session.kind, toBe("live")),
    check(
      failed.session.kind === "failed" &&
        failed.session.reason === "no key",
      toBe(true),
    ),
    check(closed.session.kind, toBe("idle")),
  ]);
});
