import {
  exposeGroupInputs,
  factorFanout,
} from "plgg-flow";
import { templateTools } from "./templateTools";
import {
  simplifyInk,
  annotate,
  reply,
  importReviews,
  exportReviews,
  reanchorReview,
  assignReview,
  resolve,
} from "plgg-flow/annotations";
import {
  arrangeHierarchy,
  radialLayout,
  registerBranch,
  transferLayout,
  packComponents,
  orderByNeighbors,
  relaxWiring,
  swimlaneLayout,
} from "plgg-flow/layout";
import {
  routeOnPlane,
  simplifyWiring,
  bundleFanout,
  routeAroundNodes,
} from "plgg-flow/routing";
import {
  compareReachability,
  layoutDisplacements,
  restoreCardFields,
  revisionDrawing,
  diffGraph,
  mergeRevision,
  summarizePatch,
} from "plgg-flow/revisions";
import {
  rebaseOrigin,
  proximityTree,
  nodesInRadius,
  sectionGraph,
  worldBounds,
  type SpatialView,
} from "plgg-flow/spatial";
import {
  inferPortContracts,
  eligibleTargets,
  relieveInputCapacity,
  transferWires,
  matchTypedPorts,
  connectBatch,
  configurePort,
  addPort,
  removePort,
  mergePorts,
  swapWiringRoles,
  describePort,
  orderPorts,
  renamePort,
  reconnect,
  edgeIndex,
  type Port,
} from "plgg-flow/connections";
import { isErr, some, isSome } from "plgg";
import {
  el,
  attr,
  onChange,
  onClick,
  onInput,
  text,
  type Html,
} from "plgg-view";
import {
  fitWire,
  pruneEmptyGroups,
  setBranchDistance,
} from "plgg-flow/model";
import { createFlow, fitFlow } from "plgg-flow";
import {
  saveStructuralCopy,
  saveDrawing,
  dependenciesFromField,
  hierarchyFromField,
  loadDrawing,
  importReactFlow,
  exportReactFlow,
  inspectGraph,
} from "plgg-flow/interchange";
import {
  formatNodeLabels,
  joinNodeData,
  migrateDataKeys,
  patchNodeData,
  replaceNodeType,
  stitchDrawing,
  bindModuleTerminals,
  extractModule,
  extract,
  paste,
  mergeNodes,
  reverseConnections,
  reduceTransitive,
  alignNodes,
  distribute,
  transformSelection,
  lockNodes,
  conceal,
  renameFlowIdentity,
  relabel,
} from "plgg-flow/edits";
import {
  components,
  shortestPath,
  adjacency,
} from "plgg-flow/topology";
import {
  visibleScene,
  hoistSetting,
  reparentWithSettings,
  groupSerialRuns,
  partitionCards,
  groupByAttribute,
  adoptByBounds,
  detachBoundary,
  swapBranches,
  fitContainer,
  rerootGroup,
  commonContainer,
  revealNode,
  subtree,
  reparent,
} from "plgg-flow/hierarchy";

import {
  info,
  apply,
  choose,
  ids,
  graphCommand,
  type ToolState,
  type ToolEdit,
  type ToolContext,
  type Command,
} from "./toolContext";
export {
  toolState,
  type ToolState,
  type ToolEdit,
} from "./toolContext";
import { analysisTools } from "./analysisTools";
const axis = (v: string) =>
  v === "y" ? "y" : v === "z" ? "z" : "x";
const decodePort = (
  arg: string,
): Port | undefined => {
  const [direction, ...parts] = arg.split(":");
  const id = parts.join(":").trim();
  return (direction === "source" ||
    direction === "target") &&
    id
    ? { direction, id }
    : undefined;
};
const spatial = (
  c: ToolContext,
  view: SpatialView,
  report: string,
) =>
  info(
    { ...c, flow: { ...c.flow, spatial: view } },
    report,
  );
const measure =
  (kind: "distance" | "angle"): ToolEdit =>
  (c) => {
    const nodes = ids(c),
      need = kind === "angle" ? 3 : 2;
    if (nodes.length !== need)
      return info(
        c,
        need + " 点を順に選択してください",
      );
    const view = c.flow.spatial ?? {},
      dimensions = view.dimensions ?? [];
    return spatial(
      c,
      {
        ...view,
        dimensions: [
          ...dimensions,
          { kind, nodes },
        ],
      },
      "寸法を追加しました",
    );
  };
