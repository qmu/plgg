import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { none, isOk } from "plgg";
import { asSqlIdent } from "plgg-sql/Sql/model/SqlIdent";
import {
  fts5Table,
  fts5Column,
  normalContent,
  contentlessContent,
  externalContent,
  fts5Rebuild,
  fts5SyncTriggers,
  Fts5Table,
} from "plgg-sql/index";

const id = (s: string) => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`test ident invalid: ${s}`);
  }
  return r.content;
};

const build = (
  spec: Parameters<typeof fts5Table>[0],
): Fts5Table => {
  const r = fts5Table(spec);
  if (!isOk(r)) {
    throw new Error("test table invalid");
  }
  return r.content;
};

const external = build({
  name: id("fts"),
  columns: [
    fts5Column(id("title")),
    fts5Column(id("body")),
  ],
  content: externalContent(id("src"), id("id")),
  tokenizer: none(),
});

test("fts5Rebuild renders the 'rebuild' command with zero params", () => {
  const r = fts5Rebuild(id("docs"));
  return all([
    check(
      r.content.text,
      toBe("INSERT INTO docs(docs) VALUES('rebuild')"),
    ),
    check(r.content.params.length, toBe(0)),
  ]);
});

test("external content yields the three AI/AD/AU sync triggers", () =>
  check(
    fts5SyncTriggers(external),
    okThen((ts) =>
      all([
        check(ts.length, toBe(3)),
        check(ts[0]?.content.text ?? "", toContain("AFTER INSERT ON src")),
        check(ts[1]?.content.text ?? "", toContain("AFTER DELETE ON src")),
        check(ts[2]?.content.text ?? "", toContain("AFTER UPDATE ON src")),
        // delete/update emit the FTS5 'delete' command
        check(ts[1]?.content.text ?? "", toContain("'delete'")),
      ]),
    ),
  ));

test("Normal and Contentless tables have no sync triggers (Err, not a throw)", () =>
  all([
    check(
      fts5SyncTriggers(
        build({
          name: id("docs"),
          columns: [fts5Column(id("body"))],
          content: normalContent(),
          tokenizer: none(),
        }),
      ),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      fts5SyncTriggers(
        build({
          name: id("docs"),
          columns: [fts5Column(id("body"))],
          content: contentlessContent(),
          tokenizer: none(),
        }),
      ),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
  ]));
