import {
  Result,
  InvalidError,
  BrandStr,
  asBrandStr,
  asStr,
  asObj,
  forProp,
  forOptionProp,
  Time,
  asTime,
  Option,
  cast,
  refine,
} from "plgg";

type Id = BrandStr<"ArticleId">;
const asId = (v: unknown): Result<Id, InvalidError> =>
  cast(v, asBrandStr<"ArticleId">);

type Name = BrandStr<"ArticleName">;
const asName = (v: unknown): Result<Name, InvalidError> =>
  cast(
    v,
    asStr,
    refine((str) => str.length >= 3, "Name must be at least 3 characters long"),
    asBrandStr<"ArticleName">,
  );

export type Article = {
  id: Id;
  createdAt: Time;
  name: Name;
  memo: Option<string>;
};

export const asArticle = (v: unknown): Result<Article, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("id", asId),
    forProp("createdAt", asTime),
    forProp("name", asName),
    forOptionProp("memo", asStr),
  );
