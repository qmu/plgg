import { getOr, pipe } from "plgg";
import {
  type Cmd,
  type Url,
} from "plgg-view/client";
import { type Declaration } from "plggmatic/Declare/model/Declaration";
import { type Model } from "plggmatic/Schedule/model/Model";
import {
  type SchedulerMsg,
  urlChanged,
} from "plggmatic/Schedule/model/Msg";
import { type Scene } from "plggmatic/Schedule/model/Scene";
import {
  makeUpdate,
  makeInit,
} from "plggmatic/Schedule/usecase/update";
import {
  parseUrl,
  toUrl,
} from "plggmatic/Schedule/usecase/codec";
import { makeScene } from "plggmatic/Schedule/usecase/scene";

/**
 * The derived TEA program of a declaration — everything
 * plgg-view's `Application<Model, SchedulerMsg>` needs
 * except `view`, plus a typed `scene` projector renderers
 * consume. Complete a runnable program by supplying a
 * renderer `r: (Scene) => Html<SchedulerMsg>`:
 * `{ ...scheduled, view: (m) => r(scheduled.scene(m)) }`.
 */
export type Scheduled = Readonly<{
  init: (
    url: Url,
  ) => readonly [Model, Cmd<SchedulerMsg>];
  update: (
    msg: SchedulerMsg,
    model: Model,
  ) => readonly [Model, Cmd<SchedulerMsg>];
  onUrlChange: (url: Url) => SchedulerMsg;
  toUrl: (model: Model) => Url;
  historyMode: (
    prev: Model,
    next: Model,
  ) => "push" | "replace" | "none";
  scene: (model: Model) => Scene;
}>;

/** The URL-visible position of a model, as one string. */
const positionOf = (model: Model): string =>
  `${pipe(model.root, getOr(""))}|${model.path.join("/")}`;

/**
 * Derives the scheduled program from a declaration
 * (design ticket 09). Pure and mode-agnostic: `update`
 * executes nothing (async reads and action verbs are
 * returned as `Cmd` data), the URL codec is total both
 * ways, and `scene` is the only renderer seam — no
 * declaration type or derived value names a column, pane,
 * drawer, or screen (D10).
 *
 * `historyMode` marks a real navigation (`root`/`path`
 * change) as `push` so back/forward traverses it, and a
 * query-only change as `replace` (typing does not spam
 * history) — the nuqs discipline the oracle used.
 */
export const schedule = (
  declaration: Declaration,
): Scheduled => {
  const update = makeUpdate(declaration);
  const init = makeInit(declaration);
  const scene = makeScene(declaration);
  return {
    init: (url: Url) => {
      const slice = parseUrl(url);
      return init(url.path)(slice);
    },
    update,
    onUrlChange: (url: Url): SchedulerMsg =>
      urlChanged(url),
    toUrl,
    historyMode: (prev: Model, next: Model) =>
      positionOf(prev) !== positionOf(next)
        ? "push"
        : "replace",
    scene,
  };
};
