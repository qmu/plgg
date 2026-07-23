import { SoftStr, pipe, matchOption } from "plgg";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language";
import {
  codeCircularDerivation,
  codeNotWritable,
  codeIncompatibleConsistency,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Dep,
  Derivation,
  FieldRef,
  fieldRef,
  derivationDeps,
  depEntities,
  fieldDep$,
  relationDep$,
} from "plgg-ir-manifest/domain/model/Derivation";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";
import { match } from "plgg";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * One derived field with its resolved derivation.
 */
type DerivedNode = Readonly<{
  ref: FieldRef;
  field: Field;
  derivation: Derivation;
}>;

/**
 * Every derived field of a module.
 */
const derivedNodes = (
  m: Module,
): ReadonlyArray<DerivedNode> =>
  m.entities.flatMap((e) =>
    e.fields.flatMap((f) =>
      pipe(
        f.derive,
        matchOption(
          (): ReadonlyArray<DerivedNode> => [],
          (
            derivation: Derivation,
          ): ReadonlyArray<DerivedNode> => [
            {
              ref: fieldRef(e.name, f.name),
              field: f,
              derivation,
            },
          ],
        ),
      ),
    ),
  );

/**
 * The derived fields a derivation's dependencies
 * point at — the derived-to-derived edges of the
 * update graph.
 */
const derivedDepsOf = (
  nodes: ReadonlyArray<DerivedNode>,
  n: DerivedNode,
): ReadonlyArray<FieldRef> =>
  derivationDeps(n.derivation).flatMap(
    (d: Dep): ReadonlyArray<FieldRef> =>
      match(d)(
        [
          fieldDep$(),
          ({
            content,
          }): ReadonlyArray<FieldRef> =>
            nodes
              .filter(
                (o) =>
                  o.ref.entity ===
                    content.entity &&
                  o.ref.field === content.field,
              )
              .map((o) => o.ref),
        ],
        [
          relationDep$(),
          (): ReadonlyArray<FieldRef> => [],
        ],
      ),
  );

/**
 * Same-ref equality.
 */
const sameRef =
  (a: FieldRef) =>
  (b: FieldRef): boolean =>
    a.entity === b.entity && a.field === b.field;

/**
 * Kahn-style layering: repeatedly take the nodes
 * whose derived dependencies are already ordered.
 * What never becomes ready is in (or downstream of) a
 * cycle.
 */
const layer = (
  nodes: ReadonlyArray<DerivedNode>,
  done: ReadonlyArray<FieldRef>,
): Readonly<{
  order: ReadonlyArray<FieldRef>;
  cyclic: ReadonlyArray<FieldRef>;
}> =>
  pipe(
    nodes.filter((n) =>
      derivedDepsOf(nodes, n).every((d) =>
        done.some(sameRef(d)),
      ),
    ),
    (ready) =>
      ready.length === 0
        ? {
            order: done,
            cyclic: nodes.map((n) => n.ref),
          }
        : layer(
            nodes.filter(
              (n) =>
                !ready.some((r) =>
                  sameRef(r.ref)(n.ref),
                ),
            ),
            [...done, ...ready.map((n) => n.ref)],
          ),
  );

/**
 * The topological update order of a module's derived
 * fields (dependencies first) — how a consumer plans
 * recomputation (design.md §13). Empty `cyclic` after
 * verification: cycles are compile errors.
 */
export const derivedUpdateOrder = (
  m: Module,
): ReadonlyArray<FieldRef> =>
  layer(derivedNodes(m), []).order;

/**
 * The ordered recomputations a change to
 * `(entity, field)` triggers: every derived field
 * transitively depending on it, dependencies first —
 * the §13 update plan
 * (`order-item change → subtotal → total → parent`).
 */
