import {
  Param,
  Alignment,
  Address,
} from "plgg-foundry/index";

export type Medium = Readonly<{
  alignment: Alignment;
  params: Record<Address, Param>;
}>;
