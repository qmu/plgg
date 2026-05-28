import {
  Time,
  Option,
  Obj,
  SoftStr,
  Result,
  ReadonlyArr,
  InvalidError,
  asSoftStr,
  asObj,
  forProp,
  forOptionProp,
  asTime,
  asReadonlyArray,
  cast,
  refine,
} from "plgg";

type Id = SoftStr;
const asId = (v: unknown) => cast(v, asSoftStr);

// A plain string (not the branded `Str`) so the view can render it directly —
// the article name flows DB → cast → VNode text without unwrapping a box.
type Name = SoftStr;
const asName = (v: unknown) =>
  cast(
    v,
    asSoftStr,
    refine(
      (str) => str.length >= 3,
      "Name must be at least 3 characters long",
    ),
  );

export type Article = Obj<{
  id: Id;
  createdAt: Time;
  name: Name;
  memo: Option<string>;
}>;

export const asArticle = (v: unknown): Result<Article, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("id", asId),
    forProp("createdAt", asTime),
    forProp("name", asName),
    forOptionProp("memo", asSoftStr),
  );

/**
 * Decodes an array of articles — the shape of the `/api/articles` JSON body and
 * of a `SELECT ... FROM articles` result. Reused by both the browser hydrate
 * path and the plgg-http-client demo.
 */
export const asArticles = (
  v: unknown,
): Result<ReadonlyArr<Article>, InvalidError> =>
  asReadonlyArray(asArticle)(v);
