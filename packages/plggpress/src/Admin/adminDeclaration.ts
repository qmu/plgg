import {
  type Result,
  type Option,
  type SoftStr,
  ok,
  err,
  matchResult,
  matchOption,
  getOr,
  fromNullable,
  none,
} from "plgg";
import {
  type Declaration,
  type Path,
  type SchedulerMsg,
  declare,
  menu,
  menuEntry,
  collection,
  action,
  confirm,
  loaded,
  async,
  query,
  makeRow,
  field,
} from "plggmatic";
import { cmdEffect } from "plgg-view/client";
import {
  type Db,
  type Document,
  type CollectionSchema,
  type ListQuery,
  listCollections,
  listCollection,
} from "plgg-content";
import {
  type Account,
  type AccountStore,
  type Role,
  type Subject,
  asSubject,
  subjectString,
  usernameString,
} from "plgg-auth";

/** The default document page (the admin list view's window). */
const DEFAULT_QUERY: ListQuery = {
  limit: 50,
  offset: 0,
  orderBy: "updated_at",
  orderDir: "desc",
  q: none(),
};

const toMemberRow = (a: Account) =>
  makeRow(
    subjectString(a.subject),
    usernameString(a.username),
  );

/** Re-read the members after a role change → a Loaded Msg. */
const reloadMembers = (
  accounts: AccountStore,
): Promise<SchedulerMsg> =>
  accounts
    .listAccounts()
    .then((list) =>
      loaded("members", list.map(toMemberRow)),
    );

/** Apply `role` to the selected member (a no-op if none/invalid), then reload. */
const applyRole = (
  accounts: AccountStore,
  target: Option<SoftStr>,
  role: Role,
): Promise<SchedulerMsg> =>
  matchOption<SoftStr, Promise<SchedulerMsg>>(
    () => reloadMembers(accounts),
    (id: SoftStr) =>
      matchResult<
        Subject,
        unknown,
        Promise<SchedulerMsg>
      >(
        () => reloadMembers(accounts),
        async (subject: Subject) => {
          await accounts.setRole(subject, role);
          return reloadMembers(accounts);
        },
      )(asSubject(id)),
  )(target);

/**
 * The admin declaration (D1): content browsing (read-only,
 * ticket 16 query fns) + member management (ticket 18 account
 * store), declared — not hand-wired — as Collections / Menu /
 * Actions over ASYNC sources (ticket 09). Parameterised by the
 * index `Db` + the `AccountStore`; `schedule()` derives the
 * program and either renderer projects it, so it is storage-
 * AND mode-agnostic (D1/D10). Grant/revoke are
 * confirmation-as-data (destructive → `confirm(msg, true)`).
 * Content editing (ticket 22) and the shown-once invite link
 * (ticket 18 mint) land later; this covers browse + roles.
 */
export const adminDeclaration = (
  db: Db,
  accounts: AccountStore,
): Declaration =>
  declare({
    title: "plggpress admin",
    menu: menu([
      menuEntry("Content", "collections"),
      menuEntry("Members", "members"),
    ]),
    collections: [
      collection<CollectionSchema>({
        id: "collections",
        title: "Collections",
        toRow: (c: CollectionSchema) =>
          makeRow(c.name, c.name),
        source: async(() =>
          listCollections(db).then(
            matchResult<
              ReadonlyArray<CollectionSchema>,
              { content: { message: string } },
              Result<
                ReadonlyArray<CollectionSchema>,
                Error
              >
            >(
              (e) =>
                err(
                  new Error(e.content.message),
                ),
              (cols) => ok(cols),
            ),
          ),
        ),
        child: "documents",
      }),
      collection<Document>({
        id: "documents",
        title: "Documents",
        toRow: (d: Document) =>
          makeRow(
            d.path,
            matchOption<string, string>(
              () => d.path,
              (t: string) => t,
            )(d.title),
            [field("path", d.path)],
          ),
        query: query("Search documents"),
        source: async((path: Path) =>
          listCollection(db)(
            getOr("")(fromNullable(path[0])),
            DEFAULT_QUERY,
          ).then(
            matchResult<
              {
                contents: ReadonlyArray<Document>;
              },
              { content: { message: string } },
              Result<
                ReadonlyArray<Document>,
                Error
              >
            >(
              (e) =>
                err(
                  new Error(e.content.message),
                ),
              (list) => ok(list.contents),
            ),
          ),
        ),
      }),
      collection<Account>({
        id: "members",
        title: "Members",
        toRow: toMemberRow,
        source: async(() =>
          accounts
            .listAccounts()
            .then((list) => ok(list)),
        ),
        query: query("Filter members"),
        actions: [
          action({
            id: "grant-admin",
            label: "Make admin",
            verb: "update",
            confirm: confirm(
              "Grant admin to this member?",
              true,
            ),
            run: (target: Option<SoftStr>) =>
              cmdEffect(() =>
                applyRole(
                  accounts,
                  target,
                  "admin",
                ),
              ),
          }),
          action({
            id: "make-guest",
            label: "Revoke to guest",
            verb: "update",
            confirm: confirm(
              "Revoke this member to guest?",
              true,
            ),
            run: (target: Option<SoftStr>) =>
              cmdEffect(() =>
                applyRole(
                  accounts,
                  target,
                  "guest",
                ),
              ),
          }),
        ],
      }),
    ],
  });
