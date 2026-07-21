import {
  test,
  check,
  all,
  toBe,
  toEqual,
  Assertion,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import {
  verifySevering,
  verifyCoverage,
} from "plgg-ir-thesis-proof/domain/usecase/verifyRebuttal";
import {
  RebuttalExample,
  flagshipRebuttal,
} from "plgg-ir-thesis-proof/domain/model/examples/rebuttal";

/**
 * Runs `f` against the flagship example, failing loudly
 * if the surface syntax ever stopped parsing it.
 */
const withExample = (
  f: (ex: RebuttalExample) => Assertion,
): Assertion =>
  pipe(
    flagshipRebuttal(),
    matchOption(
      (): Assertion =>
        check(
          "flagship example missing",
          toBe("flagship example present"),
        ),
      f,
    ),
  );

test("the flagship rebuttal compiles from the metamodel surface syntax", () =>
  withExample((ex) =>
    all([
      check(ex.target.name, toBe("撤退論")),
      check(ex.target.root, toBe("撤退判断")),
      check(
        ex.target.relations.map((r) => r.name),
        toEqual(["r1", "r2", "r3"]),
      ),
      check(
        ex.complete.attacks.map((a) => a.target),
        toEqual(["r1", "r2", "r3"]),
      ),
      check(
        ex.doctored.attacks.map((a) => a.target),
        toEqual(["r1", "r2"]),
      ),
    ]),
  ));

test("遮断 accepts the complete rebuttal", () =>
  withExample((ex) =>
    check(
      verifySevering(ex.target, ex.complete),
      toEqual([]),
    ),
  ));

test("遮断 rejects the doctored rebuttal with the surviving path 競合参入 →r3→ 撤退判断", () =>
  withExample((ex) =>
    pipe(
      verifySevering(ex.target, ex.doctored),
      (diags) =>
        all([
          check(
            diags.map((d) => d.code),
            toEqual([
              "thesis-proof.surviving-path",
            ]),
          ),
          check(
            diags.map((d) =>
              d.message.includes(
                "競合参入 →r3→ 撤退判断",
              ),
            ),
            toEqual([true]),
          ),
        ]),
    ),
  ));

test("被覆 accepts the complete rebuttal and names r3 on the doctored one", () =>
  withExample((ex) =>
    all([
      check(
        verifyCoverage(ex.target, ex.complete),
        toEqual([]),
      ),
      check(
        verifyCoverage(
          ex.target,
          ex.doctored,
        ).map((d) => d.code),
        toEqual([
          "thesis-proof.unattacked-relation",
        ]),
      ),
      check(
        verifyCoverage(ex.target, ex.doctored).map(
          (d) => d.message.includes("関係 r3"),
        ),
        toEqual([true]),
      ),
    ]),
  ));
