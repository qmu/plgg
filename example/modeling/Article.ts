import {
  Procedural,
  step,
  proc,
  capture,
  ValidationError,
  BrandStr,
  Str,
  Obj,
  Time,
  Option,
} from "plgg/index";

export namespace Id {
  export type t = BrandStr.t<"UserId">;
  export const cast = async (v: unknown): Procedural<t> =>
    step(
      proc(v, BrandStr.cast<"UserId">),
      capture((e) => new ValidationError("UserId validation failed", e)),
    );
}

export namespace Name {
  export type t = BrandStr.t<"UserName">;
  export const cast = async (v: unknown): Procedural<t> =>
    step(
      proc(
        v,
        Str.cast,
        Str.lenGt(3) /* enforce minimum length */,
        BrandStr.cast<"UserName">,
      ),
      capture((e) => new ValidationError("UserName validation failed", e)),
    );
}

export type t = {
  id: Id.t;
  createdAt: Time.t;
  name: Name.t;
  memo: Option<string>;
};

export const cast = async (v: unknown): Procedural<t> =>
  step(
    proc(
      v,
      Obj.cast,
      Obj.prop("id", Id.cast),
      Obj.prop("createdAt", Time.cast),
      Obj.prop("name", Name.cast),
      Obj.optional("memo", Str.cast),
    ),
    capture((e) => new ValidationError("User validation failed", e)),
  );
