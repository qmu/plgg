/**
 * The wire contract of the ONE server seam (`POST
 * /api/answer`): the browser sends its question plus the
 * chunks its LOCAL retrieval selected; the server returns
 * the model's answer citing a subset of those chunks by
 * id. Each side receives the other's JSON as `unknown`,
 * so both directions carry casters — the boundary rule.
 */
import {
  type Obj,
  type Result,
  type InvalidError,
  cast,
  asObj,
  forProp,
  asSoftStr,
  asNum,
  asReadonlyArray,
} from "plgg";

/**
 * One retrieved chunk sent as grounding evidence — the
 * shipped index's `ChunkMeta` minus its BM25 bookkeeping.
 */
export type SourceChunk = Obj<{
  id: number;
  file: string;
  headingPath: string;
  text: string;
}>;

export const asSourceChunk = (
  v: unknown,
): Result<SourceChunk, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("id", asNum),
    forProp("file", asSoftStr),
    forProp("headingPath", asSoftStr),
    forProp("text", asSoftStr),
  );

/** What the browser posts to `/api/answer`. */
export type AnswerRequest = Obj<{
  question: string;
  chunks: ReadonlyArray<SourceChunk>;
}>;

export const asAnswerRequest = (
  v: unknown,
): Result<AnswerRequest, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("question", asSoftStr),
    forProp(
      "chunks",
      asReadonlyArray(asSourceChunk),
    ),
  );

/**
 * What the server answers with: the grounded answer text
 * and the ids of the chunks it actually used. An empty
 * `citations` is the honest "the sources do not contain
 * this" state, rendered as such — never hidden.
 */
export type GroundedAnswer = Obj<{
  answer: string;
  citations: ReadonlyArray<number>;
}>;

export const asGroundedAnswer = (
  v: unknown,
): Result<GroundedAnswer, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("answer", asSoftStr),
    forProp("citations", asReadonlyArray(asNum)),
  );
