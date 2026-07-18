import {
  type SoftStr,
  some,
  none,
  matchOption,
} from "plgg";
import {
  type Html,
  slot,
  span,
  a,
  href,
  ul,
  li,
  text,
  attr,
} from "plgg-view";
import { type Url } from "plgg-view/client";
import {
  formView,
  textInput,
  selectInput,
} from "plggmatic";
import {
  type SectionId,
  defOf,
} from "./catalog.ts";
import {
  type Rec,
  valueOf,
  labelOf,
} from "./records.ts";
import {
  type Model,
  type Msg,
  type SearchForm,
} from "./model.ts";
import {
  currentUrl,
  sectionOfUrl,
  hrefOf,
  collapseTo,
  resultHref,
  selectedId,
} from "./url.ts";
import {
  type AppColumn,
  addFormColumn,
} from "./columns.ts";

export const searchStatusOptions = (
  section: SectionId,
) => [
  { value: "Any", label: "Any" },
  ...defOf(section).statuses.map((status) => ({
    value: status,
    label: status,
  })),
];

export const searchConditionColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SectionId,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SectionId) =>
      // The search condition stays visible even when a result
      // is selected — drilling into a detail must not drop the
      // filter the results are still showing under (the detail
      // opens as a further column beside it, not in its place).
      model.search.open
        ? [
            {
              key: `${section}-search-condition`,
              title: "Condition",
              // Clicking the header title RESETS the form (clears
              // keyword/status and un-submits) but keeps the
              // column: collapsing to `search` drops kw/st/
              // submitted while leaving search open, so the
              // condition column stays and everything it led to —
              // the results, a selected detail, its trail — falls
              // away with it.
              close: some(
                hrefOf(collapseTo(url, "search")),
              ),
              body: [
                slot(
                  [
                    attr(
                      "class",
                      "bo-search-condition",
                    ),
                  ],
                  [
                    formView<Msg>({
                      fields: [
                        textInput<Msg>({
                          name: "keyword",
                          label: "Keyword",
                          value:
                            model.search
                              .keywordDraft,
                          placeholder:
                            some("Keyword"),
                          error: none(),
                          disabled: false,
                          onInput: (
                            value: SoftStr,
                          ) => ({
                            kind: "searchKeywordInput",
                            value,
                          }),
                        }),
                        selectInput<Msg>({
                          name: "status",
                          label: "Status",
                          value:
                            model.search
                              .statusDraft,
                          options:
                            searchStatusOptions(
                              section,
                            ),
                          error: none(),
                          disabled: false,
                          onChange: (
                            value: SoftStr,
                          ) => ({
                            kind: "searchStatusInput",
                            value,
                          }),
                        }),
                      ],
                      submitLabel: "Search",
                      submitting: false,
                      onSubmit: {
                        kind: "searchFormSubmit",
                      },
                    }),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

export type SearchResult = Readonly<{
  id: SoftStr;
  label: SoftStr;
  status: SoftStr;
  secondary: SoftStr;
}>;

/**
 * A record as a result row. The section's definition says
 * which field names it, which one the status filter compares,
 * and which ones the muted second line joins — so the
 * `switch (section)` that mapped each record type by hand is
 * gone.
 */
export const searchRows = (
  section: SectionId,
  model: Model,
): ReadonlyArray<SearchResult> => {
  const def = defOf(section);
  return model.records[section].map(
    (rec: Rec) => ({
      id: rec.id,
      label: labelOf(section, rec),
      status: valueOf(rec, def.statusField),
      secondary: def.metaFields
        .map((name: SoftStr) =>
          valueOf(rec, name),
        )
        .join(" · "),
    }),
  );
};

export const filteredResults = (
  section: SectionId,
  form: SearchForm,
  model: Model,
): ReadonlyArray<SearchResult> => {
  const keyword = form.keyword
    .trim()
    .toLowerCase();
  return searchRows(section, model).filter(
    (row: SearchResult) =>
      (keyword === "" ||
        row.label
          .toLowerCase()
          .includes(keyword)) &&
      (form.status === "Any" ||
        row.status === form.status),
  );
};

export const resultsList = (
  rows: ReadonlyArray<SearchResult>,
  url: Url,
): Html<Msg> =>
  ul(
    [attr("class", "pm-list")],
    rows.map((row: SearchResult) =>
      li(
        [attr("class", "pm-list-item")],
        [
          a(
            [
              href(resultHref(url, row.id)),
              attr("class", "pm-row-link"),
              ...matchOption<
                SoftStr,
                ReadonlyArray<
                  ReturnType<typeof attr>
                >
              >(
                () => [],
                (id: SoftStr) =>
                  id === row.id
                    ? [
                        attr(
                          "aria-current",
                          "page",
                        ),
                      ]
                    : [],
              )(selectedId(url)),
            ],
            [
              span(
                [attr("class", "bo-result-name")],
                [text(row.label)],
              ),
              span(
                [attr("class", "bo-result-meta")],
                [text(row.secondary)],
              ),
            ],
          ),
        ],
      ),
    ),
  );

export const searchResultsColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SectionId,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SectionId) =>
      model.search.open && model.search.submitted
        ? [
            {
              key: `${section}-search-results`,
              title: defOf(section).plural,
              close: some(
                hrefOf(
                  collapseTo(url, "results"),
                ),
              ),
              body: [
                slot(
                  [attr("class", "bo-results")],
                  [
                    resultsList(
                      filteredResults(
                        section,
                        model.search,
                        model,
                      ),
                      url,
                    ),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

export const appColumns = (
  model: Model,
): ReadonlyArray<AppColumn> => [
  ...addFormColumn(model),
  ...searchConditionColumn(model),
  ...searchResultsColumn(model),
];
