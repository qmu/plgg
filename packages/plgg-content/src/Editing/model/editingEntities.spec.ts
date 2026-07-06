import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import { draft } from "plgg-content/Editing/model/Draft";
import { revision } from "plgg-content/Editing/model/Revision";

test("draft is a passthrough constructor carrying its fields", () => {
  const d = draft({
    id: 1,
    contentPath: "blog/new-post.md",
    status: "draft",
    baseRevisionHash: some("hash-abc"),
    createdBy: "guest-7",
    createdAt: 10,
    updatedAt: 20,
  });
  return all([
    check(d.contentPath, toBe("blog/new-post.md")),
    check(d.status, toBe("draft")),
    check(d.createdBy, toBe("guest-7")),
    check(
      d.baseRevisionHash.__tag,
      toBe("Some"),
    ),
  ]);
});

test("a new-page draft has no base revision hash", () => {
  const d = draft({
    id: 2,
    contentPath: "blog/fresh.md",
    status: "draft",
    baseRevisionHash: none(),
    createdBy: "guest-7",
    createdAt: 0,
    updatedAt: 0,
  });
  return check(
    d.baseRevisionHash.__tag,
    toBe("None"),
  );
});

test("revision is a passthrough constructor carrying its immutable body", () => {
  const r = revision({
    id: 1,
    draftId: 2,
    ordinal: 3,
    body: "# Hello\n\nedited",
    createdAt: 30,
  });
  return all([
    check(r.ordinal, toBe(3)),
    check(r.draftId, toBe(2)),
    check(
      r.body,
      toBe("# Hello\n\nedited"),
    ),
  ]);
});
