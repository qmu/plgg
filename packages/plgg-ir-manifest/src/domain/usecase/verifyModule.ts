import { pipe, matchOption } from "plgg";
import {
  SemDiagnostic,
  semError,
  withRelated,
} from "plgg-ir-language";
import {
  codeUnknownTarget,
  codeBadInverse,
  codeUnknownAggregateEntity,
  codeDuplicateAggregateMember,
  codeUnrelatedMember,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import { Relation } from "plgg-ir-manifest/domain/model/Relation";
import {
  Entity,
  relationOf,
} from "plgg-ir-manifest/domain/model/Entity";
import { Aggregate } from "plgg-ir-manifest/domain/model/Aggregate";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Verifies one relation (design.md §16.5): its target
 * must be a declared entity, and a declared inverse
 * must name a relation on the target that points back
 * — and, when that inverse declares its own inverse,
 * the pair must reference each other.
 */
const verifyRelation = (
  m: Module,
  owner: Entity,
  r: Relation,
): Diags =>
  pipe(entityOf(m, r.target), (targets) =>
    targets.length === 0
      ? [
          semError(
            codeUnknownTarget,
            `relation ${JSON.stringify(r.name)} targets unknown entity ${JSON.stringify(r.target)}`,
            r.targetRange,
          ),
        ]
      : targets.flatMap((target) =>
          pipe(
            r.inverse,
            matchOption(
              (): Diags => [],
              (inverseName): Diags =>
                verifyInverse(
                  owner,
                  r,
                  target,
                  inverseName,
                ),
            ),
          ),
        ),
  );

/**
 * Verifies one declared inverse against the target
 * entity's relations.
 */
const verifyInverse = (
  owner: Entity,
  r: Relation,
  target: Entity,
  inverseName: string,
): Diags =>
  pipe(
    relationOf(target, inverseName),
    (backs) =>
      backs.length === 0
        ? [
            semError(
              codeBadInverse,
              `inverse ${JSON.stringify(inverseName)} is not a relation of entity ${JSON.stringify(target.name)}`,
              r.range,
            ),
          ]
        : backs.flatMap((back): Diags =>
            back.target !== owner.name
              ? [
                  pipe(
                    semError(
                      codeBadInverse,
                      `inverse ${JSON.stringify(inverseName)} targets ${JSON.stringify(back.target)}, not ${JSON.stringify(owner.name)}`,
                      r.range,
                    ),
                    withRelated([
                      {
                        message:
                          "inverse declared here",
                        range: back.range,
                      },
                    ]),
                  ),
                ]
              : pipe(
                  back.inverse,
                  matchOption(
                    (): Diags => [],
                    (backInverse): Diags =>
                      backInverse === r.name
                        ? []
                        : [
                            pipe(
                              semError(
                                codeBadInverse,
                                `relations ${JSON.stringify(r.name)} and ${JSON.stringify(back.name)} do not reference each other as inverses`,
                                r.range,
                              ),
                              withRelated([
                                {
                                  message:
                                    "counterpart declared here",
                                  range:
                                    back.range,
                                },
                              ]),
                            ),
                          ],
                  ),
                ),
          ),
  );

/**
 * Verifies one aggregate (design.md §16.6): root and
 * members must be declared entities, and every member
 * must be structurally related to the root (a
 * relation in either direction).
 */
const verifyAggregate = (
  m: Module,
  a: Aggregate,
): Diags => [
  ...(entityOf(m, a.root).length === 0
    ? [
        semError(
          codeUnknownAggregateEntity,
          `aggregate root ${JSON.stringify(a.root)} is not a declared entity`,
          a.rootRange,
        ),
      ]
    : []),
  ...a.members.flatMap((member, i) =>
    pipe(
      a.memberRanges
        .slice(i, i + 1)
        .reduce((_, r) => r, a.range),
      (memberRange) =>
        entityOf(m, member).length === 0
          ? [
              semError(
                codeUnknownAggregateEntity,
                `aggregate member ${JSON.stringify(member)} is not a declared entity`,
                memberRange,
              ),
            ]
          : relatedToRoot(m, a.root, member)
            ? []
            : [
                semError(
                  codeUnrelatedMember,
                  `aggregate member ${JSON.stringify(member)} has no relation linking it to root ${JSON.stringify(a.root)}`,
                  memberRange,
                ),
              ],
    ),
  ),
];

/**
 * Is `member` related to `root` in either direction?
 */
const relatedToRoot = (
  m: Module,
  root: string,
  member: string,
): boolean =>
  entityOf(m, member).some((e) =>
    e.relations.some((r) => r.target === root),
  ) ||
  entityOf(m, root).some((e) =>
    e.relations.some((r) => r.target === member),
  );

/**
 * Diagnoses entities claimed by more than one
 * aggregate (design.md §16.6: duplicate aggregate
 * membership).
 */
const verifyMembershipUniqueness = (
  aggregates: ReadonlyArray<Aggregate>,
): Diags =>
  aggregates.flatMap((a, i) =>
    a.members.flatMap((member, j) =>
      aggregates
        .slice(0, i + 1)
        .flatMap((other, k) =>
          other.members.filter(
            (otherMember, l) =>
              otherMember === member &&
              (k < i || l < j),
          ),
        )
        .slice(0, 1)
        .map(() =>
          semError(
            codeDuplicateAggregateMember,
            `entity ${JSON.stringify(member)} belongs to more than one aggregate (or is listed twice)`,
            a.memberRanges
              .slice(j, j + 1)
              .reduce((_, r) => r, a.range),
          ),
        ),
    ),
  );

/**
 * The structural verification passes over a built
 * {@link Module} (design.md §16.5–16.6): relation
 * targets, inverse pairing, aggregate roots/members,
 * membership uniqueness, and member-root
 * relatedness. Pure — diagnostics in, nothing thrown.
 */
export const verifyModule = (
  m: Module,
): Diags => [
  ...m.entities.flatMap((e) =>
    e.relations.flatMap((r) =>
      verifyRelation(m, e, r),
    ),
  ),
  ...m.aggregates.flatMap((a) =>
    verifyAggregate(m, a),
  ),
  ...verifyMembershipUniqueness(m.aggregates),
];
