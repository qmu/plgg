import { err, ok, type Result } from "plgg";
import {
  initState,
  literal,
  advance,
} from "plgg-parser";
import {
  symbolExp,
  strExp,
  listExp,
  sourcePos,
  sourceRange,
  type Sexp,
  type SourceRange,
  type SymbolExp,
} from "plgg-ir-syntax";
import {
  semError,
  type SemDiagnostic,
} from "plgg-ir-language";

class SyntaxIssue extends Error {
  readonly diagnostic: SemDiagnostic;
  constructor(diagnostic: SemDiagnostic) {
    super(diagnostic.message);
    this.diagnostic = diagnostic;
  }
}

/** Lower surface forms directly to ranged IR. Offsets use the same UTF-16 units as textarea selections. */
export const readSurface = (
  source: string,
): Result<
  readonly Sexp[],
  readonly SemDiagnostic[]
> => {
  let cursor = initState(source, undefined),
    pos = sourcePos(0, 1, 1);
  const forms: Sexp[] = [];
  const consume = (value: string) => {
    const start = pos,
      lines = value.split("\n");
    pos = sourcePos(
      start.offset + value.length,
      start.line + lines.length - 1,
      lines.length === 1
        ? start.column + value.length
        : lines[lines.length - 1]!.length + 1,
    );
    cursor = advance(value.length)(cursor);
    return sourceRange(start, pos);
  };
  const match = (pattern: RegExp) => {
    pattern.lastIndex = cursor.position;
    return pattern.exec(source)?.[0];
  };
  const space = () => {
    const s = match(/(?:\s+|\/\/[^\n]*)+/y);
    if (s) consume(s);
  };
  const issue = (message: string): never => {
    throw new SyntaxIssue(
      semError(
        "diagram.syntax",
        message,
        sourceRange(pos, pos),
      ),
    );
  };
  const take = (s: string) => {
    space();
    return literal(s)(cursor).__tag === "Ok"
      ? consume(s)
      : undefined;
  };
  const need = (s: string) =>
    take(s) ?? issue(s + " が必要です");
  const identifier = (): SymbolExp => {
    space();
    const s =
      match(
        /[\p{L}_][\p{L}\p{N}_]*(?:-[\p{L}\p{N}_]+)*/uy,
      ) ?? issue("ID が必要です");
    return symbolExp(s, consume(s));
  };
  const label = () => {
    space();
    if (source[cursor.position] !== '"')
      return undefined;
    const token =
      match(
        /"(?:[^"\\\r\n]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y,
      ) ??
      issue(
        "文字列の引用符またはエスケープを確認してください",
      );
    const value: unknown = JSON.parse(token);
    return typeof value === "string"
      ? strExp(value, consume(token))
      : issue("文字列が必要です");
  };
  const emit = (
    head: string,
    range: SourceRange,
    items: readonly Sexp[],
  ) =>
    listExp(
      [symbolExp(head, range), ...items],
      sourceRange(range.start, pos),
    );
  const endpoint = (
    side: string,
    id: SymbolExp,
  ) =>
    emit(
      side,
      id.content.range,
      take(".") ? [id, identifier()] : [id],
    );
  const statements = (
    parent: SymbolExp | undefined,
    depth: number,
  ) => {
    if (depth > 64)
      issue("グループは64階層までです");
    while (!take("}")) {
      const head = identifier(),
        word = head.content.name,
        range = head.content.range;
      if (word === "group" || word === "node") {
        const id = identifier(),
          title =
            label() ??
            strExp(
              id.content.name,
              id.content.range,
            );
        forms.push(
          emit(word, range, [
            id,
            title,
            ...(parent ? [parent] : []),
          ]),
        );
        if (word === "group") {
          need("{");
          statements(id, depth + 1);
        } else if (take("{")) {
          while (!take("}")) {
            const dir = identifier();
            if (
              dir.content.name !== "in" &&
              dir.content.name !== "out"
            )
              issue(
                "ポートには in または out を指定してください",
              );
            const port = identifier();
            need(":");
            forms.push(
              emit(
                dir.content.name,
                dir.content.range,
                [id, port, identifier()],
              ),
            );
          }
        }
      } else {
        const edgeId =
          word === "edge"
            ? identifier()
            : undefined;
        if (edgeId) need(":");
        const from = endpoint(
          "from",
          edgeId ? identifier() : head,
        );
        need("->");
        const to = endpoint("to", identifier()),
          title = label();
        forms.push(
          emit("edge", range, [
            edgeId ?? strExp("", range),
            from,
            to,
            ...(title ? [title] : []),
          ]),
        );
      }
    }
  };
  try {
    const head = identifier();
    if (head.content.name !== "diagram")
      issue("diagram で始めてください");
    forms.push(
      emit("diagram", head.content.range, [
        identifier(),
      ]),
    );
    need("{");
    statements(undefined, 0);
    space();
    if (cursor.position !== source.length)
      issue("図面の後に余分な入力があります");
    return ok(forms);
  } catch (e) {
    if (e instanceof SyntaxIssue)
      return err([e.diagnostic]);
    throw e;
  }
};
