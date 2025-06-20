import {
  Procedural,
  proc,
  ValidationError,
  BrandStr,
  Str,
  Obj,
  Time,
  Option,
  handle,
} from "plgg";

export namespace Id {
  export type t = BrandStr.t<"ArticleId">;
  export const cast = async (v: unknown): Procedural<t> =>
    handle(
      proc(v, BrandStr.cast<"ArticleId">),
      (e) => new ValidationError("ArticleId validation failed", e),
    );
}

export namespace Name {
  export type t = BrandStr.t<"ArticleName">;
  export const cast = (v: unknown): Procedural<t> =>
    handle(
      proc(
        v,
        Str.cast,
        Str.lenGt(3) /* enforce minimum length */,
        BrandStr.cast<"ArticleName">,
      ),
      (e) => new ValidationError("ArticleName validation failed", e),
    );
}

export type t = {
  id: Id.t;
  createdAt: Time.t;
  name: Name.t;
  memo: Option<string>;
};

export const cast = (v: unknown): Procedural<t> =>
  handle(
    proc(
      v,
      Obj.cast,
      Obj.prop("id", Id.cast),
      Obj.prop("createdAt", Time.cast),
      Obj.prop("name", Name.cast),
      Obj.optional("memo", Str.cast),
    ),
    (e) => new ValidationError("Article validation failed", e),
  );
