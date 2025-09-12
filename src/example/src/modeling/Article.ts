import {
  asStr,
  asObj,
  forProp,
  forOptionProp,
  //Time,
  //asTime,
  Option,
  cast,
  refine,
  Obj,
} from "plgg";

type Id = string;
const asId = (v: unknown) => cast(v, asStr);

type Name = string;
const asName = (v: unknown) =>
  cast(
    v,
    asStr,
    refine((str) => str.length >= 3, "Name must be at least 3 characters long"),
  );

export type Article = Obj<{
  id: Id;
  //createdAt: Time;
  name: Name;
  memo: Option<string>;
}>;

export const asArticle = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("id", asId),
    //forProp("createdAt", asTime),
    forProp("name", asName),
    forOptionProp("memo", asStr),
  );
