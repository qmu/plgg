import { Param, Alignment } from "plgg-foundry/index";

export type Medium = Readonly<{
  alignment: Alignment;
  params: ReadonlyArray<Param>;
}>;
