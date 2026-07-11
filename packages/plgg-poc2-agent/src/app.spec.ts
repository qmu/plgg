import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { ok, err } from "plgg";
import {
  type Model,
  update,
  init,
} from "./app.ts";
import { CANNED_QUESTIONS } from "./canned.ts";
import {
  type ChunkMeta,
  buildFtsIndex,
} from "./poc1.ts";

// The reducer is pure — the whole ask lifecycle is
// unit-tested here without a browser, a server, or a
// model (the voiceAgent testing contract). Effects are
// asserted as DATA via the Cmd tag.
const READY: Model = {
  ...init,
  assets: {
    kind: "ready",
    ready: {
      fts: buildFtsIndex([
        {
          file: "a.md",
          headingPath: "a.md > Errors",
          text: "handle errors with Result, never throw",
        },
      ]),
      configured: true,
    },
  },
};

const CHUNK: ChunkMeta = {
  id: 0,
  file: "a.md",
  headingPath: "a.md > Errors",
  text: "handle errors with Result, never throw",
  len: 6,
};

const EVIDENCE = [{ chunk: CHUNK, score: 1.2 }];

const ANSWER = {
  answer: "Use Result.",
  citations: [0],
};

test("Submitted retrieves when ready, single-flight guarded", () => {
  const [asked, cmd] = update(
    { kind: "Submitted" },
    { ...READY, draft: "how do I fail?" },
  );
  const [whileBusy, busyCmd] = update(
    { kind: "Submitted" },
    { ...asked, draft: "again?" },
  );
  const [notReady, notReadyCmd] = update(
    { kind: "Submitted" },
    { ...init, draft: "too early" },
  );
  return all([
    check(asked.busy, toBe(true)),
    check(asked.draft, toBe("")),
    check(cmd.__tag, toBe("CmdEffect")),
    check(whileBusy.busy, toBe(true)),
    check(busyCmd.__tag, toBe("CmdNone")),
    check(notReady.busy, toBe(false)),
    check(notReadyCmd.__tag, toBe("CmdNone")),
  ]);
});

test("Retrieved appends an asking exchange and asks the server", () => {
  const [model, cmd] = update(
    {
      kind: "Retrieved",
      question: "how do I fail?",
      evidence: EVIDENCE,
      retrieveMs: 0.4,
    },
    { ...READY, busy: true },
  );
  return all([
    check(model.exchanges.length, toBe(1)),
    check(
      model.exchanges[0]?.outcome.kind ??
        "missing",
      toBe("asking"),
    ),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

const asking: Model = {
  ...READY,
  busy: true,
  exchanges: [
    {
      question: "how do I fail?",
      evidence: EVIDENCE,
      retrieveMs: 0.4,
      outcome: { kind: "asking" },
    },
  ],
};

test("Answered patches the exchange and settles when nothing is queued", () => {
  const [model, cmd] = update(
    {
      kind: "Answered",
      at: 0,
      result: ok(ANSWER),
      ms: 900,
    },
    asking,
  );
  return all([
    check(
      model.exchanges[0]?.outcome.kind ??
        "missing",
      toBe("answered"),
    ),
    check(model.busy, toBe(false)),
    check(cmd.__tag, toBe("CmdNone")),
  ]);
});

test("Answered keeps a failure honest and visible", () => {
  const [model] = update(
    {
      kind: "Answered",
      at: 0,
      result: err("the model call failed"),
      ms: 12,
    },
    asking,
  );
  return check(
    model.exchanges[0]?.outcome.kind ?? "missing",
    toBe("failed"),
  );
});

test("Answered drains the canned queue one question at a time", () => {
  const [model, cmd] = update(
    {
      kind: "Answered",
      at: 0,
      result: ok(ANSWER),
      ms: 900,
    },
    { ...asking, queue: ["next question"] },
  );
  return all([
    check(model.queue.length, toBe(0)),
    check(model.busy, toBe(true)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});

test("CannedRequested queues the tail and asks the head", () => {
  const [model, cmd] = update(
    { kind: "CannedRequested" },
    READY,
  );
  return all([
    check(
      model.queue.length,
      toBe(CANNED_QUESTIONS.length - 1),
    ),
    check(model.busy, toBe(true)),
    check(cmd.__tag, toBe("CmdEffect")),
  ]);
});
