import {
  ok,
  none,
  pipe,
  matchOption,
  mapResult,
} from "plgg";
import {
  Binding,
  FormDef,
  binding,
} from "plgg-ir-language";
import {
  ThesisNode,
  assertionNode,
  frameNode,
} from "plgg-ir-thesis/domain/model";
import { symbolArg } from "plgg-ir-thesis/domain/usecase/sexpUtil";
import { analyzeAssertion } from "plgg-ir-thesis/domain/usecase/analyzeAssertion";
import { analyzeFrame } from "plgg-ir-thesis/domain/usecase/analyzeFrame";

/**
 * The `主張` (assertion) form. `declare` (pass 1)
 * registers the assertion's name so a duplicate `主張`
 * across the source is diagnosed by the framework and a
 * frame's endpoint can resolve it; `analyze` (pass 2)
 * parses and pass-①-checks it into an
 * {@link assertionNode}.
 */
export const assertionForm: FormDef<ThesisNode> =
  {
    name: "主張",
    declare: (form) =>
      pipe(
        symbolArg(form, 1),
        matchOption(
          () => ok<ReadonlyArray<Binding>>([]),
          (name) =>
            ok<ReadonlyArray<Binding>>([
              binding(
                "主張",
                name.content.name,
                none(),
                name.content.range,
              ),
            ]),
        ),
      ),
    analyze: (form) =>
      pipe(
        analyzeAssertion(form),
        mapResult(assertionNode),
      ),
  };

/**
 * The `フレーム` (frame) form. `declare` registers the
 * frame's name; `analyze` parses and pass-①-checks it
 * into a {@link frameNode}.
 */
export const frameForm: FormDef<ThesisNode> = {
  name: "フレーム",
  declare: (form) =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        () => ok<ReadonlyArray<Binding>>([]),
        (name) =>
          ok<ReadonlyArray<Binding>>([
            binding(
              "フレーム",
              name.content.name,
              none(),
              name.content.range,
            ),
          ]),
      ),
    ),
  analyze: (form) =>
    pipe(
      analyzeFrame(form),
      mapResult(frameNode),
    ),
};
