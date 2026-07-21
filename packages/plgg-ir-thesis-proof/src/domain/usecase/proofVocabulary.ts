import { SoftStr } from "plgg";
import {
  LOGIC_KINDS,
  ATTACK_TYPES,
} from "plgg-ir-thesis";

/**
 * The closed metamodel vocabularies this worked example
 * rides — the seven ロジック kinds and the three 攻撃
 * types, imported verbatim from the `plgg-ir-thesis`
 * model so the proof is of *the metamodel's* concept and
 * not an ad-hoc re-encoding. Its only job in the scaffold
 * is to compile end-to-end against the thesis dialect;
 * the verification passes layer on in the next tickets.
 */
export const proofVocabulary =
  (): ReadonlyArray<SoftStr> => [
    ...LOGIC_KINDS,
    ...ATTACK_TYPES,
  ];
