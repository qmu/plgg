import { matchOption } from "plgg";
import {
  type Html,
  slot,
  span,
  text,
  attr,
} from "plgg-view";
import {
  type Application,
  type Url,
  cmdNone,
  cmdBatch,
} from "plgg-view/client";
import {
  type SchedulerMsg,
  multiColumnWith,
  themeToggle,
} from "plggmatic";
import { type Scheme } from "plggmatic/style";
import {
  type SectionId,
  SECTION_IDS,
  bySection,
} from "./catalog.ts";
import { SEEDS, emptyCounts } from "./records.ts";
import {
  type Model,
  type Msg,
  emptySectionForm,
} from "./model.ts";
import {
  isAddUrl,
  searchFormFromUrl,
  currentUrl,
  sectionOfUrl,
  trailOf,
} from "./url.ts";
import { trailColumns } from "./trail.ts";
import {
  mapSchedulerCmd,
  flip,
  applySchemeEffect,
  advanceColumnsCmd,
  patchDraft,
  submitSection,
  syncRecords,
  closedForms,
} from "./logic.ts";
import { scheduled } from "./sections.ts";
import { sectionSubMenu } from "./columns.ts";
import { appColumns } from "./results.ts";

/**
 * Demo 1 — a contract-dev (受託開発) business-management
 * menu, grown from a plggmatic declaration.
 *
 * This module is the app's composition root: it imports the
 * concern modules — `store` (records), `sections`
 * (declaration + descriptors), `model`, `url` (codec),
 * `logic` (domain + scheme), `columns`/`results`
 * (rendering) — and wires them into the Elm-style
 * `Application` (init/update/view/onUrlChange/toUrl). The
 * URL is the single source of truth; every view stage is
 * reconstructable from it and reflected back by `toUrl`.
 */

export const makeApp = (
  initial: Scheme,
): Application<Model, Msg> => ({
  init: (url: Url) => {
    const [scheduledModel, cmd] =
      scheduled.init(url);
    // Seed the record collections + counters into the
    // Model, then project them into the scheduler's dynamic
    // slots. The dynamic source preserves those slots across
    // every later navigation, so no module store is needed.
    return [
      syncRecords({
        scheme: initial,
        scheduled: scheduledModel,
        records: SEEDS,
        counts: emptyCounts(),
        forms: bySection((id: SectionId) =>
          emptySectionForm(id, isAddUrl(id, url)),
        ),
        search: searchFormFromUrl(url),
        trail: trailOf(url),
      }),
      // Advance on the FIRST paint too, not only on later
      // navigation: a deep link arrives with the whole trail
      // already standing, so this is exactly when the strip
      // most needs its live column brought into view — and
      // when the runway most needs the width `advanceColumns`
      // measures, which until now it only ever published
      // after a navigation the deep-linked visitor never made.
      cmdBatch([
        mapSchedulerCmd(cmd),
        advanceColumnsCmd(),
      ]),
    ];
  },
  update: (msg: Msg, model: Model) => {
    switch (msg.kind) {
      case "scheduler": {
        const [next, cmd] = scheduled.update(
          msg.msg,
          model.scheduled,
        );
        return [
          { ...model, scheduled: next },
          cmdBatch([
            mapSchedulerCmd(cmd),
            advanceColumnsCmd(),
          ]),
        ];
      }
      case "toggleScheme": {
        const scheme = flip(model.scheme);
        return [
          { ...model, scheme },
          applySchemeEffect(scheme),
        ];
      }
      case "schemeApplied":
        return [model, cmdNone()];
      case "columnsAdvanced":
        return [model, cmdNone()];
      case "urlChanged": {
        const [next, cmd] = scheduled.update(
          scheduled.onUrlChange(msg.url),
          model.scheduled,
        );
        return [
          {
            ...model,
            scheduled: next,
            forms: bySection((id: SectionId) =>
              emptySectionForm(
                id,
                isAddUrl(id, msg.url),
              ),
            ),
            search: searchFormFromUrl(msg.url),
            trail: trailOf(msg.url),
          },
          cmdBatch([
            mapSchedulerCmd(cmd),
            advanceColumnsCmd(),
          ]),
        ];
      }
      // One case, not twelve: the message carries its own
      // target, so there is nothing to look the section up
      // from.
      case "fieldInput":
        return [
          patchDraft(
            msg.section,
            msg.field,
            msg.value,
            model,
          ),
          cmdNone(),
        ];
      case "formSubmit":
        return submitSection(msg.section, model);
      case "searchKeywordInput":
        return [
          {
            ...model,
            search: {
              ...model.search,
              keywordDraft: msg.value,
              submitted: false,
            },
          },
          cmdNone(),
        ];
      case "searchStatusInput":
        return [
          {
            ...model,
            search: {
              ...model.search,
              statusDraft: msg.value,
              submitted: false,
            },
          },
          cmdNone(),
        ];
      case "searchFormSubmit":
        return [
          {
            ...model,
            forms: closedForms(),
            search: {
              ...model.search,
              open: true,
              submitted: true,
              keyword: model.search.keywordDraft,
              status: model.search.statusDraft,
            },
          },
          advanceColumnsCmd(),
        ];
    }
  },
  view: (model: Model): Html<Msg> => {
    const scene = scheduled.scene(
      model.scheduled,
    );
    // A section hides the scheduler's native list: the
    // app-owned submenu/search/results columns are the
    // section's visible navigation surface.
    //
    // This looked like it would go once every section was in
    // the catalog — it reads `is this a section?`, and they all
    // are now. It stays, because the DASHBOARD is not a
    // section: it is a board of tiles with no records, no
    // fields and no detail, so the framework's rendering IS its
    // rendering and hiding the list would leave it blank. The
    // flag never meant "is this searchable"; it means "does the
    // app own this view's navigation", and the board is the one
    // view where it does not.
    const hideList = matchOption<
      SectionId,
      boolean
    >(
      () => false,
      () => true,
    )(sectionOfUrl(currentUrl(model)));
    const adding = SECTION_IDS.some(
      (id: SectionId) => model.forms[id].open,
    );
    const rootClass =
      "bo-root" +
      (adding ? " bo-adding" : "") +
      (hideList ? " bo-hidelist" : "");
    return slot(
      [attr("class", rootClass)],
      [
        slot(
          [attr("class", "bo-topbar")],
          [
            slot(
              [attr("class", "bo-navleft")],
              [
                span(
                  [attr("class", "bo-brand")],
                  [text("DevDesk")],
                ),
              ],
            ),
            themeToggle<Msg>({
              scheme: model.scheme,
              toggle: { kind: "toggleScheme" },
            }),
          ],
        ),
        multiColumnWith<Msg>(scene, {
          mapMsg: (msg: SchedulerMsg) => ({
            kind: "scheduler",
            msg,
          }),
          omitBreadcrumb: true,
          afterMenu: [
            ...sectionSubMenu(model),
            ...appColumns(model),
            ...trailColumns(model),
          ],
        }),
      ],
    );
  },
  onUrlChange: (url: Url): Msg => ({
    kind: "urlChanged",
    url,
  }),
  toUrl: (model: Model): Url => {
    return currentUrl(model);
  },
});

/** The default app (light) — existing specs/imports use it. */
export const app: Application<Model, Msg> =
  makeApp("light");

// Re-exported so `./bizMenuDemo.ts` stays the demo's single
// entry point (the spec and `demo1-main.ts` import here).
export { scheduled };
export type { Model, Msg };
