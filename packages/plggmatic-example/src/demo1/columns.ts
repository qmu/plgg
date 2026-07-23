import {
  type SoftStr,
  type Option,
  some,
  matchOption,
} from "plgg";
import {
  type Html,
  type Flow,
  slot,
  a,
  href,
  ul,
  li,
  text,
  attr,
} from "plgg-view";
import {
  textInput,
  textArea,
  selectInput,
  formView,
  errorFor,
} from "plggmatic";
import {
  type SectionId,
  type SectionField,
  type FieldInput,
  defOf,
  formFieldsOf,
} from "./catalog.ts";
import {
  type Model,
  type Msg,
  type SectionForm,
} from "./model.ts";
import {
  currentUrl,
  sectionOfUrl,
  activeAdd,
  printAppLayer,
  dropSelection,
  collapseTo,
  hrefOf,
} from "./url.ts";
import { scheduled } from "./sections.ts";
import { draftOf, formOf } from "./logic.ts";

export type AppColumn = Readonly<{
  key: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}>;
export const menuItem = (
  label: SoftStr,
  to: SoftStr,
  active: boolean,
): Html<Msg, "li"> =>
  li(
    [],
    [
      a(
        [
          href(to),
          ...(active
            ? [attr("aria-current", "page")]
            : []),
        ],
        [text(label)],
      ),
    ],
  );

export const sectionSubMenu = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SectionId,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SectionId) => {
      const title = defOf(section).title;
      return [
        {
          key: `${section}-submenu`,
          title,
          close: some(
            hrefOf(collapseTo(url, "section")),
          ),
          body: [
            slot(
              [attr("class", "pm-menu-body")],
              [
                ul(
                  [],
                  [
                    menuItem(
                      "Add",
                      hrefOf(
                        printAppLayer(
                          collapseTo(
                            url,
                            "section",
                          ),
                          {
                            kind: "add",
                            section,
                          },
                        ),
                      ),
                      activeAdd(section, model),
                    ),
                    menuItem(
                      "Search",
                      hrefOf(
                        printAppLayer(
                          collapseTo(
                            url,
                            "section",
                          ),
                          { kind: "searchOpen" },
                        ),
                      ),
                      model.search.open,
                    ),
                  ],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};

/**
 * One field's control. The message it emits CARRIES its
 * section and field — there is no `FieldInputKind` literal to
 * mint per field, and nothing downstream has to guess where an
 * input belongs (which is what `targetOf` used to do, by
 * asking whether the kind was in `clientFields`).
 */
export const fieldInput = (
  section: SectionId,
  field: SectionField,
  input: FieldInput,
  form: SectionForm,
): Flow<Msg> => {
  const value = draftOf(form)(field.name);
  const error = errorFor(form.errors, field.name);
  const onValue = (v: SoftStr): Msg => ({
    kind: "fieldInput",
    section,
    field: field.name,
    value: v,
  });
  switch (input.kind) {
    case "text":
      return textInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(input.placeholder),
        error,
        disabled: false,
        onInput: onValue,
      });
    case "textarea":
      return textArea<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(input.placeholder),
        error,
        disabled: false,
        onInput: onValue,
      });
    case "select":
      return selectInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        options: input.options.map(
          (o: SoftStr) => ({
            value: o,
            label: o,
          }),
        ),
        error,
        disabled: false,
        onChange: onValue,
      });
  }
};

export const formFields = (
  section: SectionId,
  model: Model,
): ReadonlyArray<Flow<Msg>> =>
  formFieldsOf(section).flatMap(
    (
      field: SectionField,
    ): ReadonlyArray<Flow<Msg>> =>
      matchOption<
        FieldInput,
        ReadonlyArray<Flow<Msg>>
      >(
        () => [],
        (input: FieldInput) => [
          fieldInput(
            section,
            field,
            input,
            formOf(section, model),
          ),
        ],
      )(field.input),
  );

export const addFormColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SectionId,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SectionId) => {
      if (!activeAdd(section, model)) {
        return [];
      }
      const def = defOf(section);
      return [
        {
          key: `add-${def.singular}`,
          title: `Add ${def.title}`,
          // Collapse to THIS column, like every other header
          // title. Leaving the form is the body's `Cancel`.
          close: some(
            hrefOf(collapseTo(url, "add")),
          ),
          body: [
            formView<Msg>({
              fields: formFields(section, model),
              submitLabel: `Register ${def.singular}`,
              submitting: false,
              onSubmit: {
                kind: "formSubmit",
                section,
              },
            }),
            slot(
              [attr("class", "pm-actions")],
              [
                a(
                  [
                    href(
                      hrefOf(
                        printAppLayer(
                          dropSelection(
                            scheduled.toUrl(
                              model.scheduled,
                            ),
                          ),
                          { kind: "searchOpen" },
                        ),
                      ),
                    ),
                    attr("class", "pm-btn"),
                    attr("aria-label", "Cancel"),
                  ],
                  [text("Cancel")],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};
