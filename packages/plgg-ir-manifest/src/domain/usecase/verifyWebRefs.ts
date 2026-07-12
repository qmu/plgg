import {
  SoftStr,
  Option,
  pipe,
  match,
  matchOption,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import {
  SemDiagnostic,
  nominalType,
  semTypeEquals,
  formatSemType,
  semError,
  semMismatch,
  codeTypeMismatch,
} from "plgg-ir-language";
import {
  codeUnknownPolicy,
  codeUnknownView,
  codeUnknownAction,
  codeMissingParameter,
  codeUnknownParameter,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  LayoutNode,
  NavigateNode,
  View,
  detailNode$,
  sectionNode$,
  listNode$,
  showNode$,
  actionRefNode$,
  navigateNode$,
} from "plgg-ir-manifest/domain/model/View";
import {
  ResolvedPath,
  isValueTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import {
  Module,
  policyOf,
  viewOf,
  actionOf,
} from "plgg-ir-manifest/domain/model/Module";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Every layout node of a tree, depth-first.
 */
const flattenLayout = (
  nodes: ReadonlyArray<LayoutNode>,
): ReadonlyArray<LayoutNode> =>
  nodes.flatMap((n) =>
    match(n)(
      [
        detailNode$(),
        ({
          content,
        }): ReadonlyArray<LayoutNode> => [
          n,
          ...flattenLayout(content.children),
        ],
      ],
      [
        sectionNode$(),
        ({
          content,
        }): ReadonlyArray<LayoutNode> => [
          n,
          ...flattenLayout(content.children),
        ],
      ],
      [
        listNode$(),
        ({
          content,
        }): ReadonlyArray<LayoutNode> => [
          n,
          ...flattenLayout(content.children),
        ],
      ],
      [
        showNode$(),
        (): ReadonlyArray<LayoutNode> => [n],
      ],
      [
        actionRefNode$(),
        (): ReadonlyArray<LayoutNode> => [n],
      ],
      [
        navigateNode$(),
        (): ReadonlyArray<LayoutNode> => [n],
      ],
    ),
  );

/**
 * The diagnostic for a policy reference that names no
 * declared policy.
 */
const unknownPolicy = (
  m: Module,
  name: Option<SoftStr>,
  range: SourceRange,
): Diags =>
  pipe(
    name,
    matchOption(
      (): Diags => [],
      (p: SoftStr): Diags =>
        policyOf(m, p).length > 0
          ? []
          : [
              semError(
                codeUnknownPolicy,
                `unknown policy ${JSON.stringify(p)}`,
                range,
              ),
            ],
    ),
  );

/**
 * Verifies one navigation against its target view:
 * the view must exist, every target parameter must be
 * supplied exactly once, no extra parameters, and
 * each argument's type must equal the parameter's
 * nominal type (design.md §11, §16.7).
 */
const verifyNavigate = (
  m: Module,
  nav: NavigateNode,
): Diags =>
  pipe(viewOf(m, nav.content.to), (targets) =>
    targets.length === 0
      ? [
          semError(
            codeUnknownView,
            `navigation targets unknown view ${JSON.stringify(nav.content.to)}`,
            nav.content.range,
          ),
        ]
      : targets.flatMap((target: View) => [
          ...target.parameters
            .filter(
              (p) =>
                !nav.content.args.some(
                  (a) => a.parameter === p,
                ),
            )
            .map((p) =>
              semError(
                codeMissingParameter,
                `navigation to ${JSON.stringify(target.name)} misses parameter ${JSON.stringify(p)}`,
                nav.content.range,
              ),
            ),
          ...nav.content.args.flatMap((a) =>
            !target.parameters.includes(
              a.parameter,
            )
              ? [
                  semError(
                    codeUnknownParameter,
                    `view ${JSON.stringify(target.name)} declares no parameter ${JSON.stringify(a.parameter)}`,
                    a.range,
                  ),
                ]
              : isValueTerminal(
                    a.value.terminal,
                  ) &&
                  semTypeEquals(
                    nominalType(a.parameter),
                  )(a.value.terminal.content.type)
                ? []
                : [
                    semMismatch(
                      codeTypeMismatch,
                      `parameter ${JSON.stringify(a.parameter)} needs ${a.parameter} but ${JSON.stringify(a.value.text)} is ${argTypeText(a.value)}`,
                      a.range,
                      a.parameter,
                      argTypeText(a.value),
                    ),
                  ],
          ),
        ]),
  );

/**
 * The formatted terminal type of a navigation
 * argument.
 */
const argTypeText = (
  value: ResolvedPath,
): SoftStr =>
  isValueTerminal(value.terminal)
    ? formatSemType(value.terminal.content.type)
    : "an entity";

/**
 * The module-wide cross-reference pass for the web
 * vocabulary: navigation targets and parameters,
 * layout action references, and every policy
 * reference (query `authorized-by`, action
 * `authorize`, entity `access`). References are
 * order-independent — a view may navigate to a view
 * declared later.
 */
export const verifyWebRefs = (
  m: Module,
): Diags => [
  ...m.views.flatMap((v) =>
    flattenLayout(v.layout).flatMap((n) =>
      match(n)(
        [
          navigateNode$(),
          (nav: NavigateNode): Diags =>
            verifyNavigate(m, nav),
        ],
        [
          actionRefNode$(),
          ({ content }): Diags =>
            actionOf(m, content.action).length > 0
              ? []
              : [
                  semError(
                    codeUnknownAction,
                    `layout references unknown action ${JSON.stringify(content.action)}`,
                    content.range,
                  ),
                ],
        ],
        [detailNode$(), (): Diags => []],
        [sectionNode$(), (): Diags => []],
        [listNode$(), (): Diags => []],
        [showNode$(), (): Diags => []],
      ),
    ),
  ),
  ...m.views.flatMap((v) =>
    unknownPolicy(
      m,
      v.query.authorizedBy,
      v.range,
    ),
  ),
  ...m.actions.flatMap((a) =>
    unknownPolicy(m, a.authorize, a.range),
  ),
  ...m.entities.flatMap((e) => [
    ...e.access.reads.flatMap((r) =>
      policyOf(m, r.policy).length > 0
        ? []
        : [
            semError(
              codeUnknownPolicy,
              `unknown policy ${JSON.stringify(r.policy)}`,
              r.range,
            ),
          ],
    ),
    ...e.access.updates.flatMap((u) =>
      policyOf(m, u.policy).length > 0
        ? []
        : [
            semError(
              codeUnknownPolicy,
              `unknown policy ${JSON.stringify(u.policy)}`,
              u.range,
            ),
          ],
    ),
  ]),
];
