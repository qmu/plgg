import { Obj, Dict } from "plgg";
import {
  Param,
  Alignment,
  Address,
} from "plgg-foundry/index";

export type Medium = Obj<{
  alignment: Alignment;
  params: Dict<Address, Param>;
}>;
