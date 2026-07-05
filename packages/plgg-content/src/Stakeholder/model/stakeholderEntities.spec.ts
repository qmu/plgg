import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none, box, match } from "plgg";
import { conversation } from "plgg-content/Stakeholder/model/Conversation";
import { message } from "plgg-content/Stakeholder/model/Message";
import {
  type ConversationRef,
  existingConversation,
  newConversation,
  existingConversation$,
  newConversation$,
  ingestMessage,
} from "plgg-content/Stakeholder/model/Ingestion";

test("conversation + message are passthrough constructors carrying their fields", () => {
  const c = conversation({
    id: 1,
    contentPath: some(box("Str")("blog/x.md")),
    kind: "request",
    status: "open",
    visibility: "private",
    createdBy: none(),
    source: "web",
    createdAt: 10,
    updatedAt: 10,
  });
  const m = message({
    id: 1,
    conversationId: 1,
    authorSubject: none(),
    authorKind: "guest",
    body: box("Str")("please fix the typo"),
    source: "web",
    createdAt: 10,
  });
  return all([
    check(c.kind, toBe("request")),
    check(c.status, toBe("open")),
    check(m.body.content, toBe("please fix the typo")),
    check(m.authorKind, toBe("guest")),
  ]);
});

const foldRef = (r: ConversationRef): string =>
  match(r)(
    [
      existingConversation$(),
      ({ content }: { content: number }) =>
        `existing:${content}`,
    ],
    [
      newConversation$(),
      ({
        content,
      }: {
        content: { kind: string };
      }) => `new:${content.kind}`,
    ],
  );

test("ConversationRef folds existing vs new", () =>
  all([
    check(
      foldRef(existingConversation(42)),
      toBe("existing:42"),
    ),
    check(
      foldRef(
        newConversation({
          contentPath: none(),
          kind: "comment",
          visibility: "public",
        }),
      ),
      toBe("new:comment"),
    ),
  ]));

test("ingestMessage assembles the write input verbatim", () => {
  const im = ingestMessage({
    conversationRef: existingConversation(1),
    body: box("Str")("transcribed answer"),
    authorKind: "agent",
    authorSubject: some(box("Str")("sub-9")),
    source: "voice",
  });
  return all([
    check(im.source, toBe("voice")),
    check(im.authorKind, toBe("agent")),
    check(im.body.content, toBe("transcribed answer")),
  ]);
});
