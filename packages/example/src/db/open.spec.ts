import { test, expect } from "vitest";
import {
  isOk,
  proc,
  some,
  none,
  isSome,
  isNone,
} from "plgg";
import { decodeRows } from "plgg-sql";
import { asTodo, Todo } from "../models/Todo";
import {
  LIST_TODOS_SQL,
  compactRow,
  createTodosDb,
  insertTodoSql,
  updateTodoCompletionSql,
  deleteTodoSql,
} from "./open";

const listTodos = (
  db: Awaited<ReturnType<typeof createTodosDb>>,
) =>
  proc(
    LIST_TODOS_SQL,
    (sql) => db.all(sql),
    (rows: ReadonlyArray<unknown>) =>
      decodeRows(asTodo)(rows.map(compactRow)),
  );

test("createTodosDb seeds three rows decodable as Todo", async () => {
  const db = await createTodosDb();
  const result = await listTodos(db);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.length).toBe(3);
    const ids = result.content.map((t: Todo) => t.id);
    expect(ids).toEqual(["t1", "t2", "t3"]);
  }
});

test("seed row t1 is completed (Some completedAt); t2 and t3 are open (None)", async () => {
  const db = await createTodosDb();
  const result = await listTodos(db);
  if (isOk(result)) {
    const [t1, t2, t3] = result.content;
    if (t1 && t2 && t3) {
      expect(t1.completed).toBe(true);
      expect(isSome(t1.completedAt)).toBe(true);
      expect(t2.completed).toBe(false);
      expect(isNone(t2.completedAt)).toBe(true);
      expect(t3.completed).toBe(false);
      expect(isNone(t3.completedAt)).toBe(true);
    }
  }
});

test("insert + read-back round-trip preserves the wire shape", async () => {
  const db = await createTodosDb();
  await db.run(
    insertTodoSql(
      "t4",
      "Round-trip me",
      "2026-05-28T20:00:00Z",
    ),
  );
  const result = await listTodos(db);
  if (isOk(result)) {
    expect(result.content.length).toBe(4);
    const t4 = result.content.find(
      (t: Todo) => t.id === "t4",
    );
    expect(t4?.completed).toBe(false);
    expect(t4 && isNone(t4.completedAt)).toBe(true);
  }
});

test("updateTodoCompletionSql sets completedAt when completed flips true", async () => {
  const db = await createTodosDb();
  await db.run(
    updateTodoCompletionSql(
      "t2",
      true,
      some("2026-05-29T10:00:00Z"),
    ),
  );
  const result = await listTodos(db);
  if (isOk(result)) {
    const t2 = result.content.find(
      (t: Todo) => t.id === "t2",
    );
    expect(t2?.completed).toBe(true);
    expect(t2 && isSome(t2.completedAt)).toBe(true);
  }
});

test("updateTodoCompletionSql clears completedAt when completed flips false", async () => {
  const db = await createTodosDb();
  await db.run(
    updateTodoCompletionSql("t1", false, none()),
  );
  const result = await listTodos(db);
  if (isOk(result)) {
    const t1 = result.content.find(
      (t: Todo) => t.id === "t1",
    );
    expect(t1?.completed).toBe(false);
    expect(t1 && isNone(t1.completedAt)).toBe(true);
  }
});

test("deleteTodoSql removes a row and reports a single change", async () => {
  const db = await createTodosDb();
  const result = await db.run(deleteTodoSql("t3"));
  expect(result.changes).toBe(1);
  const after = await listTodos(db);
  if (isOk(after)) {
    expect(after.content.length).toBe(2);
    expect(
      after.content.find((t: Todo) => t.id === "t3"),
    ).toBeUndefined();
  }
});

test("deleteTodoSql reports 0 changes for a missing id", async () => {
  const db = await createTodosDb();
  const result = await db.run(
    deleteTodoSql("nope"),
  );
  expect(result.changes).toBe(0);
});

test("compactRow drops NULL keys and coerces 0/1 to boolean", () => {
  const row = compactRow({
    id: "x",
    title: "y",
    completed: 1,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: null,
  });
  expect(row).toEqual({
    id: "x",
    title: "y",
    completed: true,
    createdAt: "2026-01-01T00:00:00Z",
  });
});

test("compactRow passes through non-objects unchanged", () => {
  expect(compactRow(42)).toBe(42);
  expect(compactRow(null)).toBe(null);
});
