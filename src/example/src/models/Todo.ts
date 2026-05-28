import {
  Time,
  Option,
  Obj,
  SoftStr,
  Result,
  ReadonlyArr,
  InvalidError,
  asSoftStr,
  asBool,
  asObj,
  asTime,
  asReadonlyArray,
  forProp,
  forOptionProp,
  cast,
  refine,
} from "plgg";

type Id = SoftStr;
const asId = (v: unknown) => cast(v, asSoftStr);

// Plain string (SoftStr, not the branded `Str`) so the view can render the
// title directly — title flows DB → cast → VNode text without unwrapping a box.
type Title = SoftStr;
const asTitle = (v: unknown) =>
  cast(
    v,
    asSoftStr,
    refine(
      (s) => s.trim().length >= 1,
      "Title must not be blank",
    ),
    refine(
      (s) => s.length <= 200,
      "Title must be at most 200 characters",
    ),
  );

/**
 * A To-Do item — the domain shape, with `completedAt` carried as `Option<Time>`
 * (None until the To-Do is checked off). `cast`/`forProp`/`forOptionProp` keep
 * the same shape as `plgg-sql` row decoding and JSON-body decoding, so one
 * caster is used at every boundary (DB row, SSR data, JSON API, CSR fetch).
 */
export type Todo = Obj<{
  id: Id;
  title: Title;
  completed: boolean;
  createdAt: Time;
  completedAt: Option<Time>;
}>;

export const asTodo = (v: unknown): Result<Todo, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("id", asId),
    forProp("title", asTitle),
    forProp("completed", asBool),
    forProp("createdAt", asTime),
    forOptionProp("completedAt", asTime),
  );

/**
 * Decodes an array of To-Dos — the shape of `GET /api/todos` and of a
 * `SELECT … FROM todos` result. Reused by the SSR page render, the CSR fetch,
 * and the controller integration tests.
 */
export const asTodos = (
  v: unknown,
): Result<ReadonlyArr<Todo>, InvalidError> =>
  asReadonlyArray(asTodo)(v);

/**
 * The decoded input shape for `POST /api/todos`: just a title. The server
 * generates id, createdAt, and starts the To-Do uncompleted.
 */
export type NewTodo = Obj<{ title: Title }>;

export const asNewTodo = (
  v: unknown,
): Result<NewTodo, InvalidError> =>
  cast(v, asObj, forProp("title", asTitle));

/**
 * The decoded input shape for `PATCH /api/todos/:id`: a single boolean flag.
 * The server (re)computes `completedAt` from this and the current row state.
 */
export type TodoPatch = Obj<{ completed: boolean }>;

export const asTodoPatch = (
  v: unknown,
): Result<TodoPatch, InvalidError> =>
  cast(v, asObj, forProp("completed", asBool));
