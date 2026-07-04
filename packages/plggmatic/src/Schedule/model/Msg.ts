import {
  type SoftStr,
  type Box,
  type Icon,
  type Option,
  box,
  icon,
  pattern,
} from "plgg";
import { type Url } from "plgg-view/client";
import { type Row } from "plggmatic/Declare/model/Row";

/**
 * Everything that can happen to a scheduled program, as
 * pure data — the derived `Msg` union of `schedule(...)`.
 * A closed union consumed by the derived `update` with an
 * exhaustive `match`, so a new interaction cannot be
 * added without every interpreter site acknowledging it.
 *
 * - `UrlChanged` — a navigation (link/back/forward) the
 *   runtime turned into a message.
 * - `OpenMenu` — a menu entry chose a root collection.
 * - `Select` — a row at a flow `level` was selected
 *   (drills to the next level).
 * - `QueryInput` — the active list's query text changed.
 * - `RequestAction` — an action was requested on a
 *   collection (with an optional target row).
 * - `ConfirmAction` / `CancelAction` — resolve a parked
 *   destructive confirmation.
 * - `Loaded` / `Failed` — an async collection read (or an
 *   action's re-read) resolved.
 */
export type SchedulerMsg =
  | Box<"UrlChanged", Url>
  | Box<"OpenMenu", SoftStr>
  | Box<
      "Select",
      Readonly<{ level: number; id: SoftStr }>
    >
  | Box<"QueryInput", SoftStr>
  | Box<
      "RequestAction",
      Readonly<{
        collection: SoftStr;
        action: SoftStr;
        target: Option<SoftStr>;
      }>
    >
  | Icon<"ConfirmAction">
  | Icon<"CancelAction">
  | Box<
      "Loaded",
      Readonly<{
        collection: SoftStr;
        rows: ReadonlyArray<Row>;
      }>
    >
  | Box<
      "Failed",
      Readonly<{
        collection: SoftStr;
        error: SoftStr;
      }>
    >;

/** Constructs a {@link SchedulerMsg} `UrlChanged`. */
export const urlChanged = (
  url: Url,
): SchedulerMsg => box("UrlChanged")(url);

/** Constructs a {@link SchedulerMsg} `OpenMenu`. */
export const openMenu = (
  collection: SoftStr,
): SchedulerMsg => box("OpenMenu")(collection);

/** Constructs a {@link SchedulerMsg} `Select`. */
export const select = (
  level: number,
  id: SoftStr,
): SchedulerMsg =>
  box("Select")({ level, id });

/** Constructs a {@link SchedulerMsg} `QueryInput`. */
export const queryInput = (
  text: SoftStr,
): SchedulerMsg => box("QueryInput")(text);

/** Constructs a {@link SchedulerMsg} `RequestAction`. */
export const requestAction = (
  collection: SoftStr,
  action: SoftStr,
  target: Option<SoftStr>,
): SchedulerMsg =>
  box("RequestAction")({
    collection,
    action,
    target,
  });

/** Constructs a {@link SchedulerMsg} `ConfirmAction`. */
export const confirmAction = (): SchedulerMsg =>
  icon("ConfirmAction");

/** Constructs a {@link SchedulerMsg} `CancelAction`. */
export const cancelAction = (): SchedulerMsg =>
  icon("CancelAction");

/** Constructs a {@link SchedulerMsg} `Loaded`. */
export const loaded = (
  collection: SoftStr,
  rows: ReadonlyArray<Row>,
): SchedulerMsg =>
  box("Loaded")({ collection, rows });

/** Constructs a {@link SchedulerMsg} `Failed`. */
export const failed = (
  collection: SoftStr,
  error: SoftStr,
): SchedulerMsg =>
  box("Failed")({ collection, error });

/** Matchers for folding a {@link SchedulerMsg}. */
export const urlChanged$ = () =>
  pattern("UrlChanged")();
export const openMenu$ = () =>
  pattern("OpenMenu")();
export const select$ = () => pattern("Select")();
export const queryInput$ = () =>
  pattern("QueryInput")();
export const requestAction$ = () =>
  pattern("RequestAction")();
export const confirmAction$ = () =>
  pattern("ConfirmAction")();
export const cancelAction$ = () =>
  pattern("CancelAction")();
export const loaded$ = () => pattern("Loaded")();
export const failed$ = () => pattern("Failed")();