export const updatePlanFor = (
  m: Module,
  changed: FieldRef,
): ReadonlyArray<FieldRef> =>
  pipe(derivedNodes(m), (nodes) =>
    pipe(
      reachableFrom(nodes, [changed]),
      (affected) =>
        derivedUpdateOrder(m).filter((ref) =>
          affected.some(sameRef(ref)),
        ),
    ),
  );

/**
 * The derived fields transitively invalidated by the
 * seed references (via field deps and relation
 * membership).
 */
const reachableFrom = (
  nodes: ReadonlyArray<DerivedNode>,
  seeds: ReadonlyArray<FieldRef>,
): ReadonlyArray<FieldRef> =>
  pipe(
    nodes.filter(
      (n) =>
        !seeds.some(sameRef(n.ref)) &&
        derivationDeps(n.derivation).some((d) =>
          match(d)(
            [
              fieldDep$(),
              ({ content }): boolean =>
                seeds.some(
                  sameRef(
                    fieldRef(
                      content.entity,
                      content.field,
                    ),
                  ),
                ),
            ],
            [
              relationDep$(),
              ({ content }): boolean =>
                seeds.some(
                  (s) =>
                    s.entity === content.target &&
                    s.field === "*",
                ),
            ],
          ),
        ),
    ),
    (grown) =>
      grown.length === 0
        ? seeds
        : reachableFrom(nodes, [
            ...seeds,
            ...grown.map((n) => n.ref),
          ]),
  );

/**
 * The dependency verification passes (design.md
 * §16.9, §36.6–36.8): circular derivations are
 * compile errors, an action effect must not write a
 * derived field (one source of truth), and an
 * `immediate` materialization must not depend on
 * entities outside every aggregate shared with its
 * owner.
 */
export const verifyDependencies = (
  m: Module,
): Diags => [
  ...pipe(layer(derivedNodes(m), []), (layered) =>
    layered.cyclic.flatMap((ref) =>
      derivedNodes(m)
        .filter((n) => sameRef(n.ref)(ref))
        .map((n) =>
          semError(
            codeCircularDerivation,
            `derived field ${ref.entity}.${ref.field} is part of (or depends on) a derivation cycle: ${layered.cyclic.map((c) => `${c.entity}.${c.field}`).join(" → ")}`,
            n.derivation.content.range,
          ),
        ),
    ),
  ),
  ...m.actions.flatMap((a) =>
    a.effects.flatMap((eff) =>
      entityOf(m, a.subject).flatMap((e) =>
        e.fields
          .filter(
            (f) =>
              f.derive.__tag === "Some" &&
              eff.target.text ===
                `${a.subject}.${f.name}`,
          )
          .map((f) =>
            semError(
              codeNotWritable,
              `(set ...) cannot write ${a.subject}.${f.name}: it is derived and has one source of truth`,
              eff.range,
            ),
          ),
      ),
    ),
  ),
  ...derivedNodes(m).flatMap((n) =>
    pipe(
      n.field.materialize,
      matchOption(
        (): Diags => [],
        (mode): Diags =>
          mode === "eventual"
            ? []
            : derivationDeps(n.derivation)
                .flatMap(depEntities)
                .filter(
                  (dep) =>
                    dep !== n.ref.entity &&
                    !sharesAggregate(
                      m,
                      n.ref.entity,
                      dep,
                    ),
                )
                .slice(0, 1)
                .map((dep) =>
                  semError(
                    codeIncompatibleConsistency,
                    `${n.ref.entity}.${n.ref.field} materializes immediately but depends on ${JSON.stringify(dep)} outside its aggregate`,
                    n.derivation.content.range,
                  ),
                ),
      ),
    ),
  ),
];

/**
 * Do two entities belong to one aggregate together?
 */
const sharesAggregate = (
  m: Module,
  a: SoftStr,
  b: SoftStr,
): boolean =>
  m.aggregates.some(
    (agg) =>
      [agg.root, ...agg.members].includes(a) &&
      [agg.root, ...agg.members].includes(b),
  );
