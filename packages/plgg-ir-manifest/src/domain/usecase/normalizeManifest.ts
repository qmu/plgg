import { SoftStr, pipe, matchOption } from "plgg";
import {
  Sexp,
  ListExp,
  isListExp,
  listExp,
  printSexp,
} from "plgg-ir-syntax";
import { Normalizer } from "plgg-ir-language";
import { headOf } from "plgg-ir-manifest/domain/usecase/clause";

/**
 * The structural heads the ordering rule may recurse
 * into and sort. Everything else — in particular
 * expression lists like `(before a b)` inside
 * `(invariant ...)` / `(required-when ...)` — is left
 * untouched, because operand order is meaning.
 */
const CLAUSE_RANKS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  "plgg-ir": { module: 0 },
  module: {
    entity: 0,
    aggregate: 1,
    projection: 2,
    policy: 3,
    view: 4,
    action: 5,
  },
  entity: {
    table: 0,
    access: 1,
    field: 2,
    relation: 3,
    invariant: 4,
  },
  field: { type: 0, column: 1, validate: 2 },
  relation: {
    target: 0,
    cardinality: 1,
    required: 2,
    inverse: 3,
  },
  aggregate: {
    root: 0,
    members: 1,
    consistency: 2,
  },
  validate: {},
  access: { read: 0, update: 1 },
  projection: { from: 0, fields: 1 },
  policy: { allows: 0 },
  view: {
    subject: 0,
    scope: 1,
    query: 2,
    layout: 3,
  },
  subject: { entity: 0, parameter: 1 },
  query: { one: 0, include: 1, lookup: 2 },
  one: { where: 0, "authorized-by": 1 },
  lookup: { through: 0 },
  action: {
    subject: 0,
    input: 1,
    authorize: 2,
    effect: 3,
    ensure: 4,
  },
  input: { field: 0 },
  authorize: { policy: 0 },
};

/**
 * Structural heads whose ATOM children are a sortable
 * payload (aggregate member and projection field
 * lists). Layout forms are deliberately absent from
 * both tables — display order is meaning and is
 * preserved verbatim, as is expression operand order.
 */
const ATOM_PAYLOAD_HEADS: ReadonlyArray<SoftStr> =
  ["members", "fields"];

/**
 * The rank of a child clause under a structural
 * parent; unknown clauses keep a stable tail rank.
 */
const rankIn = (
  parentHead: SoftStr,
  child: Sexp,
): number =>
  pipe(CLAUSE_RANKS[parentHead], (ranks) =>
    ranks === undefined || !isListExp(child)
      ? 90
      : pipe(
          headOf(child),
          matchOption(
            (): number => 90,
            (h) =>
              pipe(
                ranks[h.content.name],
                (rank) =>
                  rank === undefined ? 90 : rank,
              ),
          ),
        ),
  );

/**
 * The canonical stable-ordering rule (design.md
 * §16.10, §33): within every structural manifest form,
 * clause lists sort by clause rank then printed text,
 * and `(members ...)` atoms sort by printed text.
 * Deterministic and idempotent — equivalent sources
 * normalize identically. Leading atoms (form name,
 * version) stay in place; expression subtrees are
 * never reordered.
 */
export const manifestStableOrder: Normalizer = {
  name: "manifest-stable-order",
  apply: (exp: Sexp): Sexp => sortAt(exp),
};

/**
 * The recursion worker behind
 * {@link manifestStableOrder}.
 */
const sortAt = (exp: Sexp): Sexp =>
  !isListExp(exp)
    ? exp
    : pipe(
        headOf(exp),
        matchOption(
          (): Sexp => exp,
          (h): Sexp =>
            ATOM_PAYLOAD_HEADS.includes(
              h.content.name,
            )
              ? sortAtomPayload(exp)
              : CLAUSE_RANKS[h.content.name] ===
                  undefined
                ? exp
                : sortStructural(
                    exp,
                    h.content.name,
                  ),
        ),
      );

/**
 * Sorts a `(members a b c)`-style atom payload by
 * printed text.
 */
const sortAtomPayload = (
  list: ListExp,
): ListExp =>
  listExp(
    [
      ...list.content.items.slice(0, 1),
      ...[...list.content.items.slice(1)].sort(
        byPrint,
      ),
    ],
    list.content.range,
  );

/**
 * Sorts a structural form: children recurse first,
 * then the trailing clause-list region sorts by
 * [rank, printed text] while the leading atom run
 * (name / version) stays put.
 */
const sortStructural = (
  list: ListExp,
  head: SoftStr,
): ListExp =>
  pipe(
    list.content.items.map(sortAt),
    (recursed: ReadonlyArray<Sexp>) =>
      pipe(
        recursed.findIndex(isListExp),
        (split: number) =>
          split === -1
            ? listExp(
                recursed,
                list.content.range,
              )
            : listExp(
                [
                  ...recursed.slice(0, split),
                  ...[
                    ...recursed.slice(split),
                  ].sort(
                    (a, b) =>
                      rankIn(head, a) -
                        rankIn(head, b) ||
                      byPrint(a, b),
                  ),
                ],
                list.content.range,
              ),
      ),
  );

/**
 * Deterministic tie-break: canonical printed text.
 */
const byPrint = (a: Sexp, b: Sexp): number =>
  printSexp(a) < printSexp(b)
    ? -1
    : printSexp(a) > printSexp(b)
      ? 1
      : 0;
