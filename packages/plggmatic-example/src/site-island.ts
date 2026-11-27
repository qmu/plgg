import {
  sandbox,
  cmdNone,
} from "plgg-view/client";
import {
  type Model,
  type Msg,
} from "./catalog/model.ts";
import { update } from "./catalog/app.ts";
import {
  firstModel,
  pageHtml,
} from "./site/pagePart.ts";

// The runtime of one guide page on the site: the catalog's
// own program, showing that one page. plgg-bundle exposes
// the entry's module.exports as its ESM default.
module.exports = (
  root: Element,
  props: Readonly<{ code: string }>,
) =>
  sandbox<Model, Msg>({
    init: [firstModel(), cmdNone()],
    update,
    view: (model: Model) =>
      pageHtml(model, props.code.trim()),
  })(root);
