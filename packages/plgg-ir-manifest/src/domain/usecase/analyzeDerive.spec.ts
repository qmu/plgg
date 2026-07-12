import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  Module,
  fieldRef,
} from "plgg-ir-manifest/domain/model";
import {
  derivedUpdateOrder,
  updatePlanFor,
} from "plgg-ir-manifest/domain/usecase/verifyDependencies";
import {
  CompiledManifest,
  compileManifest,
} from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * The §13 order/order-item world: subtotal sums up,
 * tax derives from subtotal × rate, both inside one
 * aggregate.
 */
const ORDER_WORLD = `
(entity order
  (field total (type (money JPY))
    (derive (sum (children items subtotal)))
    (materialize (consistency immediate)))
  (field tax-rate (type percentage))
  (field tax (type (money JPY))
    (derive (* total tax-rate)))
  (field item-count (type integer)
    (derive (count order.items)))
  (relation items (target order-item) (cardinality many) (inverse order)))
(entity order-item
  (field subtotal (type (money JPY)))
  (relation order (target order) (cardinality one) (inverse items)))
(aggregate order-aggregate
  (root order)
  (members order-item)
  (consistency immediate))
`;

/**
 * Compiles the order world plus extra children,
 * mapping the outcome to codes (`["ok"]` on success).
 */
const codesWith = (
  extra: string,
): ReadonlyArray<string> =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${ORDER_WORLD} ${extra}))`,
    ),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        diags.map((d) => d.code),
      (): ReadonlyArray<string> => ["ok"],
    ),
  );

/**
 * The compiled order-world module (assumed valid).
 */
const moduleOf = (
  extra: string,
): ReadonlyArray<Module> =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${ORDER_WORLD} ${extra}))`,
    ),
    matchResult(
      (): ReadonlyArray<Module> => [],
      (m: CompiledManifest) => [m.module],
    ),
  );

test("the §13 derivation world compiles", () =>
  check(codesWith(""), toEqual(["ok"])));

test("derivations attach to the model with their dependencies", () =>
  check(
    moduleOf("").flatMap((m) =>
      m.entities.flatMap((e) =>
        e.fields.flatMap((f) =>
          f.derive.__tag === "Some"
            ? [
                [
                  `${e.name}.${f.name}`,
                  f.derive.content.__tag,
                  f.materialize.__tag,
                ],
              ]
            : [],
        ),
      ),
    ),
    toEqual([
      ["order.total", "SumDerivation", "Some"],
      ["order.tax", "ExprDerivation", "None"],
      [
        "order.item-count",
        "CountDerivation",
        "None",
      ],
    ]),
  ));

test("the update order puts dependencies first (§13)", () =>
  check(
    moduleOf("").flatMap((m) =>
      derivedUpdateOrder(m).map(
        (r) => `${r.entity}.${r.field}`,
      ),
    ),
    toEqual([
      "order.total",
      "order.item-count",
      "order.tax",
    ]),
  ));

test("a subtotal change triggers total then tax (§13)", () =>
  all([
    check(
      moduleOf("").flatMap((m) =>
        updatePlanFor(
          m,
          fieldRef("order-item", "subtotal"),
        ).map((r) => `${r.entity}.${r.field}`),
      ),
      toEqual(["order.total", "order.tax"]),
    ),
    // relation membership change (the count/sum)
    check(
      moduleOf("").flatMap((m) =>
        updatePlanFor(
          m,
          fieldRef("order-item", "*"),
        ).map((r) => `${r.entity}.${r.field}`),
      ),
      toEqual([
        "order.total",
        "order.item-count",
        "order.tax",
      ]),
    ),
  ]));

test("circular derivations are compile errors (§36.8)", () =>
  all([
    check(
      codesWith(`
(entity loop
  (field a (type integer) (derive (+ b 1)))
  (field b (type integer) (derive (+ a 1))))
`),
      toEqual([
        "manifest.derive.circular",
        "manifest.derive.circular",
      ]),
    ),
    check(
      codesWith(`
(entity loop
  (field a (type integer) (derive (+ a 1))))
`),
      toEqual(["manifest.derive.circular"]),
    ),
  ]));

test("derived fields are not writable by effects (§36.6)", () =>
  check(
    codesWith(`
(policy anyone (allows (has-role actor "admin")))
(action tamper
  (subject order)
  (input (field amount (type (money JPY))))
  (authorize (policy anyone))
  (effect (set order.total input.amount)))
`),
    toEqual(["manifest.derive.not-writable"]),
  ));

test("immediate materialization must stay inside the aggregate (§16.9)", () =>
  all([
    check(
      codesWith(`
(entity outsider
  (field score (type integer))
  (relation order (target order) (cardinality one)))
(entity watcher
  (field cached (type integer)
    (derive (count watcher.subjects))
    (materialize (consistency immediate)))
  (relation subjects (target outsider) (cardinality many)))
`),
      toEqual([
        "manifest.derive.incompatible-consistency",
      ]),
    ),
    // eventual consistency may cross freely
    check(
      codesWith(`
(entity outsider
  (field score (type integer))
  (relation order (target order) (cardinality one)))
(entity watcher
  (field cached (type integer)
    (derive (count watcher.subjects))
    (materialize (consistency eventual)))
  (relation subjects (target outsider) (cardinality many)))
`),
      toEqual(["ok"]),
    ),
  ]));

test("derive declarations are a closed, typed vocabulary", () =>
  all([
    check(
      codesWith(`
(entity bad
  (field x (type integer) (materialize (consistency immediate))))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (+ 1 1)) (derive (+ 2 2))))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive)))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (+ 1 1)) (materialize)))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (count bad.ghost))))
`),
      toEqual(["manifest.path.unknown"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer))
  (field y (type integer) (derive (count bad.x))))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    // count into a string field
    check(
      codesWith(`
(entity bad
  (field x (type string) (derive (count bad.things)))
  (relation things (target order) (cardinality many)))
`),
      toEqual(["language.type-mismatch"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (sum 5))))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (sum (children ghost subtotal)))))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (sum (children things ghost))))
  (relation things (target order-item) (cardinality many)))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (sum (children things))))
  (relation things (target order-item) (cardinality many)))
`),
      toEqual(["manifest.derive.malformed"]),
    ),
    // summing a money member into an integer field
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (sum (children things subtotal))))
  (relation things (target order-item) (cardinality many)))
`),
      toEqual(["language.type-mismatch"]),
    ),
    // Money<JPY> × Percentage is fine; string × rate is not
    check(
      codesWith(`
(entity bad
  (field label (type string))
  (field x (type (money JPY)) (derive (* label tax)))
  (field tax (type percentage)))
`),
      toEqual(["language.type-mismatch"]),
    ),
    check(
      codesWith(`
(entity bad
  (field x (type integer) (derive (+ ghost 1))))
`),
      toEqual(["language.unknown-name"]),
    ),
  ]));

test("action input fields cannot derive", () =>
  check(
    codesWith(`
(policy anyone (allows (has-role actor "admin")))
(action a
  (subject order)
  (authorize (policy anyone))
  (input (field x (type integer) (derive (+ 1 1)))))
`),
    toEqual(["manifest.field.malformed"]),
  ));
