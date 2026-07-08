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
} from "plgg-view/client";
import {
  type SchedulerMsg,
  multiColumnWith,
  themeToggle,
} from "plggmatic";
import { type Scheme } from "plggmatic/style";
import {
  type SearchableSection,
  seedClients,
  seedProjects,
} from "./records.ts";
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
} from "./url.ts";
import {
  mapSchedulerCmd,
  flip,
  applySchemeEffect,
  patchDraft,
  submitSection,
  syncRecords,
} from "./logic.ts";
import { targetOf } from "./fields.ts";
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
        clients: seedClients,
        projects: seedProjects,
        clientCount: 0,
        projectCount: 0,
        clientForm: emptySectionForm(
          "clients",
          isAddUrl("clients", url),
        ),
        projectForm: emptySectionForm(
          "projects",
          isAddUrl("projects", url),
        ),
        search: searchFormFromUrl(url),
      }),
      mapSchedulerCmd(cmd),
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
          mapSchedulerCmd(cmd),
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
      case "urlChanged": {
        const [next, cmd] = scheduled.update(
          scheduled.onUrlChange(msg.url),
          model.scheduled,
        );
        return [
          {
            ...model,
            scheduled: next,
            clientForm: emptySectionForm(
              "clients",
              isAddUrl("clients", msg.url),
            ),
            projectForm: emptySectionForm(
              "projects",
              isAddUrl("projects", msg.url),
            ),
            search: searchFormFromUrl(msg.url),
          },
          mapSchedulerCmd(cmd),
        ];
      }
      case "clientNameInput":
      case "clientStatusInput":
      case "clientSinceInput":
      case "clientContactInput":
      case "clientNotesInput":
      case "projectNameInput":
      case "projectClientInput":
      case "projectContractInput":
      case "projectStatusInput":
      case "projectPeriodInput":
      case "projectBudgetInput":
      case "projectLeadInput": {
        const target = targetOf(msg.kind);
        return [
          patchDraft(
            target.section,
            target.field,
            msg.value,
            model,
          ),
          cmdNone(),
        ];
      }
      case "clientFormSubmit":
        return submitSection("clients", model);
      case "projectFormSubmit":
        return submitSection("projects", model);
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
            clientForm: emptySectionForm(
              "clients",
              false,
            ),
            projectForm: emptySectionForm(
              "projects",
              false,
            ),
            search: {
              ...model.search,
              open: true,
              submitted: true,
              keyword: model.search.keywordDraft,
              status: model.search.statusDraft,
            },
          },
          cmdNone(),
        ];
    }
  },
  view: (model: Model): Html<Msg> => {
    const scene = scheduled.scene(
      model.scheduled,
    );
    const inSearchable = matchOption<
      SearchableSection,
      boolean
    >(
      () => false,
      () => true,
    )(sectionOfUrl(currentUrl(model)));
    // Searchable sections hide the scheduler's native
    // list; the app-owned submenu/search/results columns
    // are the section's visible navigation surface.
    const hideList = inSearchable;
    const rootClass =
      "bo-root" +
      (model.clientForm.open ||
      model.projectForm.open
        ? " bo-adding"
        : "") +
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
