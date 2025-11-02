import { Str, Obj, Bin } from "plgg";

export type Order = Obj<{
  prompt: Str;
  files: ReadonlyArray<Bin>;
}>;
