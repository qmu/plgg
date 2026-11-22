import {
  err,
  ok,
  none,
  some,
  isSome,
  type Result,
} from "plgg";
import {
  parseSexps,
  printSexps,
  sourcePos,
  sourceRange,
  type Sexp,
  type ListExp,
} from "plgg-ir-syntax";
import {
  analyzeSexps,
  binding,
  nominalType,
  lookup,
  semError,
  fromSyntaxDiagnostic,
  type SemDiagnostic,
  type Dialect,
  type Scope,
  type Binding,
} from "plgg-ir-language";
import { readSurface } from "plgg-ir-diagram/surface";

type Atom = { value: string; exp: Sexp };
type Card = {
  kind: "node" | "group";
  id: Atom;
  label: string;
  parent?: Atom;
};
type Port = {
  kind: "port";
  owner: Atom;
  id: Atom;
  payload: Atom;
  direction: "source" | "target";
};
type End = { node: Atom; port?: Atom };
type Wire = {
  kind: "edge";
  id: Atom;
  from: End;
  to: End;
  label: string;
};
type Statement =
  | Card
  | Port
  | Wire
  | { kind: "diagram"; id: Atom };
type Checked<T> = Result<
  T,
  readonly SemDiagnostic[]
>;
const name = (exp: Sexp | undefined) =>
  exp?.__tag === "SymbolExp"
    ? { value: exp.content.name, exp }
    : undefined;
const string = (exp: Sexp | undefined) =>
  exp?.__tag === "StrExp"
    ? exp.content.value
    : undefined;
const endpoint = (
  exp: Sexp | undefined,
  side: string,
): End | undefined => {
  if (exp?.__tag !== "ListExp") return;
  const [head, n, p] = exp.content.items,
    node = name(n),
    port = name(p);
  if (
    name(head)?.value === side &&
    node &&
    (exp.content.items.length === 2 ||
      (exp.content.items.length === 3 && port))
  )
    return { node, ...(port ? { port } : {}) };
  return;
};
const decode = (
  form: ListExp,
): Checked<Statement> => {
  const [h, a, b, c, d] = form.content.items,
    kind = name(h)?.value,
    id = name(a),
    len = form.content.items.length;
  if (kind === "diagram" && id && len === 2)
    return ok({ kind, id });
  if (
    (kind === "node" || kind === "group") &&
    id &&
    string(b) !== undefined &&
    (len === 3 || (len === 4 && name(c)))
  )
    return ok({
      kind,
      id,
      label: string(b)!,
      ...(c ? { parent: name(c)! } : {}),
    });
  if (
    (kind === "in" || kind === "out") &&
    id &&
    name(b) &&
    name(c) &&
    len === 4
  )
    return ok({
      kind: "port",
      owner: id,
      id: name(b)!,
      payload: name(c)!,
      direction:
        kind === "in" ? "target" : "source",
    });
  if (
    kind === "edge" &&
    a &&
    (id || string(a) === "") &&
    (len === 4 ||
      (len === 5 && string(d) !== undefined))
  ) {
    const from = endpoint(b, "from"),
      to = endpoint(c, "to");
    if (from && to)
      return ok({
        kind,
        id: id ?? {
          value:
            "@" +
            JSON.stringify([
              from.node.value,
              from.port?.value,
              to.node.value,
              to.port?.value,
            ]),
          exp: a,
        },
        from,
        to,
        label: string(d) ?? "",
      });
  }
  return err([
    semError(
      "diagram.form",
      "図面の形式が正しくありません: " + kind,
      form.content.range,
    ),
  ]);
};
const declarations = (
  s: Statement,
): Binding[] => {
  const bind = (kind: string, id: Atom) =>
    binding(
      kind,
      id.value,
      none(),
      id.exp.content.range,
    );
  switch (s.kind) {
    case "diagram":
      return [
        binding(
          "diagram",
          "root",
          none(),
          s.id.exp.content.range,
        ),
      ];
    case "group":
      return [
        bind("group", s.id),
        bind("card", s.id),
      ];
    case "node":
      return [bind("card", s.id)];
    case "edge":
      return [bind("edge", s.id)];
    case "port":
      return [
        bind("port/" + s.owner.value, s.id),
        binding(
          s.direction + "/" + s.owner.value,
          s.id.value,
          some(nominalType(s.payload.value)),
          s.id.exp.content.range,
        ),
      ];
  }
};
const validate = (
  s: Statement,
  scope: Scope,
): Checked<Statement> => {
  const errors: SemDiagnostic[] = [];
  const ref = (kind: string, id: Atom) => {
    const found = lookup(kind, id.value)(scope);
    if (isSome(found)) return found.content;
    const names = scope.bindings
      .filter((b) => b.kind === kind)
      .map((b) => b.name);
    errors.push(
      semError(
        "diagram.reference",
        id.value +
          " は未定義です" +
          (names.length
            ? "（候補 " + names.join(", ") + "）"
            : ""),
        id.exp.content.range,
      ),
    );
    return;
  };
  if (
    (s.kind === "node" || s.kind === "group") &&
    s.parent
  )
    ref("group", s.parent);
  if (s.kind === "port") ref("card", s.owner);
  if (s.kind === "edge") {
    const resolve = (end: End, dir: string) => {
      if (!ref("card", end.node) || !end.port)
        return;
      const type = ref(
        dir + "/" + end.node.value,
        end.port,
      )?.type;
      return type &&
        isSome(type) &&
        type.content.__tag === "NominalType"
        ? type.content.content.name
        : undefined;
    };
    const a = resolve(s.from, "source"),
      b = resolve(s.to, "target");
    if (a && b && a !== b)
      errors.push(
        semError(
          "diagram.payload",
          a + " を " + b + " に接続できません",
          s.to.port!.exp.content.range,
        ),
      );
  }
  return errors.length ? err(errors) : ok(s);
};
export const diagramDialect: Dialect<Statement> =
  {
    name: "diagram",
    operators: [],
    expanders: [],
    normalizers: [],
    forms: [
      "diagram",
      "group",
      "node",
      "in",
      "out",
      "edge",
    ].map((name) => ({
      name,
      declare: (form) => {
        const r = decode(form);
        return r.__tag === "Err"
          ? ok([])
          : ok(declarations(r.content));
      },
      analyze: (form, ctx) => {
        const r = decode(form);
        return r.__tag === "Err"
          ? r
          : validate(r.content, ctx.scope);
      },
    })),
  };
