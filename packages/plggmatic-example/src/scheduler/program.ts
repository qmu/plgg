import {
  type Box,
  type Icon,
  box,
  icon,
  pattern,
  match,
} from "plgg";
import {
  type Application,
  type Cmd,
  cmdNone,
  cmdBatch,
  cmdEffect,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
} from "plgg-view/client";
import {
  type Html,
  slot,
  button,
  text,
  attr,
  onClick,
  mapHtml,
} from "plgg-view";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type Mode,
  schedule,
  renderMode,
  toggleMode,
} from "plggmatic";
import { declaration } from "./declaration.ts";

/**
 * The runnable scheduler demo (tickets 09/10/11): a
 * plggmatic DECLARATION scheduled into a TEA program, and
 * a runtime MODE held BESIDE the scheduled model (never
 * inside it — D10). The whole view is
 * `renderMode(mode)(scene)`; a toggle flips the mode
 * loss-free (same flow position, selection, query,
 * confirmation, and URL). The app author writes no
 * `Model`/`Msg`/`update`/codec/geometry by hand.
 */

const scheduled = schedule(declaration);

/** The demo model = the scheduled model + the display mode. */
export type DemoModel = Readonly<{
  scheduled: ScheduledModel;
  mode: Mode;
}>;

/** Wrap a scheduler message, or the mode toggle. */
export type DemoMsg =
  | Box<"Sched", SchedulerMsg>
  | Icon<"ToggleMode">;

const sched$ = () => pattern("Sched")();
const toggle$ = () => pattern("ToggleMode")();

/** Re-tag a scheduler `Cmd`'s messages into `DemoMsg`. */
const mapCmd = (
  cmd: Cmd<SchedulerMsg>,
): Cmd<DemoMsg> =>
  match(cmd)(
    [cmdNone$(), (): Cmd<DemoMsg> => cmdNone()],
    [
      cmdBatch$(),
      ({ content }): Cmd<DemoMsg> =>
        cmdBatch(content.map(mapCmd)),
    ],
    [
      cmdEffect$(),
      ({ content }): Cmd<DemoMsg> =>
        cmdEffect(() =>
          content().then(
            (m: SchedulerMsg): DemoMsg =>
              box("Sched")(m),
          ),
        ),
    ],
  );

const toggleBar = (
  mode: Mode,
): Html<DemoMsg> =>
  slot(
    [attr("class", "sd-modebar")],
    [
      button(
        [
          attr("class", "sd-modebtn"),
          onClick(icon("ToggleMode")),
        ],
        [
          text(
            mode === "multiColumn"
              ? "Switch to single-column"
              : "Switch to multi-column",
          ),
        ],
      ),
    ],
  );

export const program: Application<
  DemoModel,
  DemoMsg
> = {
  init: (url) => {
    const [m, cmd] = scheduled.init(url);
    return [
      { scheduled: m, mode: "multiColumn" },
      mapCmd(cmd),
    ];
  },
  update: (msg, model) =>
    match(msg)(
      [
        sched$(),
        ({
          content,
        }): readonly [
          DemoModel,
          Cmd<DemoMsg>,
        ] => {
          const [m, cmd] = scheduled.update(
            content,
            model.scheduled,
          );
          return [
            { ...model, scheduled: m },
            mapCmd(cmd),
          ];
        },
      ],
      [
        toggle$(),
        (): readonly [
          DemoModel,
          Cmd<DemoMsg>,
        ] => [
          {
            ...model,
            mode: toggleMode(model.mode),
          },
          cmdNone(),
        ],
      ],
    ),
  view: (model) =>
    slot(
      [attr("class", "sd-demo")],
      [
        toggleBar(model.mode),
        mapHtml((m: SchedulerMsg): DemoMsg =>
          box("Sched")(m),
        )(
          renderMode(model.mode)(
            scheduled.scene(model.scheduled),
          ),
        ),
      ],
    ),
  onUrlChange: (url) =>
    box("Sched")(scheduled.onUrlChange(url)),
  toUrl: (model) =>
    scheduled.toUrl(model.scheduled),
  historyMode: (prev, next) =>
    scheduled.historyMode(
      prev.scheduled,
      next.scheduled,
    ),
};
