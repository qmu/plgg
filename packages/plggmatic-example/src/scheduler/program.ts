import {
  type Application,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  schedule,
} from "plggmatic";
import { declaration } from "./declaration.ts";
import { render } from "./renderer.ts";

/**
 * The runnable demo program: the scheduler derives
 * `init`/`update`/`onUrlChange`/`toUrl`/`historyMode`
 * from the declaration, and the crude renderer supplies
 * the missing `view` by drawing `scene(model)`. This is
 * the whole point of ticket 09 in one expression — a
 * declaration in, a complete plgg-view `Application` out,
 * with the app author writing no `Model`/`Msg`/`update`/
 * codec by hand.
 */
const scheduled = schedule(declaration);

export const program: Application<
  ScheduledModel,
  SchedulerMsg
> = {
  ...scheduled,
  view: (model: ScheduledModel) =>
    render(scheduled.scene(model)),
};
