import {
  Result,
  ValidationError,
  BrandStr,
  castBrandStr,
  castStr,
  castObj,
  castProp,
  castOptionalProp,
  Time,
  castTime,
  Option,
  validate,
  refine,
} from "plgg";

type Id = BrandStr<"ArticleId">;
const castId = (v: unknown): Result<Id, ValidationError> =>
  validate(v, castBrandStr<"ArticleId">);

type Name = BrandStr<"ArticleName">;
const castName = (v: unknown): Result<Name, ValidationError> =>
  validate(
    v,
    castStr,
    refine((str) => str.length >= 3, "Name must be at least 3 characters long"),
    castBrandStr<"ArticleName">,
  );

export type Article = {
  id: Id;
  createdAt: Time;
  name: Name;
  memo: Option<string>;
};

export const castArticle = (v: unknown): Result<Article, ValidationError> =>
  validate(
    v,
    castObj,
    castProp("id", castId),
    castProp("createdAt", castTime),
    castProp("name", castName),
    castOptionalProp("memo", castStr),
  );
