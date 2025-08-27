import {
  BrandStr,
  asBrandStr,
  asStr,
  asRec,
  forProp,
  forOptionProp,
  Time,
  asTime,
  Option,
  cast,
  refine,
  Rec,
} from "plgg";

type Id = BrandStr<"ArticleId">;
const asId = (v: unknown) => cast(v, asBrandStr<"ArticleId">);

type Name = BrandStr<"ArticleName">;
const asName = (v: unknown) =>
  cast(
    v,
    asStr,
    refine((str) => str.length >= 3, "Name must be at least 3 characters long"),
    asBrandStr<"ArticleName">,
  );

export type Article = Rec<{
  id: Id;
  createdAt: Time;
  name: Name;
  memo: Option<string>;
}>;

export const asArticle = (v: unknown) =>
  cast(
    v,
    asRec,
    forProp("id", asId),
    forProp("createdAt", asTime),
    forProp("name", asName),
    forOptionProp("memo", asStr),
  );
