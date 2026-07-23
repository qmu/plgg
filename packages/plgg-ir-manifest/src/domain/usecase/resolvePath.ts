import {
  SoftStr,
  Result,
  ok,
  err,
  pipe,
  match,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import {
  SemDiagnostic,
  nominalType,
  semError,
} from "plgg-ir-language";
import {
  codeUnknownPath,
  codeNotProjected,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Entity,
  fieldOf,
  relationOf,
} from "plgg-ir-manifest/domain/model/Entity";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";
import {
  PathRoot,
  PathPrefix,
  EntityRoot,
  FieldsRoot,
  ActorRoot,
  ProjectionRoot,
  ResolvedPath,
  resolvedPath,
  valueTerminal,
  entityTerminal,
  entityRoot$,
  fieldsRoot$,
  actorRoot$,
  projectionRoot$,
} from "plgg-ir-manifest/domain/model/Path";

type Diags = ReadonlyArray<SemDiagnostic>;
type Resolved = Result<ResolvedPath, Diags>;

/**
 * The diagnostic for an unresolvable path.
 */
const unknownPath = (
  text: SoftStr,
  detail: SoftStr,
  range: SourceRange,
): Diags => [
  semError(
    codeUnknownPath,
    `path ${JSON.stringify(text)} does not resolve: ${detail}`,
    range,
  ),
];

/**
 * Walks the segments after an entity root: relations
 * continue (recording the crossed prefix and `many`
 * hops), a field must be last (design.md §14 — the
 * entity graph is what is structurally related).
 */
const walkEntity = (
  m: Module,
  text: SoftStr,
  range: SourceRange,
  root: SoftStr,
  e: Entity,
  segments: ReadonlyArray<SoftStr>,
  soFar: SoftStr,
  prefixes: ReadonlyArray<PathPrefix>,
  throughMany: boolean,
): Resolved =>
  segments.length === 0
    ? ok(
        resolvedPath(
          text,
          root,
          prefixes,
          throughMany,
          entityTerminal(
            e.name,
            throughMany ? "many" : "one",
          ),
          range,
        ),
      )
    : pipe(
        segments
          .slice(0, 1)
          .reduce((_, s) => s, ""),
        (seg: SoftStr): Resolved =>
          fieldOf(e, seg).length > 0
            ? segments.length === 1
              ? pipe(
                  fieldOf(e, seg)
                    .slice(0, 1)
                    .map((f) => f.type)
                    .reduce(
                      (_, t) => t,
                      nominalType(seg),
                    ),
                  (type) =>
                    ok(
                      resolvedPath(
                        text,
                        root,
                        prefixes,
                        throughMany,
                        valueTerminal(type),
                        range,
                      ),
                    ),
                )
              : err(
                  unknownPath(
                    text,
                    `${JSON.stringify(seg)} is a field of ${JSON.stringify(e.name)} and cannot be traversed`,
                    range,
                  ),
                )
            : relationOf(e, seg).length > 0
              ? relationOf(e, seg)
                  .slice(0, 1)
                  .map((r) =>
                    pipe(
                      entityOf(m, r.target),
                      (targets) =>
                        targets.length === 0
                          ? err(
                              unknownPath(
                                text,
                                `relation ${JSON.stringify(seg)} targets unknown entity ${JSON.stringify(r.target)}`,
                                range,
                              ),
                            )
                          : targets
                              .map((target) =>
                                walkEntity(
                                  m,
                                  text,
                                  range,
                                  root,
                                  target,
                                  segments.slice(
                                    1,
                                  ),
                                  `${soFar}.${seg}`,
                                  [
                                    ...prefixes,
                                    {
                                      text: `${soFar}.${seg}`,
                                      entity:
                                        r.target,
                                    },
                                  ],
                                  throughMany ||
                                    r.cardinality ===
                                      "many",
                                ),
                              )
                              .reduce(
                                (_, r2) => r2,
                                err(
                                  unknownPath(
                                    text,
                                    "unreachable",
                                    range,
                                  ),
                                ),
                              ),
                    ),
                  )
                  .reduce(
                    (_, r2) => r2,
                    err(
                      unknownPath(
                        text,
                        "unreachable",
                        range,
                      ),
                    ),
                  )
              : err(
                  unknownPath(
                    text,
                    `${JSON.stringify(seg)} is neither a field nor a relation of ${JSON.stringify(e.name)}`,
                    range,
                  ),
                ),
      );

/**
 * Resolves one dotted path against the available
 * roots (design.md §14–15). The root namespace
 * decides the walk: entity aliases traverse the
 * entity graph, `input` reaches its fields, `actor.f`
 * carries the nominal type `f`, and a projection
 * alias exposes ONLY its projected fields
 * (`manifest.projection.not-exposed` otherwise).
 */
export const resolvePath =
  (m: Module, roots: ReadonlyArray<PathRoot>) =>
  (text: SoftStr, range: SourceRange): Resolved =>
    pipe(text.split("."), (segments) =>
      pipe(
        roots.filter((r) =>
          segments
            .slice(0, 1)
            .some((s) => rootName(r) === s),
        ),
        (matched) =>
          matched.length === 0
            ? err(
                unknownPath(
                  text,
                  `unknown root ${JSON.stringify(
                    segments.slice(0, 1).join(""),
                  )}`,
                  range,
                ),
              )
            : matched
                .slice(0, 1)
                .map((r) =>
                  resolveFrom(m)(
                    r,
                    text,
                    segments.slice(1),
                    range,
                  ),
                )
                .reduce(
                  (_, r2) => r2,
                  err(
                    unknownPath(
                      text,
                      "unreachable",
                      range,
                    ),
                  ),
                ),
      ),
    );

/**
 * The alias name of a root.
 */
export const rootName = (r: PathRoot): SoftStr =>
  match(r)(
    [
      entityRoot$(),
      ({ content }): SoftStr => content.name,
    ],
    [
      fieldsRoot$(),
      ({ content }): SoftStr => content.name,
    ],
    [
      actorRoot$(),
      ({ content }): SoftStr => content.name,
    ],
    [
      projectionRoot$(),
      ({ content }): SoftStr => content.name,
    ],
  );

/**
 * Resolves the remaining segments from a matched
 * root.
 */
const resolveFrom =
  (m: Module) =>
  (
    r: PathRoot,
    text: SoftStr,
    rest: ReadonlyArray<SoftStr>,
    range: SourceRange,
  ): Resolved =>
    match(r)(
      [
        entityRoot$(),
        ({ content }: EntityRoot): Resolved =>
          pipe(
            entityOf(m, content.entity),
            (entities) =>
              entities.length === 0
                ? err(
                    unknownPath(
                      text,
                      `root ${JSON.stringify(content.name)} is bound to unknown entity ${JSON.stringify(content.entity)}`,
                      range,
                    ),
                  )
                : entities
                    .map((e) =>
                      walkEntity(
                        m,
                        text,
                        range,
                        content.name,
                        e,
                        rest,
                        content.name,
                        [],
                        false,
                      ),
                    )
                    .reduce(
                      (_, r2) => r2,
                      err(
                        unknownPath(
                          text,
                          "unreachable",
                          range,
                        ),
                      ),
                    ),
          ),
      ],
      [
        fieldsRoot$(),
        ({ content }: FieldsRoot): Resolved =>
          rest.length === 1 &&
          content.fields.some((f) =>
            rest.some((s) => f.name === s),
          )
            ? pipe(
                content.fields
                  .filter((f) =>
                    rest.some(
                      (s) => f.name === s,
                    ),
                  )
                  .slice(0, 1)
                  .map((f) => f.type)
                  .reduce(
                    (_, t) => t,
                    nominalType(text),
                  ),
                (type) =>
                  ok(
                    resolvedPath(
                      text,
                      content.name,
                      [],
                      false,
                      valueTerminal(type),
                      range,
                    ),
                  ),
              )
            : err(
                unknownPath(
                  text,
                  `${JSON.stringify(content.name)} exposes only its declared fields`,
                  range,
                ),
              ),
      ],
      [
        actorRoot$(),
        ({ content }: ActorRoot): Resolved =>
          rest.length === 1
            ? ok(
                resolvedPath(
                  text,
                  content.name,
                  [],
                  false,
                  valueTerminal(
                    nominalType(
                      rest.slice(0, 1).join(""),
                    ),
                  ),
                  range,
                ),
              )
            : err(
                unknownPath(
                  text,
                  "actor paths are actor.<attribute>",
                  range,
                ),
              ),
      ],
      [
        projectionRoot$(),
        ({
          content,
        }: ProjectionRoot): Resolved =>
          rest.length === 1 &&
          content.projection.fields.some((f) =>
            rest.some((s) => f.name === s),
          )
            ? pipe(
                content.projection.fields
                  .filter((f) =>
                    rest.some(
                      (s) => f.name === s,
                    ),
                  )
                  .slice(0, 1)
                  .map((f) => f.type)
                  .reduce(
                    (_, t) => t,
                    nominalType(text),
                  ),
                (type) =>
                  ok(
                    resolvedPath(
                      text,
                      content.name,
                      [],
                      false,
                      valueTerminal(type),
                      range,
                    ),
                  ),
              )
            : err([
                semError(
                  codeNotProjected,
                  `${JSON.stringify(rest.join("."))} is not exposed by projection ${JSON.stringify(content.projection.name)}`,
                  range,
                ),
              ]),
      ],
    );
