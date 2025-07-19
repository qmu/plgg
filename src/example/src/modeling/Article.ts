import {
  Result,
  ValidationError,
  BrandStr,
  asBrandStr,
  asStr,
  asObj,
  hasProp,
  asOptionalProp,
  Time,
  asTime,
  Option,
  cast,
  refine,
} from "plgg";

type Id = BrandStr<"ArticleId">;
const asId = (v: unknown): Result<Id, ValidationError> =>
  cast(v, asBrandStr<"ArticleId">);

type Name = BrandStr<"ArticleName">;
const asName = (v: unknown): Result<Name, ValidationError> =>
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

export const asArticle = (v: unknown): Result<Article, ValidationError> =>
  cast(
    v,
    asObj,
    hasProp("id", asId),
    hasProp("createdAt", asTime),
    hasProp("name", asName),
    asOptionalProp("memo", asStr),
  );
