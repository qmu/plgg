import {
  sandbox,
  cmdNone,
} from "plgg-view/client";
import {
  type Model,
  type Msg,
} from "./catalog/model.ts";
import {
  update,
  LOOK_SHEET,
} from "./catalog/app.ts";
import {
  firstModel,
  pageHtml,
  pageRef,
} from "./site/pagePart.ts";

// The runtime of one guide page on the site: the catalog's
// own program, showing that one page. plgg-bundle exposes
// the entry's module.exports as its ESM default.
// The sheet the catalog redresses the page through when a
// reader picks another skin: empty until one is picked,
// and last in the head, so it then outranks the site's.
const lookSheet = (): void => {
  if (
    document.getElementById(LOOK_SHEET) !== null
  )
    return;
  const sheet = document.createElement("style");
  sheet.id = LOOK_SHEET;
  document.head.appendChild(sheet);
};

module.exports = (
  root: Element,
  props: Readonly<{ code: string }>,
) => {
  const { locale, id } = pageRef(props.code);
  lookSheet();
  return sandbox<Model, Msg>({
    init: [firstModel(locale), cmdNone()],
    update,
    view: (model: Model) => pageHtml(model, id),
  })(root);
};
