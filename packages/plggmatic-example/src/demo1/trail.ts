import {
  type SoftStr,
  type Option,
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
  type SectionId,
  type SectionField,
  type SectionRef,
  type FieldDisplay,
  defOf,
  fieldOf,
  paneFieldsOf,
} from "./catalog.ts";
import {
  type Rec,
  valueOf,
  labelOf,
  recById,
  refTarget,
  refSources,
  backRefsOf,
} from "./records.ts";
import {
  type Model,
  type Msg,
  type TrailStep,
} from "./model.ts";
import { type AppColumn } from "./columns.ts";
import {
  currentUrl,
  sectionOfUrl,
  selectedId,
  hrefOf,
  trailOf,
  appendTrail,
  trailAt,
} from "./url.ts";

/**
 * The recursion trail as columns. The SELECTED record (the
 * scheduler's `p`) is rendered as an app DETAIL pane — the
 * framework detail is hidden (see `.bo-hidelist` in the
 * stylesheet) so the cross-reference link lives INSIDE the
 * detail: a project detail carries its client as a link, and
 * a client detail carries a "Related Projects" link. Each link
 * APPENDS one hop to the URL trail, so a new column grows to
 * the right and the path accumulates without bound: client
 * detail → its projects → a project detail → its client → its
 * projects → … A column header title truncates the trail to
 * that column.
 *
 * A header title names the column's KIND, never its record —
 * "Client Detail", not "ACME Retail K.K.". The record's own
 * name belongs to the pane's content; a title that changed
 * with the selection made the same column read as a
 * different one on every hop, and down a recursion that
 * repeats the same few kinds, the static name is what makes
 * the repetition legible.
 *
 * There is ONE detail renderer and ONE list renderer here, for
 * every section. Which fields a pane shows, which of them is
 * prose, which is a jump, and what a pane offers to recurse
 * into are all read from the catalog — so a section joins the
 * recursion by being declared, not by growing a branch in a
 * switch.
 */

/** A plain label/value row. */
const fieldRow = (
  label: SoftStr,
  value: SoftStr,
): Html<Msg> =>
  slot(
    [attr("class", "bo-field")],
    [
      span(
        [attr("class", "bo-field-label")],
        [text(label)],
      ),
      span(
        [attr("class", "bo-field-value")],
        [text(value)],
      ),
    ],
  );

/**
 * A label whose value is PROSE — a sentence, not a datum.
 *
 * It reads its width from the column instead of setting it.
 * A column is as wide as its content, and the browser decides
 * that from each child's UNWRAPPED width — so a sentence asks
 * for the whole of itself on one line, pins the column to its
 * cap, and then wraps to lines that never reach the edge it
 * just demanded. The dead strip on the right is the gap
 * between what the prose asked for and what it used.
 *
 * `width:0` takes the sentence out of that measurement (a
 * definite width contributes nothing to intrinsic sizing), so
 * the short values below decide the column; `min-width:100%`
 * then gives the sentence the whole of it back to wrap in.
 */
const proseRow = (
  label: SoftStr,
  value: SoftStr,
): Html<Msg> =>
  slot(
    [attr("class", "bo-field")],
    [
      span(
        [attr("class", "bo-field-label")],
        [text(label)],
      ),
      span(
        [
          attr(
            "class",
            "bo-field-value bo-field-prose",
          ),
        ],
        [text(value)],
      ),
    ],
  );

/** A label whose value is a cross-reference drill link. */
const fieldLinkRow = (
  label: SoftStr,
  value: SoftStr,
  to: SoftStr,
): Html<Msg> =>
  slot(
    [attr("class", "bo-field")],
    [
      span(
        [attr("class", "bo-field-label")],
        [text(label)],
      ),
      a(
        [
          href(to),
          attr("class", "bo-field-link"),
        ],
        [text(value)],
      ),
    ],
  );

/** A standalone cross-reference drill link (a button). */
const drillLink = (
  label: SoftStr,
  to: SoftStr,
): Html<Msg> =>
  a(
    [href(to), attr("class", "bo-trail-jump")],
    [text(label)],
  );

/**
 * One row of a detail pane. A field whose `refTo` resolves to
 * a real record becomes a jump that appends that record's
 * detail; one whose value names nothing degrades to plain
 * text, exactly as the framework's reference cell does.
 */
const paneRow = (
  at: Url,
  model: Model,
  f: SectionField,
  rec: Rec,
  display: FieldDisplay,
): Html<Msg> => {
  const value = valueOf(rec, f.name);
  return matchOption<SectionId, Html<Msg>>(
    () =>
      display === "prose"
        ? proseRow(f.label, value)
        : fieldRow(f.label, value),
    (to: SectionId) =>
      matchOption<Rec, Html<Msg>>(
        () => fieldRow(f.label, value),
        (target: Rec) =>
          fieldLinkRow(
            f.label,
            value,
            appendTrail(at, {
              kind: "detail",
              section: to,
              id: target.id,
            }),
          ),
      )(refTarget(model.records, to, value)),
  )(f.refTo);
};

/**
 * What a record can be recursed INTO: one link per incoming
 * reference. Derived from the catalog — clients offer
 * "Related Projects →" because `projects.client` declares it
 * refs clients, not because clients know projects exist.
 */
const backRefLinks = (
  at: Url,
  section: SectionId,
  rec: Rec,
): ReadonlyArray<Html<Msg>> =>
  backRefsOf(section).map((ref: SectionRef) =>
    drillLink(
      `Related ${defOf(ref.section).plural} →`,
      appendTrail(at, {
        kind: "refList",
        section: ref.section,
        field: ref.field,
        id: rec.id,
      }),
    ),
  );

