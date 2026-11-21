import { type Option, none, some } from "plgg";
import { type Html } from "plgg-view/Html/model/Html";
import { collectCssRules } from "plgg-view/Html/usecase/collectCss";
import { makeRenderer } from "plgg-view/Program/usecase/render";
import { makeSheet } from "plgg-view/Program/usecase/sheet";

/** Runs once per committed paint, with the previous committed model. */
export type AfterRender<Model> = (
  root: Element,
  previous: Option<Model>,
  current: Model,
) => void;

export const makeProgramRenderer = <Model, Msg>(
  root: Element,
  dispatch: (msg: Msg) => void,
  view: (model: Model) => Html<Msg>,
  afterRender?: AfterRender<Model>,
) => {
  const sheet = makeSheet();
  const render = makeRenderer(root, dispatch);
  // A host may synchronously dispatch or unmount during reconciliation.
  let revision = 0;
  let previous: Option<Model> = none();
  return {
    paint: (model: Model): void => {
      const active = ++revision;
      const html = view(model);
      render(html);
      if (active !== revision) return;
      sheet.add(collectCssRules(html));
      const before = previous;
      previous = some(model);
      afterRender?.(root, before, model);
    },
    dispose: (): void => {
      revision++;
      render.dispose();
      sheet.dispose();
    },
  };
};
