import {
  type SoftStr,
  type Option,
  type Result,
  type PromisedResult,
  type Defect,
  type InvalidError,
  proc,
  ok,
  isErr,
  fromNullable,
  cast,
  asRawObj,
  asSoftStr,
  asNum,
  forProp,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  exec,
  query,
  decodeRows,
  transaction,
  runScript,
} from "plgg-sql";

/**
 * One relying-party session — the opaque cookie id mapped to
 * a `subject` and an absolute `expiresAt` (unix seconds). The
 * subject is held as an opaque string: the store authorizes
 * the admin APP and never needs the auth library's `Subject`
 * brand (layering).
 */
export type RpSession = Readonly<{
  id: SoftStr;
  subject: SoftStr;
  expiresAt: number;
}>;

type StoreError = SqlError | InvalidError | Defect;

/**
 * The RP-session persistence seam: `save` (upsert), `find`
 * (read), and `take` (read + delete in one transaction — the
 * logout / single-use path). Mirrors plgg-auth's `AuthStore`
 * shape.
 */
export type RpSessionStore = Readonly<{
  save: (
    session: RpSession,
  ) => PromisedResult<null, StoreError>;
  find: (
    id: SoftStr,
  ) => PromisedResult<
    Option<RpSession>,
    StoreError
  >;
  take: (
    id: SoftStr,
  ) => PromisedResult<
    Option<RpSession>,
    StoreError
  >;
}>;

const DDL: SoftStr = `CREATE TABLE IF NOT EXISTS rp_sessions (id TEXT PRIMARY KEY, subject TEXT NOT NULL, expires_at INTEGER NOT NULL);`;

/** Creates the `rp_sessions` table idempotently. */
export const initRpSessionSchema = (
  db: Db,
): PromisedResult<null, StoreError> =>
  proc(runScript(db)(DDL), () => ok(null));

const asRpSession = (
  row: unknown,
): Result<RpSession, InvalidError> => {
  const r = cast(
    row,
    asRawObj,
    forProp("id", asSoftStr),
    forProp("subject", asSoftStr),
    forProp("expires_at", asNum),
  );
  return isErr(r)
    ? r
    : ok({
        id: r.content.id,
        subject: r.content.subject,
        expiresAt: r.content.expires_at,
      });
};

/** A {@link RpSessionStore} backed by a plgg-sql {@link Db}. */
export const sqlRpSessionStore = (
  db: Db,
): RpSessionStore => ({
  save: (session: RpSession) =>
    proc(
      exec(db)(
        sql`INSERT INTO rp_sessions (id, subject, expires_at) VALUES (${session.id}, ${session.subject}, ${session.expiresAt}) ON CONFLICT(id) DO UPDATE SET subject = excluded.subject, expires_at = excluded.expires_at`,
      ),
      () => ok(null),
    ),
  find: (id: SoftStr) =>
    proc(
      query(db)(
        sql`SELECT * FROM rp_sessions WHERE id = ${id}`,
      ),
      decodeRows(asRpSession),
      (rows: ReadonlyArray<RpSession>) =>
        ok(fromNullable(rows[0])),
    ),
  take: (id: SoftStr) =>
    transaction(db, () =>
      proc(
        query(db)(
          sql`SELECT * FROM rp_sessions WHERE id = ${id}`,
        ),
        decodeRows(asRpSession),
        (rows: ReadonlyArray<RpSession>) =>
          proc(
            exec(db)(
              sql`DELETE FROM rp_sessions WHERE id = ${id}`,
            ),
            () => ok(fromNullable(rows[0])),
          ),
      ),
    )(null),
});

/**
 * An in-memory {@link RpSessionStore} for tests — same
 * contract, no driver.
 */
export const memoryRpSessionStore =
  (): RpSessionStore => {
    // imperative seam: a plain map keyed by session id.
    const map = new Map<string, RpSession>();
    return {
      save: async (session: RpSession) => {
        map.set(session.id, session);
        return ok(null);
      },
      find: async (id: SoftStr) =>
        ok(fromNullable(map.get(id))),
      take: async (id: SoftStr) => {
        const found = fromNullable(map.get(id));
        map.delete(id);
        return ok(found);
      },
    };
  };
