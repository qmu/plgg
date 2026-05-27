/**
 * plgg-sql example — a *living*, runnable demo of the safe SQL evaluator against
 * a real SQLite database. This is how an application is meant to use it:
 *
 *     author SQL with `sql`  ->  run/runAsync (the Executor seam: node:sqlite)
 *     ->  decoded, typed records.
 *
 * Run it:
 *   npx tsx src/plgg-sql/example.ts
 *
 * Uses Node's built-in `node:sqlite` (no npm dependency). The library stays
 * driver-agnostic — the only code that knows about SQLite is the `execute`
 * seam below. Both the sync (`run`) and async (`runAsync`) paths are shown.
 */
import { DatabaseSync } from "node:sqlite";
import {
  Result,
  InvalidError,
  Num,
  SoftStr,
  cast,
  asObj,
  forProp,
  asNum,
  asSoftStr,
  matchResult,
} from "plgg";
import {
  Sql,
  SqlValue,
  sql,
  run,
  runAsync,
} from "plgg-sql/index";

// --- the application's domain type and its plgg decoder (no `as`) ---
type User = { id: Num; name: SoftStr; age: Num };

const asUser = (
  row: unknown,
): Result<User, InvalidError> =>
  cast(
    row,
    asObj,
    forProp("id", asNum),
    forProp("name", asSoftStr),
    forProp("age", asNum),
  );

// --- the Executor seam: the ONLY code that knows it is talking to SQLite ---
// SQLite has no boolean type, so the seam coerces booleans to 0/1 — exactly the
// kind of dialect detail the library leaves to the driver boundary.
const db = new DatabaseSync(":memory:");

const toBindable = (
  value: SqlValue,
): string | number | null =>
  typeof value === "boolean" ? (value ? 1 : 0) : value;

const execute = (s: Sql): ReadonlyArray<unknown> =>
  db
    .prepare(s.content.text)
    .all(...s.content.params.map(toBindable));

// --- schema + seed: writes are authored with `sql` too (values stay bound) ---
db.exec(
  `CREATE TABLE users (
     id     INTEGER PRIMARY KEY,
     name   TEXT    NOT NULL,
     age    INTEGER NOT NULL,
     active INTEGER NOT NULL
   )`,
);
const seed = (
  id: Num,
  name: SoftStr,
  age: Num,
  active: boolean,
): void =>
  void execute(
    sql`INSERT INTO users (id, name, age, active) VALUES (${id}, ${name}, ${age}, ${active})`,
  );
seed(1, "Ada", 36, true);
seed(2, "Linus", 17, true);
seed(3, "Grace", 45, false);

// --- author a query with `sql`; conditional clauses splice safely ---
const minAge = 18;
const activeOnly = sql`active = ${true}`;
const query = sql`SELECT id, name, age FROM users WHERE ${activeOnly} AND age > ${minAge}`;

console.log("text:  ", query.content.text);
console.log("params:", query.content.params);
// text:   SELECT id, name, age FROM users WHERE active = ? AND age > ?
// params: [ true, 18 ]

// --- sync evaluation: run the seam, decode rows into typed records ---
console.log("\n[run] active users older than", minAge, ":");
matchResult(
  (e: InvalidError) => console.error("decode failed:", e.message),
  (users: ReadonlyArray<User>) => console.log(users),
)(run(execute, asUser)(query));
// [ { id: 1, name: 'Ada', age: 36 } ]
// (Linus is 17, Grace is inactive — both correctly excluded.)

// --- async evaluation: same query, an async executor, awaited ---
const executeAsync = (
  s: Sql,
): Promise<ReadonlyArray<unknown>> =>
  Promise.resolve(execute(s));

runAsync(executeAsync, asUser)(query).then(
  matchResult(
    (e: InvalidError) =>
      console.error("[runAsync] decode failed:", e.message),
    (users: ReadonlyArray<User>) => {
      console.log("\n[runAsync] same result:");
      console.log(users);
      db.close();
    },
  ),
);