const tools: readonly Command[] = [
  {
    id: "adopt-by-bounds",
    name: "囲んでいるグループに自動所属",
    section: "構造編集",
    run: (c) => {
      const [id, ...rest] = ids(c);
      if (!id || rest.length)
        return info(
          c,
          "所属先を決める枝を一つ選択してください",
        );
      const next = adoptByBounds(c.flow, id);
      return next === c.flow
        ? info(c, "所属先の変更はありません")
        : apply(c, next);
    },
  },
  {
    id: "detach-boundary",
    name: "選択した枝を外部配線から切り離す",
    section: "構造編集",
    run: (c) => {
      const roots = ids(c);
      if (!roots.length)
        return info(
          c,
          "切り離す枝を選択してください",
        );
      const graph = detachBoundary(c.flow, roots);
      if (graph === c.flow)
        return info(
          c,
          "境界をまたぐ配線はありません",
        );
      const { activeEdge, ...flow } = c.flow;
      return info(
        {
          ...c,
          flow: {
            ...flow,
            edges: graph.edges,
            ...(activeEdge &&
            graph.edges.includes(activeEdge)
              ? { activeEdge }
              : {}),
          },
        },
        c.flow.edges.length -
          graph.edges.length +
          " 本の境界配線を切り離しました",
      );
    },
  },
  {
    id: "swap-branches",
    name: "兄弟の枝の位置を交換",
    section: "配置",
    run: (c) => {
      const [a, b, ...rest] = ids(c);
      if (!a || !b || rest.length)
        return info(
          c,
          "同じ階層のノードを二つ選択してください",
        );
      const next = swapBranches(c.flow, a, b);
      return next === c.flow
        ? info(
            c,
            "同じ親を持ち、固定されておらず、移動範囲に収まる枝を選択してください",
          )
        : apply(c, next);
    },
  },
  {
    id: "format-labels",
    name: "設定項目からカード名を生成",
    section: "構造編集",
    argument: "表示形式（例：{品番} / {名称}）",
    run: (c) => {
      const selected = ids(c);
      if (!selected.length)
        return info(
          c,
          "名前を更新するカードを選択してください",
        );
      const result = formatNodeLabels(
        c.flow,
        selected,
        c.tools.argument,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "join-node-data",
    name: "別図面の設定を業務キーで照合して取り込む",
    section: "移行・保存",
    argument:
      "照合する data の項目名（文字列または数値）",
    document: true,
    run: (c) => {
      const donor = loadDrawing(c.tools.document);
      if (isErr(donor))
        return info(c, donor.content);
      const result = joinNodeData(
        c.flow,
        donor.content,
        c.tools.argument.trim(),
      );
      if (isErr(result))
        return info(c, result.content);
      const count = result.content.nodes.filter(
        (n, i) => n !== c.flow.nodes[i],
      ).length;
      return info(
        apply(c, result.content),
        count + " 件の設定を取り込みました",
      );
    },
  },
  {
    id: "transfer-layout",
    name: "別の図面から配置を引き継ぐ",
    section: "配置",
    document: true,
    run: (c) => {
      const result = loadDrawing(
        c.tools.document,
      );
      if (isErr(result))
        return info(c, result.content);
      const graph = transferLayout(
        c.flow,
        result.content,
      );
      const count = graph.nodes.filter(
        (n, i) => n !== c.flow.nodes[i],
      ).length;
      return info(
        apply(c, graph),
        count + " ノードの座標を反映しました",
      );
    },
  },
  {
    id: "set-distance",
    name: "基準カードからの距離を指定して配置",
    section: "配置",
    argument: "中心間の距離（ワールド単位）",
    run: (c) => {
      const [anchor, branch, ...rest] = ids(c);
      const raw = c.tools.argument.trim(),
        distance = Number(raw);
      if (
        !anchor ||
        !branch ||
        rest.length ||
        !raw ||
        !Number.isFinite(distance) ||
        distance < 0
      )
        return info(
          c,
          "基準、移動対象の順に二枚を選び、0 以上の距離を指定してください",
        );
      const flow = setBranchDistance(
        c.flow,
        anchor,
        branch,
        distance,
      );
      return info(
        { ...c, flow },
        flow === c.flow
          ? "変更なし。現在距離・移動制約・選択順を確認してください"
          : "中心間の距離を " +
              distance +
              " に設定しました",
      );
    },
  },
  graphCommand(
    "order-neighbors",
    "同じ列のカードを接続先の高さ順に並べる",
    "配置",
    2,
    orderByNeighbors,
  ),
  graphCommand(
    "relax-wiring",
    "配線の目標長に合わせて選択カードを配置",
    "配置",
    1,
    (g, selected, arg) =>
      relaxWiring(
        g,
        selected,
        arg.trim() ? Number(arg) : 180,
      ),
    "ワールド座標の目標長（既定 180）。コンテナと固定カードは位置を維持",
  ),
  graphCommand(
    "pack-components",
    "独立した図を行にまとめて配置",
    "配置",
    0,
    (g, _, arg) =>
      packComponents(
        g,
        arg.trim() ? Number(arg) : 900,
      ),
    "行幅（既定 900）",
  ),
  {
    id: "prune-empty-groups",
    name: "未使用の空グループを一括整理",
    section: "構造編集",
    run: (c) => {
      const flow = pruneEmptyGroups(c.flow);
      return info(
        { ...c, flow },
        c.flow.nodes.length -
          flow.nodes.length +
          " 個の空グループを削除しました",
      );
    },
  },
  {
    id: "dependencies-from-field",
    name: "入力元 ID の配列から配線を復元",
    section: "移行・保存",
    argument:
      "入力元カードの ID 配列を持つ data の項目名",
    run: (c) => {
      const result = dependenciesFromField(
        c.flow,
        c.tools.argument.trim(),
        c.flow.allowConnection,
      );
      if (isErr(result))
        return info(c, result.content);
      return info(
        apply(c, result.content),
        result.content.edges.length -
          c.flow.edges.length +
          " 本の配線を追加しました",
      );
    },
  },
  {
    id: "hierarchy-from-field",
    name: "データの親 ID からグループ階層を復元",
    section: "構造編集",
    argument:
      "親カードの ID を持つ data の項目名（null は最上位）",
    run: (c) => {
      const result = hierarchyFromField(
        c.flow,
        c.tools.argument.trim(),
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "hoist-setting",
    name: "兄弟カードの共通設定を親へ集約",
    section: "構造編集",
    argument: "共通化する data の項目名",
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "親グループを一つ選択してください",
        );
      const result = hoistSetting(
        c.flow,
        selected[0]!,
        c.tools.argument.trim(),
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "move-with-settings",
    name: "継承設定を保って枝を移動",
    section: "構造編集",
    argument: "移動先の親 ID（空欄で最上位）",
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "移動する枝を一つ選択してください",
        );
      const moved = reparentWithSettings(
        c.flow,
        selected[0]!,
        c.tools.argument.trim() || undefined,
      );
      return isErr(moved)
        ? info(c, moved.content)
        : apply(c, moved.content);
    },
  },
  {
    id: "group-serial-runs",
    name: "直列処理を自動グループ化",
    section: "構造編集",
    run: (c) => {
      const selected = ids(c);
      if (selected.length > 1)
        return info(
          c,
          "対象の親グループを一つ選ぶか、最上位は選択を解除してください",
        );
      const graph = groupSerialRuns(
        c.flow,
        selected[0],
      );
      return info(
        apply(c, graph),
        graph.nodes.length -
          c.flow.nodes.length +
          " 個の直列グループを作成しました",
      );
    },
  },
  {
    id: "partition-cards",
    name: "近いカードを指定枚数ずつ区画に分割",
    section: "構造編集",
    argument: "一区画の最大枚数（既定 8）",
    run: (c) => {
      const selected = ids(c),
        capacity = Number(
          c.tools.argument.trim() || 8,
        );
      if (
        selected.length !== 1 ||
        !Number.isSafeInteger(capacity) ||
        capacity < 1
      )
        return info(
          c,
          "親グループを一つ選び、1 以上の整数を入力してください",
        );
      const graph = partitionCards(
        c.flow,
        selected[0]!,
        capacity,
      );
      return info(
        apply(c, graph),
        graph === c.flow
          ? "直下のカードは指定枚数以内です"
          : graph.nodes.length -
              c.flow.nodes.length +
              " 区画に分割しました",
      );
    },
  },
  {
    id: "group-by-attribute",
    name: "属性値から兄弟グループを生成",
    section: "構造編集",
    argument:
      "data のキー（対象の親グループを選択、全体は選択なし）",
    run: (c) => {
      const selected = ids(c),
        key = c.tools.argument.trim(),
        parent = selected[0];
      if (
        !key ||
        selected.length > 1 ||
        (parent &&
          !c.flow.nodes.some(
            (n) => n.parent === parent,
          ))
      )
        return info(
          c,
          "属性名を入力し、必要なら親グループを一つ選択してください",
        );
      const graph = groupByAttribute(
        c.flow,
        key,
        parent,
      );
      return info(
        apply(c, graph),
        graph.nodes.length -
          c.flow.nodes.length +
          " グループを作成しました",
      );
    },
  },
  graphCommand(
    "fit-container",
    "グループの寸法を内容に合わせる",
    "配置",
    1,
    (g, ids, arg) =>
      fitContainer(
        g,
        ids[0] ?? "",
        arg.trim() ? Number(arg) : 24,
      ),
    "余白（既定 24）",
  ),
  {
    id: "reroot-group",
    name: "このグループを階層のルートにする",
    section: "構造編集",
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "内側のグループを一つ選択してください",
        );
      const graph = rerootGroup(
        c.flow,
        selected[0]!,
      );
      return graph === c.flow
        ? info(
            c,
            "親を持つグループを選択してください",
          )
        : apply(c, graph);
    },
  },
  {
    id: "common-container",
    name: "選択したカードの最も近い共通グループへ移動",
    section: "選択・調査",
    run: (c) => {
      const selected = ids(c);
      if (selected.length < 2)
        return info(
          c,
          "カードを二つ以上選択してください",
        );
      const group = commonContainer(
        c.flow.nodes,
        selected,
      );
      if (!group)
        return info(
          c,
          "共通の親グループはありません",
        );
      const next = choose(
        apply(c, revealNode(c.flow, group.id)),
        [group.id],
      );
      const { isolatedBranch, ...flow } =
        next.flow;
      const camera = fitFlow({
        ...flow,
        nodes: [group],
      }).camera;
      return info(
        { ...next, flow: { ...flow, camera } },
        "共通グループ：" +
          group.label +
          " （" +
          group.id +
          "）",
      );
    },
  },
  {
    id: "reveal-node",
    name: "収納されたノードを表示して選択",
    section: "選択・調査",
    argument: "表示するノードの ID",
    run: (c) => {
      const id = c.tools.argument.trim();
      if (!c.flow.nodes.some((n) => n.id === id))
        return info(
          c,
          "該当するノードがありません",
        );
      return choose(
        apply(c, revealNode(c.flow, id)),
        [id],
      );
    },
  },
  {
    id: "group-boundary",
    name: "グループ境界を通る配線の向きを制限",
    section: "接続",
    argument:
      "inbound（流入）/ outbound（流出）/ closed（遮断）/ open（解除）",
    run: (c) => {
      const selected = ids(c),
        group = c.flow.nodes.find(
          (n) => n.id === selected[0],
        );
      if (
        selected.length !== 1 ||
        !group ||
        !(
          group.group ||
          c.flow.nodes.some(
            (n) => n.parent === group.id,
          )
        )
      )
        return info(
          c,
          "グループを一つ選択してください",
        );
      const mode = c.tools.argument.trim();
      if (
        mode !== "inbound" &&
        mode !== "outbound" &&
        mode !== "closed" &&
        mode !== "open"
      )
        return info(
          c,
          "inbound / outbound / closed / open のいずれかを指定してください",
        );
      const { boundary, ...rest } = group;
      return apply(c, {
        ...c.flow,
        nodes: c.flow.nodes.map((n) =>
          n !== group
            ? n
            : mode === "open"
              ? rest
              : { ...rest, boundary: mode },
        ),
      });
    },
  },
  {
    id: "connectable",
    name: "選択ノードへの新規接続を禁止・再開",
    section: "接続",
    run: (c) => {
      const selected = new Set(ids(c));
      if (!selected.size)
        return info(
          c,
          "対象のノードを選択してください",
        );
      const enable = c.flow.nodes
        .filter((n) => selected.has(n.id))
        .every((n) => n.connectable === false);
      const result = apply(c, {
        ...c.flow,
        nodes: c.flow.nodes.map((n) =>
          selected.has(n.id)
            ? { ...n, connectable: enable }
            : n,
        ),
      });
      return info(
        result,
        enable
          ? "新規接続を再開しました"
          : "新規接続を禁止しました",
      );
    },
  },
  {
    id: "arrows",
    name: "配線の方向表示を設定",
    section: "接続",
    argument: "終点・始点・両端・なし",
    run: (c) => {
      const edge = c.flow.activeEdge,
        direction = c.tools.argument.trim();
      if (!edge)
        return info(c, "配線を選択してください");
      const index = edgeIndex(c.flow.edges, edge);
      if (index < 0)
        return info(c, "配線を選択してください");
      const arrows =
        direction === "終点"
          ? "forward"
          : direction === "始点"
            ? "backward"
            : direction === "両端"
              ? "both"
              : direction === "なし"
                ? "none"
                : undefined;
      if (!arrows)
        return info(
          c,
          "終点・始点・両端・なしから選んでください",
        );
      const next: typeof edge = {
        ...edge,
        arrows,
      };
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            activeEdge: next,
            edges: c.flow.edges.map((e, i) =>
              i === index ? next : e,
            ),
          },
        },
        "方向表示を設定しました",
      );
    },
  },
  {
    id: "hit-width",
    name: "配線の操作幅を設定",
    section: "接続",
    argument: "操作幅（画面上の単位）",
    run: (c) => {
      const edge = c.flow.activeEdge,
        index = edge
          ? edgeIndex(c.flow.edges, edge)
          : -1,
        width = Number(c.tools.argument);
      if (!edge || index < 0)
        return info(
          c,
          "対象の配線を選択してください",
        );
      if (
        !c.tools.argument.trim() ||
        !Number.isFinite(width) ||
        width < 0
      )
        return info(
          c,
          "0 以上の幅を指定してください",
        );
      const next = {
        ...edge,
        interactionWidth: width,
      };
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            activeEdge: next,
            edges: c.flow.edges.map((e, i) =>
              i === index ? next : e,
            ),
          },
        },
        "操作幅を設定しました",
      );
    },
  },
  {
    id: "migrate-keys",
    name: "設定項目名を対応表で一括移行",
    section: "移行・検査",
    document: true,
    run: (c) => {
      let mapping: unknown;
      try {
        mapping = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          '対応表を JSON で入力してください（例 {"owner":"assignee"}）',
        );
      }
      const result = migrateDataKeys(
        c.flow,
        ids(c),
        mapping,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "patch-data",
    name: "設定の一部を一括更新（null で項目削除）",
    section: "構造編集",
    document: true,
    run: (c) => {
      let patch: unknown;
      try {
        patch = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          "変更内容を JSON で入力してください",
        );
      }
      const result = patchNodeData(
        c.flow,
        ids(c),
        patch,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "replace-node-type",
    name: "配線を保ってノードの種類と設定を置き換える",
    section: "構造編集",
    argument: "新しいノードの型名",
    document: true,
    run: (c) => {
      let data: unknown;
      try {
        data = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          "設定を JSON オブジェクトで入力してください",
        );
      }
      const result = replaceNodeType(
        c.flow,
        ids(c),
        c.tools.argument.trim(),
        data,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "isolate-branch",
    name: "選択グループだけを表示",
    section: "選択・調査",
    run: (c) => {
      const selected = ids(c);
      const id = selected[0];
      if (
        selected.length !== 1 ||
        !id ||
        !c.flow.nodes.some((n) => n.parent === id)
      )
        return info(
          c,
          "子を持つグループを一つ選択してください",
        );
      return info(
        {
          ...c,
          flow: { ...c.flow, isolatedBranch: id },
        },
        "グループの単独表示中",
      );
    },
  },
  {
    id: "eligible",
    name: "接続可能な入力を調べる",
    section: "接続",
    argument: "出力ポート名（既定は空欄）",
    run: (c) => {
      const source = ids(c)[0];
      if (!source)
        return info(
          c,
          "出力ノードを選択してください",
        );
      const matches = eligibleTargets(
        c.flow,
        source,
        c.tools.argument || undefined,
        c.flow.allowConnection,
      );
      return info(
        c,
        matches
          .map(
            (e) =>
              e.target +
              " / " +
              (e.targetHandle ?? "既定"),
          )
          .join("\n") ||
          "接続できる入力はありません",
      );
    },
  },
  {
    id: "transfer-wires",
    name: "ポートの配線をまとめて移す",
    section: "接続",
    argument:
      "source または target、元ポート名、先ポート名（既定ポートは -）",
    run: (c) => {
      const [from, to] = ids(c),
        [direction, oldHandle, newHandle] =
          c.tools.argument.trim().split(/\s+/);
      if (
        !from ||
        !to ||
        !oldHandle ||
        !newHandle ||
        (direction !== "source" &&
          direction !== "target")
      )
        return info(
          c,
          "元と先のノードを順に選択し、方向とポート名を入力してください",
        );
      const result = transferWires(
        c.flow,
        from,
        to,
        direction,
        oldHandle === "-" ? undefined : oldHandle,
        newHandle === "-" ? undefined : newHandle,
        c.flow.allowConnection,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "expose-group-inputs",
    name: "グループの外部入力を専用カードに集約",
    section: "構造編集",
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "グループを一つ選択してください",
        );
      const result = exposeGroupInputs(
        c.flow,
        selected[0]!,
        c.flow.allowConnection,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "factor-fanout",
    name: "分岐元に共通の処理ノードを挿入",
    section: "構造編集",
    argument: "処理ノードのラベル",
    run: (c) => {
      const [source, ...targets] = ids(c);
      if (!source)
        return info(
          c,
          "出力元を先に選択してください",
        );
      const result = factorFanout(
        c.flow,
        source,
        targets,
        c.tools.argument,
        c.flow.allowConnection,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "match-ports",
    name: "型が一致する未接続の入力を自動配線",
    section: "接続",
    run: (c) => {
      const [source, ...targets] = ids(c);
      if (!source || !targets.length)
        return info(
          c,
          "出力ノードを先に選び、入力側のノードを追加選択してください",
        );
      const result = matchTypedPorts(
        c.flow,
        source,
        targets,
        c.flow.allowConnection,
      );
      return info(
        apply(c, result.graph),
        result.graph.edges.length -
          c.flow.edges.length +
          " 本を接続しました。候補が複数の入力：" +
          result.ambiguous +
          " 件",
      );
    },
  },
  {
    id: "proximity-tree",
    name: "選択範囲を最短の追加配線で連結",
    section: "接続",
    run: (c) => {
      const selected = ids(c);
      if (selected.length < 2)
        return info(
          c,
          "接続するノードを二つ以上選択してください",
        );
      const plan = proximityTree(
        c.flow,
        selected,
      );
      if (!plan.length)
        return info(
          c,
          "選択ノードは既に連結されています",
        );
      const result = connectBatch(
        c.flow,
        plan,
        c.flow.allowConnection,
      );
      return isErr(result)
        ? info(c, result.content)
        : info(
            apply(c, result.content),
            plan.length +
              " 本の配線を追加しました",
          );
    },
  },
  {
    id: "simplify-wiring",
    name: "共有分岐点を保持して折れ点を整理",
    section: "接続",
    argument:
      "許容誤差（ワールド単位、既定 0）。未選択で全配線",
    run: (c) => {
      const tolerance = Number(
        c.tools.argument.trim(),
      );
      if (
        !Number.isFinite(tolerance) ||
        tolerance < 0
      )
        return info(
          c,
          "0 以上の許容誤差を入力してください",
        );
      const graph = simplifyWiring(
        c.flow,
        ids(c),
        tolerance,
      );
      const active = c.flow.activeEdge;
      const index = active
        ? edgeIndex(c.flow.edges, active)
        : -1;
      const result = apply(c, graph);
      return active && graph.edges[index]
        ? {
            ...result,
            flow: {
              ...result.flow,
              activeEdge: graph.edges[index]!,
            },
          }
        : result;
    },
  },
  {
    id: "bundle-fanout",
    name: "同じ出力からの配線を束ねる",
    section: "接続",
    run: (c) => {
      const [source, ...targets] = ids(c);
      if (!source || targets.length < 2)
        return info(
          c,
          "出力元を先に選び、既に接続された宛先を二つ以上追加してください",
        );
      const graph = bundleFanout(
        c.flow,
        source,
        targets,
      );
      return info(
        apply(c, graph),
        graph === c.flow
          ? "束ねる配線はありません"
          : "共通の分岐点を設定しました",
      );
    },
  },
  {
    id: "fan-out",
    name: "選択した複数の宛先へ一括配線",
    section: "接続",
    run: (c) => {
      const [source, ...targets] = ids(c);
      if (!source || !targets.length)
        return info(
          c,
          "始点を選び、Shift＋クリックで宛先を追加してください",
        );
      const result = connectBatch(
        c.flow,
        targets.map((target) => ({
          source,
          target,
        })),
        c.flow.allowConnection,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },

  graphCommand(
    "port-contract",
    "ポート型と最大接続数を設定",
    "接続",
    1,
    (g, ids, v) => {
      const [port, type, max] = v
          .trim()
          .split(/\s+/),
        p = decodePort(port ?? "");
      if (!p) return g;
      return configurePort(g, ids[0] ?? "", {
        ...p,
        ...(type && type !== "*"
          ? { payload: type }
          : {}),
        ...(max ? { capacity: Number(max) } : {}),
      });
    },
    "例：target:in image 1（* は任意の型）",
  ),

  {
    id: "save-view",
    name: "現在の視点に名前を付けて保存",
    section: "空間",
    argument: "視点名（同名で更新）",
    run: (c) => {
      const name = c.tools.argument.trim();
      if (!name || name.length > 1024)
        return info(
          c,
          "視点名を入力してください",
        );
      const bookmarks = [
        ...(c.flow.bookmarks ?? []).filter(
          (b) => b.name !== name,
        ),
        { name, camera: c.flow.camera },
      ];
      return info(
        { ...c, flow: { ...c.flow, bookmarks } },
        "視点を保存しました",
      );
    },
  },
  {
    id: "recall-view",
    name: "保存した視点に移動",
    section: "空間",
    argument: "視点名（空欄で一覧）",
    run: (c) => {
      const name = c.tools.argument.trim(),
        bookmarks = c.flow.bookmarks ?? [];
      if (!name)
        return info(
          c,
          bookmarks
            .map((b) => b.name)
            .join("、") ||
            "保存した視点はありません",
        );
      const b = bookmarks.find(
        (b) => b.name === name,
      );
      return b
        ? info(
            {
              ...c,
              flow: {
                ...c.flow,
                camera: b.camera,
              },
            },
            "視点を復元しました",
          )
        : info(c, "視点が見つかりません");
    },
  },
  {
    id: "remove-view",
    name: "保存した視点を削除",
    section: "空間",
    argument: "視点名",
    run: (c) => {
      const name = c.tools.argument.trim(),
        previous = c.flow.bookmarks ?? [],
        bookmarks = previous.filter(
          (b) => b.name !== name,
        );
      return bookmarks.length === previous.length
        ? info(c, "視点が見つかりません")
        : info(
            {
              ...c,
              flow: { ...c.flow, bookmarks },
            },
            "視点を削除しました",
          );
    },
  },
  {
    id: "store-selection",
    name: "選択セットを保存",
    section: "選択・調査",
    argument: "セット名（同名で更新）",
    run: (c) => {
      const name = c.tools.argument.trim(),
        members = ids(c);
      if (
        !name ||
        name.length > 1024 ||
        !members.length
      )
        return info(
          c,
          "ノードを選び、セット名を入力してください",
        );
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            sets: [
              ...(c.flow.sets ?? []).filter(
                (s) => s.name !== name,
              ),
              { name, members },
            ],
          },
        },
        "選択セットを保存しました",
      );
    },
  },
  {
    id: "recall-selection",
    name: "選択セットを呼び戻す",
    section: "選択・調査",
    argument: "セット名（空欄で一覧）",
    run: (c) => {
      const sets = c.flow.sets ?? [],
        name = c.tools.argument.trim(),
        set = sets.find((s) => s.name === name);
      if (!name)
        return info(
          c,
          sets.map((s) => s.name).join("、") ||
            "保存した選択セットはありません",
        );
      if (!set)
        return info(
          c,
          "選択セットが見つかりません",
        );
      const nodes = new Set(
        c.flow.nodes.map((n) => n.id),
      );
      return choose(
        c,
        set.members.filter((id) => nodes.has(id)),
      );
    },
  },
  {
    id: "remove-selection-set",
    name: "選択セットを削除",
    section: "選択・調査",
    argument: "削除するセット名",
    run: (c) => {
      const name = c.tools.argument.trim(),
        sets = c.flow.sets ?? [];
      return sets.some((s) => s.name === name)
        ? info(
            {
              ...c,
              flow: {
                ...c.flow,
                sets: sets.filter(
                  (s) => s.name !== name,
                ),
              },
            },
            "選択セットを削除しました",
          )
        : info(c, "選択セットが見つかりません");
    },
  },
  {
    id: "radius-select",
    name: "指定半径内のノードを選択",
    section: "空間",
    argument: "半径（ワールド座標の距離）",
    run: (c) => {
      const [id, ...rest] = ids(c),
        radius = Number(c.tools.argument);
      const center = c.flow.nodes.find(
        (n) => n.id === id,
      );
      if (!center || rest.length)
        return info(
          c,
          "中心にするノードを一つ選択してください",
        );
      if (
        !c.tools.argument.trim() ||
        !Number.isFinite(radius) ||
        radius < 0
      )
        return info(
          c,
          "0 以上の半径を指定してください",
        );
      const scene = visibleScene(
        c.flow,
        c.flow.isolatedBranch,
      );
      const candidates = sectionGraph(
        { nodes: scene.nodes, edges: [] },
        c.flow.spatial?.section,
      );
      return choose(
        c,
        nodesInRadius(
          candidates,
          center.position,
          radius,
        ),
      );
    },
  },
  {
    id: "rebase-origin",
    name: "選択ノードを図面の原点にする",
    section: "空間",
    run: (c) => {
      const [anchor, ...rest] = ids(c);
      if (!anchor || rest.length)
        return info(
          c,
          "原点にするノードを一つ選択してください",
        );
      const next = rebaseOrigin(c.flow, anchor);
      return next === c.flow
        ? info(c, "選択ノードは原点にあります")
        : info(
            { ...c, flow: fitFlow(next) },
            "図面の原点を変更しました",
          );
    },
  },
  ...templateTools,
  ...analysisTools,
  {
    id: "lasso",
    name: "投げ縄で複数選択",
    section: "選択・調査",
    run: (c) =>
      info(
        {
          ...c,
          flow: {
            ...c.flow,
            lasso: !c.flow.lasso,
            ink: "off",
          },
        },
        c.flow.lasso
          ? "投げ縄を終了"
          : "背景をドラッグして囲んでください",
      ),
  },
  {
    id: "axis-lock",
    name: "ドラッグを1軸に制限",
    section: "配置制約",
    argument: "x / y / z（空欄で解除）",
    run: (c) => {
      const { axis, ...rest } =
          c.flow.movement ?? {},
        arg = c.tools.argument.trim();
      if (
        arg !== "" &&
        arg !== "x" &&
        arg !== "y" &&
        arg !== "z"
      )
        return info(c, "軸名を指定してください");
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            movement: arg
              ? { ...rest, axis: arg }
              : rest,
          },
        },
        arg
          ? arg + " 軸に沿って移動"
          : "軸制限を解除しました",
      );
    },
  },
  {
    id: "magnet",
    name: "近くのノードの中心線に吸着",
    section: "配置制約",
    run: (c) =>
      info(
        {
          ...c,
          flow: {
            ...c.flow,
            movement: {
              ...c.flow.movement,
              magnet: c.flow.movement?.magnet
                ? 0
                : 8,
            },
          },
        },
        "吸着設定を変更しました",
      ),
  },
  {
    id: "collision",
    name: "ドラッグ中の衝突を防止",
    section: "配置制約",
    run: (c) =>
      info(
        {
          ...c,
          flow: {
            ...c.flow,
            movement: {
              ...c.flow.movement,
              avoidOverlap:
                !c.flow.movement?.avoidOverlap,
            },
          },
        },
        "衝突制約を切り替えました",
      ),
  },
  {
    id: "extent",
    name: "編集可能な空間の範囲を指定",
    section: "配置制約",
    argument: "半径（空欄で解除）",
    run: (c) => {
      const v = Number(c.tools.argument),
        { bounds, ...rest } =
          c.flow.movement ?? {};
      if (!Number.isFinite(v) || v < 0)
        return info(
          c,
          "正の数を指定してください",
        );
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            movement: v
              ? {
                  ...rest,
                  bounds: {
                    min: { x: -v, y: -v, z: -v },
                    max: { x: v, y: v, z: v },
                  },
                }
              : rest,
          },
        },
        v
          ? "移動範囲を設定しました"
          : "範囲を解除しました",
      );
    },
  },

  {
    id: "pen",
    name: "空間にフリーハンド描画",
    section: "注釈・レビュー",
    run: (c) =>
      info(
        {
          ...c,
          flow: {
            ...c.flow,
            ink:
              c.flow.ink === "pen"
                ? "off"
                : "pen",
          },
        },
        c.flow.ink === "pen"
          ? "描画を終了"
          : "ドラッグして描画。再実行で終了します",
      ),
  },
  {
    id: "simplify-ink",
    name: "手描き線の点数を減らす",
    section: "注釈",
    argument:
      "許容するずれ（ワールド座標の距離）",
    run: (c) => {
      const tolerance = Number(c.tools.argument);
      if (
        !c.tools.argument.trim() ||
        !Number.isFinite(tolerance) ||
        tolerance < 0
      )
        return info(
          c,
          "0 以上の距離を入力してください",
        );
      const before = c.flow.marks ?? [],
        marks = simplifyInk(before, tolerance);
      const count = (items: typeof marks) =>
        items.reduce(
          (n, m) =>
            n +
            (m.kind === "stroke"
              ? m.points.length
              : 0),
          0,
        );
      const removed =
        count(before) - count(marks);
      return info(
        removed
          ? { ...c, flow: { ...c.flow, marks } }
          : c,
        removed + " 点を削減しました",
      );
    },
  },
  {
    id: "eraser",
    name: "注釈を消しゴムで消す",
    section: "注釈・レビュー",
    run: (c) =>
      info(
        {
          ...c,
          flow: {
            ...c.flow,
            ink:
              c.flow.ink === "erase"
                ? "off"
                : "erase",
          },
        },
        c.flow.ink === "erase"
          ? "消しゴムを終了"
          : "線または注釈をタップして消去",
      ),
  },
  {
    id: "note",
    name: "選択ノードにレビューを付ける",
    section: "注釈・レビュー",
    argument: "コメント",
    run: (c) => {
      const node = c.flow.nodes.find(
        (n) => n.id === ids(c)[0],
      );
      if (!node || !c.tools.argument.trim())
        return info(
          c,
          "ノードを選びコメントを入力してください",
        );
      const marks = annotate(
          c.flow.marks ?? [],
          node.position,
          c.tools.argument,
          node.id,
        ),
        last = marks[marks.length - 1];
      return last
        ? info(
            {
              ...c,
              flow: {
                ...c.flow,
                marks,
                activeMark: last.id,
              },
            },
            "レビューを追加しました",
          )
        : c;
    },
  },
  {
    id: "thread",
    name: "選択したスレッドに返信",
    section: "注釈・レビュー",
    argument: "返信",
    run: (c) => {
      const id = c.flow.activeMark;
      if (
        !id ||
        !c.flow.marks?.some(
          (m) =>
            m.id === id && m.kind === "review",
        )
      )
        return info(
          c,
          "レビューの丸印を選択してください",
        );
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            marks: reply(
              c.flow.marks,
              id,
              c.tools.argument,
            ),
          },
        },
        "返信を追加しました",
      );
    },
  },
  {
    id: "export-reviews",
    name: "レビュー記録を書き出す",
    section: "注釈・レビュー",
    document: true,
    run: (c) => ({
      ...c,
      tools: {
        ...c.tools,
        document: exportReviews(
          c.flow,
          c.flow.marks ?? [],
        ),
        report: "レビュー記録を書き出しました",
      },
    }),
  },
  {
    id: "import-reviews",
    name: "レビュー記録を図面へ取り込む",
    section: "注釈・レビュー",
    document: true,
    run: (c) => {
      const result = importReviews(
        c.flow,
        c.flow.marks ?? [],
        c.tools.document,
      );
      if (isErr(result))
        return info(c, result.content);
      const { marks, added, skipped } =
        result.content;
      return info(
        { ...c, flow: { ...c.flow, marks } },
        added +
          " 件を追加、同じ ID の " +
          skipped +
          " 件をスキップしました",
      );
    },
  },
  {
    id: "reanchor-review",
    name: "レビューの固定先を変更",
    section: "注釈・レビュー",
    argument:
      "新しいカード ID（空欄で現在の空間位置に固定）",
    run: (c) => {
      const target =
        c.tools.argument.trim() || undefined;
      const result = reanchorReview(
        c.flow,
        c.flow.marks ?? [],
        c.flow.activeMark ?? "",
        target,
      );
      return isErr(result)
        ? info(c, result.content)
        : info(
            {
              ...c,
              flow: {
                ...c.flow,
                marks: result.content,
              },
            },
            target
              ? "レビューを " +
                  target +
                  " に移しました"
              : "レビューを空間に固定しました",
          );
    },
  },
  {
    id: "assign-review",
    name: "レビューの担当者を指定",
    section: "注釈・レビュー",
    argument: "担当者名（空欄で解除）",
    run: (c) => {
      const id = c.flow.activeMark,
        marks = c.flow.marks ?? [];
      if (
        !id ||
        !marks.some(
          (m) =>
            m.id === id && m.kind === "review",
        )
      )
        return info(
          c,
          "対象のレビューを選んでください",
        );
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            marks: assignReview(
              marks,
              id,
              c.tools.argument,
            ),
          },
        },
        c.tools.argument.trim()
          ? "担当者を更新しました"
          : "担当を解除しました",
      );
    },
  },
  {
    id: "resolve",
    name: "レビューを解決・再開",
    section: "注釈・レビュー",
    run: (c) =>
      c.flow.activeMark
        ? info(
            {
              ...c,
              flow: {
                ...c.flow,
                marks: resolve(
                  c.flow.marks ?? [],
                  c.flow.activeMark,
                ),
              },
            },
            "レビュー状態を更新しました",
          )
        : info(c, "対象の丸印を選択してください"),
  },
  {
    id: "resolved",
    name: "解決済みレビューの表示切替",
    section: "注釈・レビュー",
    run: (c) => ({
      ...c,
      flow: {
        ...c.flow,
        showResolved: !c.flow.showResolved,
      },
    }),
  },

  {
    id: "fit-wire",
    name: "選択配線の両端と折れ点を画面に収める",
    section: "空間",
    run: (c) =>
      c.flow.activeEdge
        ? { ...c, flow: fitWire(c.flow) }
        : info(
            c,
            "確認したい配線をクリックしてください",
          ),
  },
  {
    id: "plane-route",
    name: "配線を指定の奥行き面に通す",
    section: "接続",
    argument: "配線面のワールド Z 座標",
    run: (c) => {
      const active = c.flow.activeEdge,
        index = active
          ? edgeIndex(c.flow.edges, active)
          : -1,
        edge = c.flow.edges[index];
      if (!edge || !c.tools.argument.trim())
        return info(
          c,
          "配線を選択して奥行きを指定してください",
        );
      const result = routeOnPlane(
        c.flow,
        edge,
        Number(c.tools.argument),
      );
      if (isErr(result))
        return info(c, result.content);
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            activeEdge: result.content,
            edges: c.flow.edges.map((e, i) =>
              i === index ? result.content : e,
            ),
          },
        },
        "指定した奥行き面に配線しました",
      );
    },
  },
  {
    id: "obstacle-route",
    name: "障害ノードを避けて配線",
    section: "接続",
    run: (c) => {
      const index = c.flow.activeEdge
          ? edgeIndex(
              c.flow.edges,
              c.flow.activeEdge,
            )
          : -1,
        edge = c.flow.edges[index];
      if (!edge)
        return info(
          c,
          "接続線をクリックしてください",
        );
      const result = routeAroundNodes(
        c.flow,
        edge,
      );
      if (isErr(result))
        return info(c, result.content);
      const next = {
        ...edge,
        waypoints: result.content,
      };
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            activeEdge: next,
            edges: c.flow.edges.map((v, i) =>
              i === index ? next : v,
            ),
          },
        },
        "中継点をドラッグして経路を調整できます",
      );
    },
  },

  {
    id: "baseline",
    name: "比較用の基準版を記録",
    section: "版管理",
    run: (c) => ({
      ...c,
      tools: {
        ...c.tools,
        baseline: some({
          nodes: c.flow.nodes,
          edges: c.flow.edges,
        }),
        report: "基準版を記録しました",
      },
    }),
  },
  {
    id: "compare-reachability",
    name: "基準版と現在の到達先を比較",
    section: "版管理",
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "先に基準版を記録してください",
        );
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "経路を比較する起点を一つ選んでください",
        );
      const result = compareReachability(
        c.tools.baseline.content,
        c.flow,
        selected[0]!,
      );
      if (isErr(result))
        return info(c, result.content);
      const { gained, lost } = result.content;
      return info(
        c,
        "新たに到達：" +
          (gained.join("、") || "なし") +
          "\n到達できなくなった先：" +
          (lost.join("、") || "なし"),
      );
    },
  },
  {
    id: "layout-displacements",
    name: "基準版からの移動量と親に対する変位を測る",
    section: "版管理",
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "先に基準版を記録してください",
        );
      const rows = layoutDisplacements(
        c.tools.baseline.content,
        c.flow,
      );
      return info(
        c,
        rows
          .map(
            (r) =>
              r.id +
              "　ΔXYZ (" +
              [r.dx, r.dy, r.dz]
                .map((v) => v.toFixed(2))
                .join(", ") +
              ")　距離 " +
              r.distance.toFixed(2) +
              "　親に対する移動 " +
              (r.relative === undefined
                ? "親変更"
                : r.relative.toFixed(2)),
          )
          .join("\n") || "配置の変更はありません",
      );
    },
  },
  {
    id: "diff",
    name: "基準版との差分を確認",
    section: "版管理",
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "先に基準版を記録してください",
        );
      const patch = diffGraph(
        c.tools.baseline.content,
        c.flow,
      );
      return info(
        c,
        isErr(patch)
          ? patch.content
          : summarizePatch(patch.content).join(
              "\n",
            ) || "差分なし",
      );
    },
  },
  {
    id: "restore-card-fields",
    name: "選んだカードの設定・配置を基準版から復元",
    section: "版管理",
    argument:
      "settings（設定）/ geometry（配置）/ both（両方、既定）",
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "先に基準版を記録してください",
        );
      const selected = ids(c),
        mode = c.tools.argument.trim() || "both";
      if (
        !selected.length ||
        (mode !== "settings" &&
          mode !== "geometry" &&
          mode !== "both")
      )
        return info(
          c,
          "対象カードと復元する項目を指定してください",
        );
      const result = restoreCardFields(
        c.tools.baseline.content,
        c.flow,
        selected,
        mode,
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  {
    id: "revision-drawing",
    name: "変更箇所だけのレビュー図面を書き出す",
    section: "版管理",
    document: true,
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "先に基準版を記録してください",
        );
      const review = revisionDrawing(
        c.tools.baseline.content,
        c.flow,
      );
      if (isErr(review))
        return info(c, review.content);
      const graph = review.content;
      const camera = graph.nodes.length
        ? fitFlow({ ...c.flow, ...graph }).camera
        : c.flow.camera;
      return {
        ...c,
        tools: {
          ...c.tools,
          document: saveDrawing({
            ...graph,
            camera,
          }),
          report: graph.nodes.length
            ? "変更箇所を含むレビュー図面を書き出しました"
            : "差分なし",
        },
      };
    },
  },
  {
    id: "merge-revision",
    name: "別の図面の変更を3方向マージ",
    section: "版管理",
    document: true,
    run: (c) => {
      if (!isSome(c.tools.baseline))
        return info(
          c,
          "共通の基準版を記録してください",
        );
      const remote = loadDrawing(
        c.tools.document,
      );
      if (isErr(remote))
        return info(c, remote.content);
      const merged = mergeRevision(
        c.tools.baseline.content,
        c.flow,
        remote.content,
      );
      return isErr(merged)
        ? info(
            c,
            merged.content
              .map((v) => v.key + " " + v.reason)
              .join("\n"),
          )
        : apply(c, merged.content);
    },
  },
  {
    id: "export-react",
    name: "React Flow JSON に変換",
    section: "入出力",
    document: true,
    run: (c) => {
      const r = exportReactFlow(c.flow);
      return isErr(r)
        ? info(c, r.content)
        : {
            ...c,
            tools: {
              ...c.tools,
              document: r.content,
              report:
                "正面投影の図面を書き出しました",
            },
          };
    },
  },
  {
    id: "inspect-data",
    name: "ノードのカスタムデータを表示",
    section: "入出力",
    document: true,
    run: (c) => {
      const n = c.flow.nodes.find(
        (n) => n.id === ids(c)[0],
      );
      return n
        ? {
            ...c,
            tools: {
              ...c.tools,
              document: JSON.stringify(
                n.data ?? {},
                null,
                2,
              ),
              report: n.type ?? "default",
            },
          }
        : info(c, "ノードを選択してください");
    },
  },

  {
    id: "axes",
    name: "ワールド座標軸を表示・非表示",
    section: "空間計測",
    run: (c) =>
      spatial(
        c,
        {
          ...c.flow.spatial,
          axes: !c.flow.spatial?.axes,
        },
        "座標軸を更新しました",
      ),
  },
  {
    id: "semantic-zoom",
    name: "縮小時にグループの概要を自動表示",
    section: "空間",
    run: (c) =>
      spatial(
        c,
        {
          ...c.flow.spatial,
          overview: !c.flow.spatial?.overview,
        },
        c.flow.spatial?.overview
          ? "自動概要を解除しました"
          : "倍率 50% 未満でグループを概要表示します",
      ),
  },
  {
    id: "depth-color",
    name: "奥行きを色で表示",
    section: "空間計測",
    run: (c) =>
      spatial(
        c,
        {
          ...c.flow.spatial,
          depthColor: !c.flow.spatial?.depthColor,
        },
        "Z 座標の配色を更新しました",
      ),
  },
  {
    id: "measure",
    name: "2点間の実距離を記入",
    section: "空間計測",
    run: measure("distance"),
  },
  {
    id: "angle",
    name: "3点の角度を記入",
    section: "空間計測",
    run: measure("angle"),
  },
  {
    id: "clear-dimensions",
    name: "寸法を消去",
    section: "空間計測",
    run: (c) =>
      spatial(
        c,
        { ...c.flow.spatial, dimensions: [] },
        "寸法を消去しました",
      ),
  },
  {
    id: "section",
    name: "断面範囲で表示を絞る",
    section: "空間計測",
    argument:
      "軸 最小 最大（例 z -100 100、空欄で解除）",
    run: (c) => {
      const raw = c.tools.argument.trim();
      const { section, ...rest } =
        c.flow.spatial ?? {};
      if (!raw)
        return spatial(
          c,
          rest,
          "断面を解除しました",
        );
      const [axis, a, b] = raw.split(/\s+/),
        min = Number(a),
        max = Number(b);
      return (axis === "x" ||
        axis === "y" ||
        axis === "z") &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min <= max
        ? spatial(
            c,
            {
              ...rest,
              section: { axis, min, max },
            },
            "断面を表示しています",
          )
        : info(
            c,
            "軸と有効な範囲を指定してください",
          );
    },
  },
  {
    id: "pivot",
    name: "選択点を回転中心に固定",
    section: "空間計測",
    run: (c) => {
      const id = ids(c)[0],
        { pivot, ...rest } = c.flow.spatial ?? {};
      return spatial(
        c,
        id && id !== pivot
          ? { ...rest, pivot: id }
          : rest,
        id && id !== pivot
          ? "回転中心：" + id
          : "回転中心を解除しました",
      );
    },
  },
  {
    id: "bounds",
    name: "3次元の占有範囲を計測",
    section: "空間計測",
    run: (c) => {
      const b = worldBounds(c.flow, ids(c));
      return isSome(b)
        ? info(
            c,
            ["x", "y", "z"]
              .map((a) => {
                const k = axis(a);
                return (
                  k +
                  ": " +
                  b.content.min[k].toFixed(1) +
                  " … " +
                  b.content.max[k].toFixed(1)
                );
              })
              .join(" / "),
          )
        : info(c, "ノードがありません");
    },
  },

  graphCommand(
    "infer-ports",
    "既存配線からポート定義と型を推定",
    "接続",
    1,
    inferPortContracts,
  ),
  graphCommand(
    "add-port",
    "名前付きポートを追加",
    "接続",
    1,
    (g, ids, arg) => {
      const p = decodePort(arg);
      return p ? addPort(g, ids[0] ?? "", p) : g;
    },
    "source:名前 または target:名前",
  ),
  graphCommand(
    "remove-port",
    "ポートと付属する接続を削除",
    "接続",
    1,
    (g, ids, arg) => {
      const p = decodePort(arg);
      return p
        ? removePort(g, ids[0] ?? "", p)
        : g;
    },
    "source:名前 または target:名前",
  ),
  {
    id: "merge-ports",
    name: "配線を保って既存ポートに統合",
    section: "接続",
    argument:
      "source:元→統合先 または target:元→統合先",
    run: (c) => {
      const selected = ids(c),
        [old, name] = c.tools.argument.split("→"),
        port = decodePort(old ?? "");
      if (
        selected.length !== 1 ||
        !port ||
        !name?.trim()
      )
        return info(
          c,
          "カードを一つ選び、元と統合先のポート名を指定してください",
        );
      const result = mergePorts(
        c.flow,
        selected[0]!,
        port,
        name.trim(),
        c.flow.allowConnection,
      );
      if (isErr(result))
        return info(c, result.content);
      const next = apply(c, result.content),
        active = c.flow.activeEdge;
      const replacement =
        active &&
        result.content.edges[
          edgeIndex(c.flow.edges, active)
        ];
      return replacement
        ? {
            ...next,
            flow: {
              ...next.flow,
              activeEdge: replacement,
            },
          }
        : next;
    },
  },
  {
    id: "swap-wiring-roles",
    name: "二つのカードの配線上の役割を交換",
    section: "接続",
    run: (c) => {
      const [a, b, ...rest] = ids(c);
      if (!a || !b || rest.length)
        return info(
          c,
          "配線を交換するカードを二つ選んでください",
        );
      const result = swapWiringRoles(
        c.flow,
        a,
        b,
        c.flow.allowConnection,
      );
      if (isErr(result))
        return info(c, result.content);
      const next = apply(c, result.content),
        active = c.flow.activeEdge;
      const edge =
        active &&
        result.content.edges[
          edgeIndex(c.flow.edges, active)
        ];
      return edge
        ? {
            ...next,
            flow: {
              ...next.flow,
              activeEdge: edge,
            },
          }
        : next;
    },
  },
  {
    id: "describe-port",
    name: "名前付きポートに説明を付ける",
    section: "接続",
    argument:
      'ポートと説明（例：["target:in","注文番号を入力"]、空の説明で解除）',
    run: (c) => {
      let spec: unknown;
      try {
        spec = JSON.parse(c.tools.argument);
      } catch {
        return info(
          c,
          "ポートと説明を JSON 配列で指定してください",
        );
      }
      const selected = ids(c);
      if (
        selected.length !== 1 ||
        !Array.isArray(spec) ||
        spec.length !== 2 ||
        typeof spec[0] !== "string" ||
        typeof spec[1] !== "string"
      )
        return info(
          c,
          "カードを一つ選び、ポートと説明を指定してください",
        );
      const p = decodePort(spec[0]);
      if (!p)
        return info(
          c,
          "source:名前 または target:名前 を指定してください",
        );
      const graph = describePort(
        c.flow,
        selected[0]!,
        p.direction,
        p.id,
        spec[1],
      );
      return graph === c.flow
        ? info(
            c,
            "定義済みのポートを指定してください",
          )
        : apply(c, graph);
    },
  },
  {
    id: "order-ports",
    name: "入出力ポートの上下順を変更",
    section: "接続",
    argument:
      '向きと上から順のポート名（例：["source","yes","no"]）',
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "カードを一つ選択してください",
        );
      let list: unknown;
      try {
        list = JSON.parse(c.tools.argument);
      } catch {
        return info(
          c,
          "向きとポート名を JSON 配列で指定してください",
        );
      }
      if (
        !Array.isArray(list) ||
        (list[0] !== "source" &&
          list[0] !== "target") ||
        !list
          .slice(1)
          .every((x) => typeof x === "string")
      )
        return info(
          c,
          "先頭に source または target、続けてポート名を指定してください",
        );
      const result = orderPorts(
        c.flow,
        selected[0]!,
        list[0],
        list.slice(1),
      );
      return isErr(result)
        ? info(c, result.content)
        : apply(c, result.content);
    },
  },
  graphCommand(
    "rename-port",
    "接続を保ってポートを改名",
    "接続",
    1,
    (g, ids, arg) => {
      const [old, name] = arg.split("→");
      const p = decodePort(old ?? "");
      return p && name
        ? renamePort(g, ids[0] ?? "", p, name)
        : g;
    },
    "source:旧名→新名",
  ),
  {
    id: "relieve-input-capacity",
    name: "上限を超えた入力配線を同型の空きポートに振り分ける",
    section: "接続",
    run: (c) => {
      const [node, ...rest] = ids(c);
      if (!node || rest.length)
        return info(
          c,
          "入力を整理するカードを一枚選択してください",
        );
      const result = relieveInputCapacity(
        c.flow,
        node,
        c.flow.allowConnection,
      );
      if (isErr(result))
        return info(c, result.content);
      const graph = result.content;
      const count = graph.edges.filter(
        (e, i) => e !== c.flow.edges[i],
      ).length;
      const active =
        c.flow.activeEdge &&
        graph.edges[
          edgeIndex(
            c.flow.edges,
            c.flow.activeEdge,
          )
        ];
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            ...graph,
            ...(active
              ? { activeEdge: active }
              : {}),
          },
        },
        count + " 本の入力配線を移管しました",
      );
    },
  },
  {
    id: "retarget",
    name: "選択した接続の終点を変更",
    section: "接続",
    argument: "新しい終点の ID",
    run: (c) => {
      const old = c.flow.activeEdge;
      if (!old)
        return info(
          c,
          "接続線をクリックしてください",
        );
      const index = edgeIndex(c.flow.edges, old),
        current = c.flow.edges[index];
      if (!current)
        return info(
          c,
          "接続を選び直してください",
        );
      const { targetHandle, ...rest } = current,
        next = {
          ...rest,
          target: c.tools.argument,
        };
      const graph = reconnect(
        c.flow,
        current,
        next,
        c.flow.allowConnection,
      );
      if (graph === c.flow)
        return info(
          c,
          "接続条件を確認してください",
        );
      const activeEdge = graph.edges[index];
      return activeEdge
        ? info(
            {
              ...c,
              flow: {
                ...c.flow,
                ...graph,
                activeEdge,
              },
            },
            "終点を変更しました",
          )
        : c;
    },
  },

  {
    id: "find",
    name: "ノードを検索",
    section: "選択・調査",
    argument: "ID または表示名",
    run: (c) => {
      const q = c.tools.argument.toLowerCase();
      return q
        ? choose(
            c,
            c.flow.nodes
              .filter(
                (n) =>
                  !n.hidden &&
                  (n.label + " " + n.id)
                    .toLowerCase()
                    .includes(q),
              )
              .map((n) => n.id),
          )
        : info(c, "検索語を入力してください");
    },
  },
  {
    id: "all",
    name: "全ノードを選択",
    section: "選択・調査",
    run: (c) =>
      choose(
        c,
        c.flow.nodes
          .filter((n) => !n.hidden)
          .map((n) => n.id),
      ),
  },
  {
    id: "invert",
    name: "選択を反転",
    section: "選択・調査",
    run: (c) =>
      choose(
        c,
        c.flow.nodes
          .filter(
            (n) =>
              !n.hidden && !ids(c).includes(n.id),
          )
          .map((n) => n.id),
      ),
  },
  {
    id: "branch",
    name: "子孫をまとめて選択",
    section: "選択・調査",
    run: (c) =>
      choose(c, [
        ...subtree(c.flow.nodes, ids(c)),
      ]),
  },
  {
    id: "cycles",
    name: "循環している部分を検出",
    section: "選択・調査",
    run: (c) =>
      choose(c, [
        ...new Set([
          ...components(c.flow)
            .filter((g) => g.length > 1)
            .flat(),
          ...c.flow.edges
            .filter((e) => e.source === e.target)
            .map((e) => e.source),
        ]),
      ]),
  },
  {
    id: "path",
    name: "2点間の最短経路",
    section: "選択・調査",
    run: (c) => {
      const [a, b] = ids(c);
      if (!a || !b)
        return info(
          c,
          "始点、終点の順に Shift＋クリックしてください",
        );
      const path = shortestPath(c.flow, a, b);
      const links = new Set(
        path
          .slice(1)
          .map((id, i) =>
            JSON.stringify([path[i], id]),
          ),
      );
      return info(
        {
          ...c,
          flow: {
            ...c.flow,
            edges: c.flow.edges.map((e) => ({
              ...e,
              highlighted: links.has(
                JSON.stringify([
                  e.source,
                  e.target,
                ]),
              ),
            })),
          },
        },
        path.length
          ? path.join(" → ")
          : "経路がありません",
      );
    },
  },
  {
    id: "islands",
    name: "孤立ノードを検出",
    section: "選択・調査",
    run: (c) => {
      const a = adjacency(c.flow);
      return choose(
        c,
        c.flow.nodes
          .filter(
            (n) =>
              !a.incoming.get(n.id)?.size &&
              !a.outgoing.get(n.id)?.size,
          )
          .map((n) => n.id),
      );
    },
  },
  {
    id: "inspect",
    name: "参照の整合性を検査",
    section: "選択・調査",
    run: (c) =>
      info(
        c,
        inspectGraph(c.flow).join("\n") ||
          "参照エラーはありません",
      ),
  },
  graphCommand(
    "swimlanes",
    "属性別のスイムレーンに配置",
    "配置",
    0,
    (g, ids, key) =>
      swimlaneLayout(g, key.trim(), ids[0]),
    "レーンを分ける data のキー（グループ選択で内部だけ配置）",
  ),
  graphCommand(
    "merge",
    "選択を1ノードに統合",
    "構造編集",
    2,
    (g, ids) => mergeNodes(g, ids, ids[0] ?? ""),
  ),
  graphCommand(
    "reverse",
    "内部接続の方向を反転",
    "構造編集",
    2,
    reverseConnections,
  ),
  graphCommand(
    "reduce",
    "推移的に冗長な接続を除去",
    "構造編集",
    0,
    reduceTransitive,
  ),
  {
    id: "register-branch",
    name: "3点を基準に枝を基準版へ剛体位置合わせ",
    section: "配置",
    argument:
      "枝内の基準カード ID を JSON 配列で3点指定",
    run: (c) => {
      const [root, ...rest] = ids(c);
      if (
        !root ||
        rest.length ||
        !isSome(c.tools.baseline)
      )
        return info(
          c,
          "基準版を記録し、位置合わせする枝を一つ選択してください",
        );
      let landmarks: unknown;
      try {
        landmarks = JSON.parse(c.tools.argument);
      } catch {
        return info(
          c,
          "基準点を JSON 配列で入力してください",
        );
      }
      if (
        !Array.isArray(landmarks) ||
        !landmarks.every(
          (id) => typeof id === "string",
        )
      )
        return info(
          c,
          "基準点の ID を指定してください",
        );
      const graph = registerBranch(
        c.flow,
        c.tools.baseline.content,
        root,
        landmarks,
      );
      return graph
        ? info(
            {
              ...c,
              flow: { ...c.flow, ...graph },
            },
            "基準版の3点に枝を合わせました",
          )
        : info(
            c,
            "固定カードのない枝内に、基準版と合同で一直線上にない3点が必要です",
          );
    },
  },
  {
    id: "preview-layout",
    name: "自動配置の移動量を適用前に確認",
    section: "配置",
    argument: "配置方式（階層・円形・連結成分）",
    run: (c) => {
      const name =
        c.tools.argument.trim() || "階層";
      const source = {
        nodes: c.flow.nodes,
        edges: c.flow.edges,
      };
      const layout =
        name === "階層"
          ? arrangeHierarchy
          : name === "円形"
            ? radialLayout
            : name === "連結成分"
              ? packComponents
              : undefined;
      if (!layout) {
        const { layoutPreview, ...tools } =
          c.tools;
        return info(
          { ...c, tools },
          "階層・円形・連結成分のいずれかを指定してください",
        );
      }
      const proposed = layout(source);
      const changes = layoutDisplacements(
        source,
        proposed,
      );
      const locked = new Set(
        source.nodes
          .filter((n) => n.locked)
          .map((n) => n.id),
      );
      return info(
        {
          ...c,
          tools: {
            ...c.tools,
            layoutPreview: {
              source,
              proposed,
              name,
            },
          },
        },
        [
          name +
            " · 移動 " +
            changes.filter((r) => r.distance > 0)
              .length +
            " 枚",
          ...changes.map(
            (r) =>
              r.id +
              (locked.has(r.id)
                ? "（固定）"
                : "") +
              "　移動 " +
              r.distance.toFixed(2) +
              "　親に対する移動 " +
              (r.relative?.toFixed(2) ?? "—"),
          ),
        ].join("\n"),
      );
    },
  },
  {
    id: "accept-layout-preview",
    name: "確認した自動配置を適用",
    section: "配置",
    run: (c) => {
      const { layoutPreview: preview, ...tools } =
        c.tools;
      if (!preview)
        return info(
          c,
          "先に自動配置の移動量を確認してください",
        );
      if (
        preview.source.nodes !== c.flow.nodes ||
        preview.source.edges !== c.flow.edges
      )
        return info(
          { ...c, tools },
          "図面が変更されています。配置を再確認してください",
        );
      return info(
        {
          ...c,
          tools,
          flow: {
            ...c.flow,
            ...preview.proposed,
          },
        },
        preview.name + " 配置を適用しました",
      );
    },
  },
  {
    id: "rename-id",
    name: "参照を保って ID を変更",
    section: "構造編集",
    argument: "新しい ID",
    run: (c) => {
      const [node, ...rest] = ids(c);
      if (!node || rest.length)
        return info(
          c,
          "カードを一枚選択してください",
        );
      const flow = renameFlowIdentity(
        c.flow,
        node,
        c.tools.argument,
      );
      return flow === c.flow
        ? info(
            c,
            "未使用の有効な ID を指定してください",
          )
        : info(
            { ...c, flow },
            "ID と図面内の参照を変更しました",
          );
    },
  },
  graphCommand(
    "replace",
    "ラベルを一括置換",
    "構造編集",
    0,
    (g, _ids, arg) => {
      const [before, after] = arg.split("→");
      return before && after !== undefined
        ? relabel(g, before, after)
        : g;
    },
    "検索語→置換語",
  ),
  graphCommand(
    "parent",
    "親グループを変更",
    "構造編集",
    1,
    (g, ids, arg) =>
      ids.reduce(
        (g, id) =>
          reparent(g, id, arg || undefined),
        g,
      ),
    "親の ID（空欄でルート）",
  ),
  graphCommand(
    "align",
    "中心を揃える",
    "空間編集",
    2,
    (g, ids, v) => alignNodes(g, ids, axis(v)),
    "軸 x / y / z",
  ),
  graphCommand(
    "distribute",
    "等間隔に分布",
    "空間編集",
    3,
    (g, ids, v) => {
      const [direction, spacing] = v
        .trim()
        .split(/\s+/);
      return distribute(
        g,
        ids,
        axis(direction ?? "x"),
        spacing === "gap" ? "gaps" : "centers",
      );
    },
    "軸 x / y / z（外周の余白を揃える場合は x gap または y gap）",
  ),
  graphCommand(
    "reflect",
    "選択を鏡像反転",
    "空間編集",
    2,
    (g, ids, v) =>
      transformSelection(g, ids, (p) => ({
        ...p,
        [axis(v)]: -p[axis(v)],
      })),
    "軸 x / y / z",
  ),
  graphCommand(
    "rotate",
    "選択を中心の周りに回転",
    "空間編集",
    2,
    (g, ids, v) => {
      const r = (Number(v) * Math.PI) / 180;
      return Number.isFinite(r)
        ? transformSelection(g, ids, (p) => ({
            ...p,
            x:
              p.x * Math.cos(r) -
              p.y * Math.sin(r),
            y:
              p.x * Math.sin(r) +
              p.y * Math.cos(r),
          }))
        : g;
    },
    "角度（度）",
  ),
  graphCommand(
    "scale",
    "配置の間隔を拡縮",
    "空間編集",
    2,
    (g, ids, v) => {
      const k = Number(v);
      return Number.isFinite(k) && k > 0
        ? transformSelection(g, ids, (p) => ({
            x: p.x * k,
            y: p.y * k,
            z: p.z * k,
          }))
        : g;
    },
    "倍率",
  ),
  graphCommand(
    "lock",
    "ドラッグ位置を固定",
    "表示・保護",
    1,
    (g, i) => lockNodes(g, i, true),
  ),
  graphCommand(
    "unlock",
    "位置の固定を解除",
    "表示・保護",
    1,
    (g, i) => lockNodes(g, i, false),
  ),
  graphCommand(
    "hide",
    "枝を非表示にする",
    "表示・保護",
    1,
    (g, i) => conceal(g, i, true),
  ),
  graphCommand(
    "show",
    "非表示の枝を再表示",
    "表示・保護",
    0,
    (g) =>
      conceal(
        g,
        g.nodes.map((n) => n.id),
        false,
      ),
  ),
  {
    id: "export-structure",
    name: "共有項目を指定して図面の構造を書き出す",
    section: "移行・保存",
    argument:
      "残す data の単純値のキー（カンマ区切り、空欄で全省略）。ID・ラベル・ポートは含まれます",
    document: true,
    run: (c) => ({
      ...c,
      tools: {
        ...c.tools,
        document: saveStructuralCopy(
          c.flow,
          c.tools.argument
            .split(",")
            .map((key) => key.trim())
            .filter(Boolean),
        ),
        report:
          "構造と指定項目を書き出しました。注釈・選択セット・ブックマークは含みません",
      },
    }),
  },
  {
    id: "stitch-drawing",
    name: "共通カードを基準に別図面を接合",
    section: "構造編集",
    document: true,
    run: (c) => {
      const [anchor, ...rest] = ids(c);
      if (!anchor || rest.length)
        return info(
          c,
          "共通カードを一枚選択してください",
        );
      const drawing = loadDrawing(
        c.tools.document,
      );
      if (isErr(drawing))
        return info(c, drawing.content);
      const joined = stitchDrawing(
        c.flow,
        drawing.content,
        anchor,
      );
      return isErr(joined)
        ? info(c, joined.content)
        : info(
            { ...c, flow: joined.content },
            "共通カードの位置に図面を接合しました",
          );
    },
  },
  {
    id: "bind-module-terminals",
    name: "外部端子の配線を元のカードへ再接続",
    section: "構造編集",
    run: (c) => {
      const result = bindModuleTerminals(
        c.flow,
        ids(c),
      );
      return isErr(result)
        ? info(c, result.content)
        : info(
            { ...c, flow: result.content },
            "選択した外部端子の配線を再接続しました",
          );
    },
  },
  {
    id: "export-module",
    name: "外部端子付きの部分図を書き出す",
    section: "構造編集",
    document: true,
    run: (c) => {
      const selected = ids(c);
      if (!selected.length)
        return info(
          c,
          "書き出すカードまたはグループを選んでください",
        );
      const fragment = extractModule(
        c.flow,
        selected,
      );
      const members = subtree(
        c.flow.nodes,
        selected,
      );
      return {
        ...c,
        tools: {
          ...c.tools,
          document: saveDrawing({
            ...fragment,
            camera: c.flow.camera,
            marks:
              c.flow.marks?.filter(
                (m) =>
                  m.kind === "review" &&
                  m.node !== undefined &&
                  members.has(m.node),
              ) ?? [],
            spatial: {
              dimensions:
                c.flow.spatial?.dimensions?.filter(
                  (d) =>
                    d.nodes.every((id) =>
                      members.has(id),
                    ),
                ) ?? [],
            },
          }),
          report:
            "外部との配線を端子に接続した部分図を書き出しました",
        },
      };
    },
  },
  {
    id: "copy-graph",
    name: "部分グラフをコピー",
    section: "構造編集",
    run: (c) => {
      if (!ids(c).length)
        return info(
          c,
          "コピーするノードを選択してください",
        );
      const fragment = extract(c.flow, ids(c));
      return {
        ...c,
        tools: {
          ...c.tools,
          fragment: some(fragment),
          report:
            fragment.nodes.length +
            " ノードと " +
            fragment.edges.length +
            " 接続をコピー",
        },
      };
    },
  },
  {
    id: "paste-graph",
    name: "部分グラフを貼り付け",
    section: "構造編集",
    run: (c) =>
      isSome(c.tools.fragment)
        ? apply(
            c,
            paste(
              c.flow,
              c.tools.fragment.content,
              { x: 40, y: 40, z: 0 },
            ),
          )
        : info(
            c,
            "先に部分グラフをコピーしてください",
          ),
  },
  {
    id: "save",
    name: "図面 JSON を書き出す",
    section: "入出力",
    document: true,
    run: (c) => ({
      ...c,
      tools: {
        ...c.tools,
        document: saveDrawing(c.flow),
        report:
          "ノード、接続、カメラを出力しました",
      },
    }),
  },
  {
    id: "load",
    name: "図面 JSON を読み込む",
    section: "入出力",
    document: true,
    run: (c) => {
      const r = loadDrawing(c.tools.document);
      return isErr(r)
        ? info(c, r.content)
        : info(
            {
              ...c,
              flow: {
                ...createFlow(r.content),
                camera: r.content.camera,
              },
            },
            "図面を読み込みました",
          );
    },
  },
  {
    id: "import",
    name: "React Flow JSON を読み込む",
    section: "入出力",
    document: true,
    run: (c) => {
      const r = importReactFlow(c.tools.document);
      return isErr(r)
        ? info(c, r.content)
        : info(
            {
              ...c,
              flow: {
                ...createFlow(r.content.drawing),
                camera: r.content.drawing.camera,
              },
            },
            [
              "図面を移行しました",
              ...r.content.warnings,
            ].join("\n"),
          );
    },
  },
  {
    id: "fit",
    name: "選択範囲にズーム",
    section: "選択・調査",
    run: (c) => {
      const selected = new Set(ids(c));
      if (!selected.size)
        return info(c, "範囲を選択してください");
      return {
        ...c,
        flow: {
          ...c.flow,
          camera: fitFlow({
            ...c.flow,
            nodes: c.flow.nodes.filter((n) =>
              selected.has(n.id),
            ),
          }).camera,
        },
      };
    },
  },
];
import {
  toggleFavorite,
  togglePreset,
} from "./toolContext";
export const workbench = (
  c: ToolContext,
): Html<ToolEdit> => {
  const query = c.tools.query
      .toLocaleLowerCase()
      .trim(),
    matching = tools.filter((t) =>
      (t.name + " " + t.id + " " + t.section)
        .toLocaleLowerCase()
        .includes(query),
    );
  const cmd =
    matching.find(
      (t) => t.id === c.tools.command,
    ) ?? matching[0];
  const update =
    (patch: Partial<ToolState>): ToolEdit =>
    (c) => ({
      ...c,
      tools: { ...c.tools, ...patch },
    });
  const search = el(
    "input",
    [
      attr("type", "search"),
      attr("aria-label", "ツール検索"),
      attr("placeholder", "ツール名・分類で検索"),
      attr("value", c.tools.query),
      onInput((v) => update({ query: v })),
    ],
    [],
  );
  if (!cmd)
    return el(
      "details",
      [attr("class", "editing-tools")],
      [
        el("summary", [], [text("編集ツール")]),
        el(
          "div",
          [],
          [
            search,
            text("一致するツールはありません"),
          ],
        ),
      ],
    );
  const presets = c.tools.presets.filter(
    (p) => p.command === cmd.id,
  );
  const favoriteIds = new Set(c.tools.favorites);
  const sectionOf = (tool: Command) =>
    favoriteIds.has(tool.id)
      ? "お気に入り"
      : tool.section;
  const table = cmd.table?.(c);
  return el(
    "details",
    [attr("class", "editing-tools")],
    [
      el("summary", [], [text("編集ツール")]),
      el(
        "div",
        [],
        [
          search,
          el(
            "select",
            [
              attr("aria-label", "編集コマンド"),
              attr("value", cmd.id),
              onChange((v) =>
                update({
                  command: v,
                  report: "",
                  argument: "",
                }),
              ),
            ],
            [
              ...new Set(
                [
                  "お気に入り",
                  ...matching.map(sectionOf),
                ].filter(
                  (section) =>
                    section !== "お気に入り" ||
                    matching.some((t) =>
                      favoriteIds.has(t.id),
                    ),
                ),
              ),
            ].map((section) =>
              el(
                "optgroup",
                [attr("label", section)],
                matching
                  .filter(
                    (t) =>
                      sectionOf(t) === section,
                  )
                  .map((t) =>
                    el(
                      "option",
                      [
                        attr("value", t.id),
                        ...(t.id === cmd.id
                          ? [attr("selected", "")]
                          : []),
                      ],
                      [text(t.name)],
                    ),
                  ),
              ),
            ),
          ),
          ...(cmd.argument
            ? [
                el(
                  "label",
                  [],
                  [
                    text(cmd.argument),
                    el(
                      "input",
                      [
                        attr(
                          "value",
                          c.tools.argument,
                        ),
                        onInput((v) =>
                          update({ argument: v }),
                        ),
                      ],
                      [],
                    ),
                  ],
                ),
              ]
            : []),
          ...(cmd.document
            ? [
                el(
                  "textarea",
                  [
                    attr(
                      "aria-label",
                      "図面 JSON",
                    ),
                    attr(
                      "value",
                      c.tools.document,
                    ),
                    onInput((v) =>
                      update({ document: v }),
                    ),
                  ],
                  [],
                ),
              ]
            : []),
          el(
            "button",
            [onClick(cmd.run)],
            [text("実行")],
          ),
          el(
            "button",
            [
              attr(
                "aria-pressed",
                String(favoriteIds.has(cmd.id)),
              ),
              onClick<ToolEdit>((state) => ({
                ...state,
                tools: {
                  ...state.tools,
                  favorites: toggleFavorite(
                    state.tools.favorites,
                    cmd.id,
                  ),
                },
              })),
            ],
            [
              text(
                favoriteIds.has(cmd.id)
                  ? "お気に入りから外す"
                  : "お気に入りに追加",
              ),
            ],
          ),
          ...(cmd.argument && c.tools.argument
            ? [
                el(
                  "button",
                  [
                    onClick<ToolEdit>((s) => ({
                      ...s,
                      tools: {
                        ...s.tools,
                        presets: togglePreset(
                          s.tools.presets,
                          cmd.id,
                          s.tools.argument,
                        ),
                      },
                    })),
                  ],
                  [
                    text(
                      presets.some(
                        (p) =>
                          p.argument ===
                          c.tools.argument,
                      )
                        ? "この引数の登録を解除"
                        : "この引数を登録",
                    ),
                  ],
                ),
              ]
            : []),
          ...(cmd.argument && presets.length
            ? [
                el(
                  "label",
                  [],
                  [
                    text("登録済みの引数"),
                    el(
                      "select",
                      [
                        attr(
                          "aria-label",
                          "登録済みの引数",
                        ),
                        attr(
                          "value",
                          c.tools.argument,
                        ),
                        onChange((value) =>
                          update({
                            argument: value,
                            report: "",
                          }),
                        ),
                      ],
                      [
                        el(
                          "option",
                          [attr("value", "")],
                          [text("引数を選択")],
                        ),
                        ...presets.map((p) =>
                          el(
                            "option",
                            [
                              attr(
                                "value",
                                p.argument,
                              ),
                              ...(p.argument ===
                              c.tools.argument
                                ? [
                                    attr(
                                      "selected",
                                      "",
                                    ),
                                  ]
                                : []),
                            ],
                            [text(p.argument)],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : []),
          ...(table?.rows.length
            ? [
                el(
                  "table",
                  [attr("aria-label", cmd.name)],
                  [
                    el(
                      "thead",
                      [],
                      [
                        el(
                          "tr",
                          [],
                          table.headers.map((h) =>
                            el(
                              "th",
                              [
                                attr(
                                  "scope",
                                  "col",
                                ),
                              ],
                              [text(h)],
                            ),
                          ),
                        ),
                      ],
                    ),
                    el(
                      "tbody",
                      [],
                      table.rows.map((row) =>
                        el(
                          "tr",
                          [],
                          row.map((cell) =>
                            el(
                              "td",
                              [],
                              [text(cell)],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ]
            : []),
          el(
            "output",
            [attr("aria-live", "polite")],
            [
              text(c.tools.report),
              ...(c.flow.marks ?? []).flatMap(
                (m) =>
                  m.id === c.flow.activeMark &&
                  m.kind === "review"
                    ? [
                        el(
                          "ol",
                          [],
                          m.messages.map(
                            (message) =>
                              el(
                                "li",
                                [],
                                [text(message)],
                              ),
                          ),
                        ),
                      ]
                    : [],
              ),
            ],
          ),
        ],
      ),
    ],
  );
};
