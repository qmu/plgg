import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { ok, err, isSome } from "plgg";
import {
  type Model,
  type Msg,
  type Ready,
  init,
  update,
} from "./app.ts";
import { pagesFromPaths } from "./pages.ts";

const ready: Ready = {
  pages: pagesFromPaths([
    "index.md",
    "concepts/option.md",
    "contributing/conventions.md",
  ]),
  configured: false,
};

const readyModel: Model = {
  ...init,
  assets: { kind: "ready", ready },
};

const run = (msg: Msg, model: Model): Model =>
  update(msg, model)[0];

test("init is loading, with the default config", () =>
  all([
    check(init.assets.kind, toBe("loading")),
    check(init.config.layout, toBe("single-column")),
    check(init.configTrail.length, toBe(0)),
  ]));

test("AssetsLoaded ok → ready; err → failed", () =>
  all([
    check(
      run(
        { kind: "AssetsLoaded", result: ok(ready) },
        init,
      ).assets.kind,
      toBe("ready"),
    ),
    check(
      run(
        {
          kind: "AssetsLoaded",
          result: err(new Error("nope")),
        },
        init,
      ).assets.kind,
      toBe("failed"),
    ),
  ]));

test("DraftEdited sets the draft", () =>
  check(
    run(
      { kind: "DraftEdited", value: "theme sz-airy" },
      readyModel,
    ).draft,
    toBe("theme sz-airy"),
  ));

test("a valid CommandSubmitted lands the change, records the trail, clears the draft", () => {
  const typed = run(
    { kind: "DraftEdited", value: "theme sz-airy" },
    readyModel,
  );
  const after = run(
    { kind: "CommandSubmitted" },
    typed,
  );
  return all([
    check(after.config.sizingTheme, toBe("sz-airy")),
    check(after.draft, toBe("")),
    check(after.configTrail.length, toBe(1)),
    check(isSome(after.lastChange), toBe(true)),
    check(
      after.configTrail[0]?.outcome.kind ?? "?",
      toBe("landed"),
    ),
  ]);
});

test("an invalid CommandSubmitted records a refusal and clears the draft", () => {
  const typed = run(
    { kind: "DraftEdited", value: "frobnicate" },
    readyModel,
  );
  const after = run(
    { kind: "CommandSubmitted" },
    typed,
  );
  return all([
    check(after.draft, toBe("")),
    check(
      after.configTrail[0]?.outcome.kind ?? "?",
      toBe("refused"),
    ),
    // The config did not change.
    check(after.config.sizingTheme, toBe("sz-comfortable")),
  ]);
});

test("an empty CommandSubmitted is a no-op", () =>
  check(
    run({ kind: "CommandSubmitted" }, readyModel)
      .configTrail.length,
    toBe(0),
  ));

test("OpRequested applies a UI-driven op directly", () =>
  check(
    run(
      {
        kind: "OpRequested",
        op: { kind: "SetLayout", layout: "wide" },
      },
      readyModel,
    ).config.layout,
    toBe("wide"),
  ));

test("StartRequested only starts from a ready, idle model", () =>
  all([
    check(
      run({ kind: "StartRequested" }, init).session
        .kind,
      toBe("idle"),
    ),
    check(
      run({ kind: "StartRequested" }, readyModel)
        .session.kind,
      toBe("starting"),
    ),
  ]));

test("session lifecycle messages move the phase", () =>
  all([
    check(
      run({ kind: "SessionOpened" }, readyModel)
        .session.kind,
      toBe("live"),
    ),
    check(
      run(
        { kind: "SessionFailed", reason: "x" },
        readyModel,
      ).session.kind,
      toBe("failed"),
    ),
    check(
      run(
        { kind: "SessionClosed" },
        {
          ...readyModel,
          session: { kind: "live" },
        },
      ).session.kind,
      toBe("idle"),
    ),
    // A closed after a failure keeps the failure visible.
    check(
      run(
        { kind: "SessionClosed" },
        {
          ...readyModel,
          session: {
            kind: "failed",
            reason: "x",
          },
        },
      ).session.kind,
      toBe("failed"),
    ),
    check(
      run({ kind: "ToolReplied" }, readyModel)
        .session.kind,
      toBe("idle"),
    ),
  ]));

test("FromRealtime routes transcripts, tool calls, and errors", () =>
  all([
    check(
      run(
        {
          kind: "FromRealtime",
          event: {
            kind: "WriterSaid",
            text: "hi",
          },
        },
        readyModel,
      ).transcript.length,
      toBe(1),
    ),
    check(
      run(
        {
          kind: "FromRealtime",
          event: {
            kind: "AssistantSaid",
            text: "yo",
          },
        },
        readyModel,
      ).transcript.length,
      toBe(1),
    ),
    check(
      run(
        {
          kind: "FromRealtime",
          event: {
            kind: "ConfigCalled",
            callId: "c1",
            op: {
              kind: "SetLayout",
              layout: "multi-column",
            },
          },
        },
        readyModel,
      ).config.layout,
      toBe("multi-column"),
    ),
    check(
      run(
        {
          kind: "FromRealtime",
          event: {
            kind: "SessionErrored",
            reason: "boom",
          },
        },
        {
          ...readyModel,
          session: { kind: "live" },
        },
      ).session.kind,
      toBe("failed"),
    ),
  ]));

test("a voice tool call that refuses records the reason and leaves the config unchanged", () => {
  const after = run(
    {
      kind: "FromRealtime",
      event: {
        kind: "ConfigCalled",
        callId: "c2",
        op: { kind: "ExcludePath", glob: "" },
      },
    },
    readyModel,
  );
  return all([
    check(
      after.configTrail[0]?.outcome.kind ?? "?",
      toBe("refused"),
    ),
    check(after.config.exclusions.length, toBe(0)),
  ]);
});