/** A record's detail pane — one renderer, every section. */
const detailColumn = (
  at: Url,
  model: Model,
  section: SectionId,
  rec: Rec,
  close: Option<SoftStr>,
  key: SoftStr,
): AppColumn => ({
  key,
  title: `${defOf(section).title} Detail`,
  close,
  body: [
    slot(
      [attr("class", "bo-trail-detail")],
      [
        ...paneFieldsOf(section).flatMap(
          (
            f: SectionField,
          ): ReadonlyArray<Html<Msg>> =>
            matchOption<
              FieldDisplay,
              ReadonlyArray<Html<Msg>>
            >(
              () => [],
              (display: FieldDisplay) => [
                paneRow(
                  at,
                  model,
                  f,
                  rec,
                  display,
                ),
              ],
            )(f.pane),
        ),
        ...backRefLinks(at, section, rec),
      ],
    ),
  ],
});

/** A block list of records (each row drills in). */
const listColumn = (
  at: Url,
  section: SectionId,
  recs: ReadonlyArray<Rec>,
  close: Option<SoftStr>,
  key: SoftStr,
): AppColumn => {
  const def = defOf(section);
  return {
    key,
    title: def.plural,
    close,
    body: [
      slot(
        [attr("class", "bo-results")],
        [
          ul(
            [attr("class", "pm-list")],
            recs.map((rec: Rec) =>
              li(
                [attr("class", "pm-list-item")],
                [
                  a(
                    [
                      href(
                        appendTrail(at, {
                          kind: "detail",
                          section,
                          id: rec.id,
                        }),
                      ),
                      attr(
                        "class",
                        "pm-row-link",
                      ),
                    ],
                    [
                      span(
                        [
                          attr(
                            "class",
                            "bo-result-name",
                          ),
                        ],
                        [
                          text(
                            labelOf(section, rec),
                          ),
                        ],
                      ),
                      span(
                        [
                          attr(
                            "class",
                            "bo-result-meta",
                          ),
                        ],
                        [
                          text(
                            valueOf(
                              rec,
                              def.statusField,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  };
};

/**
 * The column for one trail step. The step at `index` stands
 * at depth `index + 1` — it IS the (index+1)-th hop — so its
 * header title collapses the trail to `index + 1`, keeping
 * itself and dropping the hops after it. (Collapsing to
 * `index` would drop the very column whose title was
 * clicked.)
 */
const stepColumn = (
  model: Model,
  base: Url,
  step: TrailStep,
  index: number,
): ReadonlyArray<AppColumn> => {
  const at = trailAt(base, index + 1);
  const close = some(hrefOf(at));
  switch (step.kind) {
    case "detail":
      return matchOption<
        Rec,
        ReadonlyArray<AppColumn>
      >(
        () => [],
        (rec: Rec) => [
          detailColumn(
            at,
            model,
            step.section,
            rec,
            close,
            `trail-d-${index}-${step.section}-${rec.id}`,
          ),
        ],
      )(
        recById(
          model.records[step.section],
          step.id,
        ),
      );
    case "refList": {
      // The hop names the referencing section and field; the
      // record it points at lives in the section that field
      // REFS, which the catalog already knows.
      const ref: SectionRef = {
        section: step.section,
        field: step.field,
      };
      return matchOption<
        SectionId,
        ReadonlyArray<AppColumn>
      >(
        () => [],
        (target: SectionId) =>
          matchOption<
            Rec,
            ReadonlyArray<AppColumn>
          >(
            () => [],
            (rec: Rec) => [
              listColumn(
                at,
                step.section,
                refSources(
                  model.records,
                  ref,
                  target,
                  rec,
                ),
                close,
                `trail-l-${index}-${step.section}-${step.field}-${step.id}`,
              ),
            ],
          )(
            recById(
              model.records[target],
              step.id,
            ),
          ),
      )(
        refTargetSection(
          step.section,
          step.field,
        ),
      );
    }
  }
};

/** Which section a referencing field points at. */
const refTargetSection = (
  section: SectionId,
  field: SoftStr,
): Option<SectionId> =>
  matchOption<SectionField, Option<SectionId>>(
    () => none(),
    (f: SectionField) => f.refTo,
  )(fieldOf(section, field));

/**
 * The selected record (scheduler `p`) rendered as the ROOT
 * app detail — the pane the recursion starts from. Its
 * header title drops the whole trail (collapse back to the
 * selection).
 */
const rootDetail = (
  model: Model,
  base: Url,
): ReadonlyArray<AppColumn> => {
  // Depth 0: no hops stand at or left of it, so its title
  // drops the whole trail and its own drill links start a
  // fresh one rather than appending to hops it does not own.
  const at = trailAt(base, 0);
  const close = some(hrefOf(at));
  return matchOption<
    SectionId,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SectionId) =>
      matchOption<
        SoftStr,
        ReadonlyArray<AppColumn>
      >(
        () => [],
        (id: SoftStr) =>
          matchOption<
            Rec,
            ReadonlyArray<AppColumn>
          >(
            () => [],
            (rec: Rec) => [
              detailColumn(
                at,
                model,
                section,
                rec,
                close,
                `root-${section}-${rec.id}`,
              ),
            ],
          )(recById(model.records[section], id)),
      )(selectedId(base)),
  )(sectionOfUrl(base));
};

export const trailColumns = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const base = currentUrl(model);
  return [
    ...rootDetail(model, base),
    ...trailOf(base).flatMap(
      (step: TrailStep, index: number) =>
        stepColumn(model, base, step, index),
    ),
  ];
};
