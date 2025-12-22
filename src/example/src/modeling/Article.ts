import {
  Time,
  Option,
  Obj,
  Str,
  Result,
  InvalidError,
  asSoftStr,
  asObj,
  forProp,
  forOptionProp,
  asTime,
  cast,
  refine,
  asStr,
} from "plgg";

type Id = string;
const asId = (v: unknown) => cast(v, asSoftStr);

type Name = Str;
const asName = (v: unknown) =>
  cast(
    v,
    asSoftStr,
    refine((str) => str.length >= 3, "Name must be at least 3 characters long"),
    asStr,
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