export const compileDiagram = (
  source: string,
) => {
  const origin = sourcePos(0, 1, 1),
    range = sourceRange(origin, origin);
  if (source.length > 65536)
    return err([
      semError(
        "diagram.size",
        "図のソースが長すぎます",
        range,
      ),
    ]);
  const read = () => {
    if (!source.trimStart().startsWith("("))
      return readSurface(source);
    try {
      return parseSexps(source);
    } catch (e) {
      if (e instanceof RangeError)
        return err([
          semError(
            "diagram.size",
            "IR の式が大きすぎます",
            range,
          ),
        ]);
      throw e;
    }
  };
  const forms = read();
  if (forms.__tag === "Err")
    return err(
      forms.content.map((d) =>
        "related" in d
          ? d
          : fromSyntaxDiagnostic(d),
      ),
    );
  const result = analyzeSexps(diagramDialect)(
    forms.content,
  );
  if (result.__tag === "Err") return result;
  const rows = result.content,
    header = rows.find(
      (r) => r.kind === "diagram",
    );
  if (header?.kind !== "diagram")
    return err([
      semError(
        "diagram.header",
        "diagram が必要です",
        range,
      ),
    ]);
  const cards = rows.filter(
    (r): r is Card =>
      r.kind === "node" || r.kind === "group",
  );
  const groups = new Map(
    cards
      .filter((r) => r.kind === "group")
      .map((r) => [r.id.value, r.parent]),
  );
  for (const card of cards) {
    const seen = new Set<string>();
    let parent = card.parent;
    while (parent) {
      if (seen.has(parent.value))
        return err([
          semError(
            "diagram.cycle",
            "グループが循環しています",
            parent.exp.content.range,
          ),
        ]);
      seen.add(parent.value);
      parent = groups.get(parent.value);
    }
  }
  const ports = rows.filter(
    (r): r is Port => r.kind === "port",
  );
  return ok({
    id: header.id.value,
    ir: printSexps(forms.content),
    nodes: cards.map((c) => ({
      id: c.id.value,
      label: c.label,
      group: c.kind === "group",
      ...(c.parent
        ? { parent: c.parent.value }
        : {}),
      ports: ports
        .filter(
          (p) => p.owner.value === c.id.value,
        )
        .map((p) => ({
          id: p.id.value,
          direction: p.direction,
          payload: p.payload.value,
        })),
    })),
    edges: rows.flatMap((r) =>
      r.kind === "edge"
        ? [
            {
              id: r.id.value,
              source: r.from.node.value,
              target: r.to.node.value,
              ...(r.from.port
                ? {
                    sourceHandle:
                      r.from.port.value,
                  }
                : {}),
              ...(r.to.port
                ? {
                    targetHandle: r.to.port.value,
                  }
                : {}),
              label: r.label,
            },
          ]
        : [],
    ),
  });
};
export type Diagram = Extract<
  ReturnType<typeof compileDiagram>,
  { __tag: "Ok" }
>["content"];
