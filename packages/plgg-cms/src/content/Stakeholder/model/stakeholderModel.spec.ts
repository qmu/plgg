import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  asConversationStatus,
  matchConversationStatus,
  transitionStatus,
} from "plgg-cms/content/Stakeholder/model/ConversationStatus";
import {
  asConversationKind,
  matchConversationKind,
} from "plgg-cms/content/Stakeholder/model/ConversationKind";
import {
  asVisibility,
  matchVisibility,
  feedsRag,
} from "plgg-cms/content/Stakeholder/model/Visibility";
import {
  asAuthorKind,
  matchAuthorKind,
} from "plgg-cms/content/Stakeholder/model/AuthorKind";
import {
  asMessageSource,
  matchMessageSource,
} from "plgg-cms/content/Stakeholder/model/MessageSource";

test("the closed-set casters accept every member and reject the rest", () =>
  all([
    // every member of every set is accepted (covers each || arm)
    check(isOk(asConversationStatus("open")), toBe(true)),
    check(isOk(asConversationStatus("addressed")), toBe(true)),
    check(isOk(asConversationStatus("closed")), toBe(true)),
    check(isErr(asConversationStatus("nope")), toBe(true)),
    check(isErr(asConversationStatus(7)), toBe(true)),
    check(isOk(asConversationKind("request")), toBe(true)),
    check(isOk(asConversationKind("comment")), toBe(true)),
    check(isOk(asConversationKind("thread")), toBe(true)),
    check(isErr(asConversationKind("rant")), toBe(true)),
    check(isErr(asConversationKind(null)), toBe(true)),
    check(isOk(asVisibility("public")), toBe(true)),
    check(isOk(asVisibility("private")), toBe(true)),
    check(isErr(asVisibility("secret")), toBe(true)),
    check(isOk(asAuthorKind("admin")), toBe(true)),
    check(isOk(asAuthorKind("guest")), toBe(true)),
    check(isOk(asAuthorKind("agent")), toBe(true)),
    check(isErr(asAuthorKind("bot")), toBe(true)),
    check(isOk(asMessageSource("web")), toBe(true)),
    check(isOk(asMessageSource("voice")), toBe(true)),
    check(isOk(asMessageSource("admin")), toBe(true)),
    check(isErr(asMessageSource("fax")), toBe(true)),
  ]));

test("the matchers fold every arm", () =>
  all([
    check(matchConversationStatus(() => "o", () => "a", () => "c")("open"), toBe("o")),
    check(matchConversationStatus(() => "o", () => "a", () => "c")("addressed"), toBe("a")),
    check(matchConversationStatus(() => "o", () => "a", () => "c")("closed"), toBe("c")),
    check(matchConversationKind(() => "r", () => "c", () => "t")("request"), toBe("r")),
    check(matchConversationKind(() => "r", () => "c", () => "t")("comment"), toBe("c")),
    check(matchConversationKind(() => "r", () => "c", () => "t")("thread"), toBe("t")),
    check(matchVisibility(() => "pub", () => "priv")("public"), toBe("pub")),
    check(matchVisibility(() => "pub", () => "priv")("private"), toBe("priv")),
    check(matchAuthorKind(() => "ad", () => "gu", () => "ag")("admin"), toBe("ad")),
    check(matchAuthorKind(() => "ad", () => "gu", () => "ag")("guest"), toBe("gu")),
    check(matchAuthorKind(() => "ad", () => "gu", () => "ag")("agent"), toBe("ag")),
    check(matchMessageSource(() => "w", () => "v", () => "a")("web"), toBe("w")),
    check(matchMessageSource(() => "w", () => "v", () => "a")("voice"), toBe("v")),
    check(matchMessageSource(() => "w", () => "v", () => "a")("admin"), toBe("a")),
  ]));

test("only public conversations feed the RAG index", () =>
  all([
    check(feedsRag("public"), toBe(true)),
    check(feedsRag("private"), toBe(false)),
  ]));

test("the lifecycle state machine accepts only the legal transitions", () =>
  all([
    check(isOk(transitionStatus("open", "addressed")), toBe(true)),
    check(isOk(transitionStatus("addressed", "open")), toBe(true)),
    check(isOk(transitionStatus("open", "closed")), toBe(true)),
    check(isOk(transitionStatus("addressed", "closed")), toBe(true)),
    check(isOk(transitionStatus("closed", "open")), toBe(true)),
  ]));

test("the lifecycle state machine rejects illegal + no-op transitions", () =>
  all([
    // closed can only reopen, not jump to addressed
    check(isErr(transitionStatus("closed", "addressed")), toBe(true)),
    // no reopening a closed conversation straight to closed
    check(isErr(transitionStatus("closed", "closed")), toBe(true)),
    // same-state is not a transition
    check(isErr(transitionStatus("open", "open")), toBe(true)),
    check(
      isErr(transitionStatus("addressed", "addressed")),
      toBe(true),
    ),
  ]));
