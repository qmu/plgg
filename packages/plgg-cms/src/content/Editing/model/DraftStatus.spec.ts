import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  asDraftStatus,
  matchDraftStatus,
  transitionDraftStatus,
} from "plgg-cms/content/Editing/model/DraftStatus";

test("asDraftStatus accepts every member and rejects the rest", () =>
  all([
    check(isOk(asDraftStatus("draft")), toBe(true)),
    check(isOk(asDraftStatus("submitted")), toBe(true)),
    check(isOk(asDraftStatus("exported")), toBe(true)),
    check(isOk(asDraftStatus("conflicted")), toBe(true)),
    check(isOk(asDraftStatus("discarded")), toBe(true)),
    check(isErr(asDraftStatus("nope")), toBe(true)),
    check(isErr(asDraftStatus(3)), toBe(true)),
  ]));

test("matchDraftStatus folds every arm", () => {
  const label = matchDraftStatus(
    () => "d",
    () => "s",
    () => "e",
    () => "c",
    () => "x",
  );
  return all([
    check(label("draft"), toBe("d")),
    check(label("submitted"), toBe("s")),
    check(label("exported"), toBe("e")),
    check(label("conflicted"), toBe("c")),
    check(label("discarded"), toBe("x")),
  ]);
});

test("transitionDraftStatus accepts the legal moves", () =>
  all([
    check(isOk(transitionDraftStatus("draft", "submitted")), toBe(true)),
    check(isOk(transitionDraftStatus("submitted", "draft")), toBe(true)),
    check(isOk(transitionDraftStatus("submitted", "exported")), toBe(true)),
    check(isOk(transitionDraftStatus("submitted", "conflicted")), toBe(true)),
    check(isOk(transitionDraftStatus("conflicted", "draft")), toBe(true)),
    check(isOk(transitionDraftStatus("draft", "discarded")), toBe(true)),
    check(isOk(transitionDraftStatus("submitted", "discarded")), toBe(true)),
  ]));

test("transitionDraftStatus rejects illegal + terminal + no-op moves", () =>
  all([
    // exported is terminal
    check(isErr(transitionDraftStatus("exported", "draft")), toBe(true)),
    // discarded is terminal
    check(isErr(transitionDraftStatus("discarded", "draft")), toBe(true)),
    // can't jump draft straight to exported
    check(isErr(transitionDraftStatus("draft", "exported")), toBe(true)),
    // same-state is not a transition
    check(isErr(transitionDraftStatus("draft", "draft")), toBe(true)),
    check(isErr(transitionDraftStatus("submitted", "submitted")), toBe(true)),
  ]));
