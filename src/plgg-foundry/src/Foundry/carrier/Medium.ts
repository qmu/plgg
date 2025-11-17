import { Obj, Dict } from "plgg";
import {
  Param,
  Alignment,
} from "plgg-foundry/index";

export type Medium = Obj<{
  alignment: Alignment;
  params: Dict<Param>;
}>;
