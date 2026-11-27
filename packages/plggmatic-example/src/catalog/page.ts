import { type SoftStr } from "plgg";
import { type Ctx, type Node } from "./parts.ts";

/**
 * One page of the catalog. `wide` asks for two columns'
 * worth — a page that shows a whole screen.
 */
export type Page = Readonly<{
  id: SoftStr;
  title: SoftStr;
  group: SoftStr;
  wide: boolean;
  body: (ctx: Ctx) => ReadonlyArray<Node>;
}>;
