import {
  Result,
  ValidationError,
  BrandStr,
  Str,
  Obj,
  Time,
  Option,
  validate,
} from "plgg";

export namespace Id {
  export type t = BrandStr.t<"ArticleId">;
  export const cast = (v: unknown): Result<t, ValidationError> =>
    validate(v, BrandStr.cast<"ArticleId">);
}

export namespace Name {
  export type t = BrandStr.t<"ArticleName">;
  export const cast = (v: unknown): Result<t, ValidationError> =>
    validate(
      v,
      Str.cast,
      Str.lenGt(3) /* enforce minimum length */,
      BrandStr.cast<"ArticleName">,
    );
}

export type t = {
  id: Id.t;
  createdAt: Time.t;
  name: Name.t;
  memo: Option<string>;
};

export const cast = (v: unknown): Result<t, ValidationError> =>
  validate(
    v,
    Obj.cast,
    Obj.prop("id", Id.cast),
    Obj.prop("createdAt", Time.cast),
    Obj.prop("name", Name.cast),
    Obj.optional("memo", Str.cast),
  );
