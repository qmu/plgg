import {
  Str,
  Obj,
  Bin,
  asStr,
  cast,
  forProp,
  asReadonlyArray,
  asBin,
} from "plgg";

export type Order = Obj<{
  prompt: Str;
  files: ReadonlyArray<Bin>;
}>;

export type OrderArg = {
  prompt: string;
  files?: ReadonlyArray<Uint8Array>;
};

export const asOrder = ({
  prompt,
  files = [],
}: OrderArg) =>
  cast(
    { prompt, files },
    forProp("prompt", asStr),
    forProp("files", asReadonlyArray(asBin)),
  );
