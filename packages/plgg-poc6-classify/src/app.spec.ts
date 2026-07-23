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
import { buildPages } from "./classify.ts";

const ready: Ready = {
  pages: buildPages([
    { path: "index.md", text: "[o](concepts/option.md)" },
    {
      path: "concepts/option.md",
      text: "---\ntags: [alpha]\n---\n",
    },
    { path: "concepts/result.md", text: "x" },
  ]),
  configured: false,
};

const readyModel: Model = {
  ...init,
  assets: { kind: "ready", ready },
};

const run = (msg: Msg, model: Model): Model =>
  update(msg, model)[0];

test("init is loading, with no queries yet", () =>
  all([
    check(init.assets.kind, toBe("loading")),
    check(isSome(init.queries.tagFacets), toBe(false)),
    check(init.queryTrail.length, toBe(0)),
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
      {
        kind: "DraftEdited",
        value: "facets and concepts",
      },
      readyModel,
    ).draft,
    toBe("facets and concepts"),
  ));

test("a valid QuerySubmitted routes to the pane, records a ran trail, clears the draft", () => {
  const typed = run(
    {
      kind: "DraftEdited",
      value: "facets and concepts",
    },
    readyModel,
  );
  const after = run(
    { kind: "QuerySubmitted" },
    typed,
  );
  return all([
    check(
      isSome(after.queries.tagFacets),
      toBe(true),
    ),
    check(after.draft, toBe("")),
    check(
      after.queryTrail[0]?.outcome.kind ?? "?",
      toBe("ran"),
    ),
  ]);
});

test("an invalid QuerySubmitted records a refusal", () => {
  const typed = run(
    { kind: "DraftEdited", value: "wibble" },
    readyModel,
  );
  const after = run(
    { kind: "QuerySubmitted" },
    typed,
  );
  return all([
    check(after.draft, toBe("")),
    check(
      after.queryTrail[0]?.outcome.kind ?? "?",
      toBe("refused"),
    ),
    check(
      isSome(after.queries.tagFacets),
      toBe(false),
    ),
  ]);
});

test("an empty QuerySubmitted is a no-op", () =>
  check(
    run({ kind: "QuerySubmitted" }, readyModel)
      .queryTrail.length,
    toBe(0),
  ));

test("QueryRequested routes a UI-driven query to its pane", () =>
  check(
    isSome(
      run(
        {
          kind: "QueryRequested",
          query: {
            kind: "link-graph",
            query: { focus: "concepts/option.md" },
          },
        },
        readyModel,
      ).queries.linkGraph,
    ),
    toBe(true),
  ));

test("a query before assets are ready runs against an empty corpus (0 matches)", () => {
  const after = run(
    {
      kind: "QueryRequested",
      query: {
        kind: "tag-facets",
        query: { tags: ["concepts"], mode: "or" },
      },
    },
    init,
  );
  return all([
    check(
      isSome(after.queries.tagFacets),
      toBe(true),
    ),
    check(
      after.queryTrail[0]?.outcome.kind === "ran" &&
        after.queryTrail[0]?.outcome.count === 0,
      toBe(true),
    ),
  ]);
});

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

test("FromRealtime routes transcripts, tool queries, and errors", () =>
  all([
    check(
      run(
        {
          kind: "FromRealtime",
          event: { kind: "WriterSaid", text: "hi" },
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
      isSome(
        run(
          {
            kind: "FromRealtime",
            event: {
              kind: "QueryCalled",
              callId: "c1",
              query: {
                kind: "multi-filter",
                query: {
                  tags: ["concepts"],
                  text: "",
                },
              },
            },
          },
          readyModel,
        ).queries.multiFilter,
      ),
      toBe(true),
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
