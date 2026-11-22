import { groupReviewCoverage } from "plgg-flow/annotations";
import {
  sectionOffsets,
  foregroundOverlaps,
  routeDetours,
} from "plgg-flow/spatial";
import {
  compareCardData,
  auditNodeData,
  matchesData,
  isJsonObject,
} from "plgg-flow/metadata";
import {
  portPairCounts,
  typeDependencyPolicy,
  auditBoundaries,
  inventoryTypes,
  auditPortContracts,
} from "plgg-flow/connections";
import {
  alternativeWiring,
  commonOrigins,
  feedbackEdges,
  mandatoryRoute,
  minimumWireCut,
  routeCorridor,
} from "plgg-flow/topology";
import {
  reactFlowExportLosses,
  saveDrawing,
} from "plgg-flow/interchange";
import {
  interfaceCover,
  groupTotals,
  groupLoads,
  settingImpact,
  inheritedData,
  summarizeBranches,
  boundaryConnections,
} from "plgg-flow/hierarchy";
import type { Edge } from "plgg-flow";
import { isErr } from "plgg";
import {
  resourceSchedule,
  readyCards,
  repeatedProcessors,
  cheapestRoute,
  bridgeEdges,
  articulationNodes,
  colorClasses,
  cycleWitness,
  criticalSchedule,
  islands,
  neighborhood,
  topologicalOrder,
} from "plgg-flow/analysis";
import {
  choose,
  ids,
  info,
  type Command,
} from "./toolContext";
export const analysisTools: readonly Command[] = [
  {
    id: "group-review-coverage",
    name: "グループ別のレビュー実施状況を確認",
    section: "レビュー",
    run: (c) => {
      const rows = groupReviewCoverage(
        c.flow,
        c.flow.marks ?? [],
      );
      return info(
        c,
        rows.length
          ? rows
              .map(
                (r) =>
                  r.id +
                  "　レビュー記録あり " +
                  r.reviewed +
                  "/" +
                  r.cards +
                  " 枚　未解決 " +
                  r.open +
                  " 件（未担当 " +
                  r.unassigned +
                  " 件）",
              )
              .join("\n")
          : "グループはありません",
      );
    },
  },
  {
    id: "card-references",
    name: "カード ID の参照元を調べる",
    section: "構造編集",
    run: (c) => {
      const [node, ...others] = ids(c);
      if (!node || others.length)
        return info(
          c,
          "参照元を調べるカードを一枚選択してください",
        );
      const f = c.flow,
        rows: string[] = [];
      for (const child of f.nodes)
        if (child.parent === node)
          rows.push("子カード　" + child.id);
      for (const edge of f.edges)
        if (
          edge.source === node ||
          edge.target === node
        )
          rows.push(
            "配線　" +
              (edge.id ?? "") +
              "　" +
              edge.source +
              " → " +
              edge.target,
          );
      for (const set of f.sets ?? [])
        if (set.members.includes(node))
          rows.push("保存した選択　" + set.name);
      for (const mark of f.marks ?? [])
        if (
          mark.kind === "review" &&
          mark.node === node
        )
          rows.push("注釈　" + mark.id);
      for (const dim of f.spatial?.dimensions ??
        [])
        if (dim.nodes.includes(node))
          rows.push(
            "寸法　" + dim.nodes.join(" → "),
          );
      if (f.spatial?.pivot === node)
        rows.push("カメラの回転中心");
      return info(
        c,
        rows.join("\n") ||
          "図面内の参照元はありません",
      );
    },
  },
  {
    id: "export-losses",
    name: "React Flow 書き出しで失われる設定を確認",
    section: "入出力",
    run: (c) => {
      const rows = reactFlowExportLosses(c.flow);
      return info(
        c,
        rows.length
          ? rows
              .map((r) =>
                [
                  r.kind,
                  r.id,
                  r.fields.join("、"),
                ]
                  .filter(Boolean)
                  .join("　"),
              )
              .join("\n")
          : "対象となる独自設定はありません",
      );
    },
  },
  {
    id: "resource-schedule",
    name: "担当者の同時作業数を考慮して日程を算出",
    section: "依存解析",
    argument:
      "担当者ごとの同時作業数（既定 1）。data.owner が担当者、data.duration が所要時間",
    run: (c) => {
      const schedule = resourceSchedule(
        c.flow,
        Number(c.tools.argument.trim() || 1),
      );
      if (isErr(schedule))
        return info(c, schedule.content);
      return info(
        c,
        schedule.content
          .map(
            (t) =>
              t.id +
              "　" +
              (t.owner ?? "未担当") +
              "　" +
              t.start +
              " → " +
              t.finish,
          )
          .join("\n") || "カードはありません",
      );
    },
  },
  {
    id: "ready-cards",
    name: "前提作業がすべて完了したカードを選択",
    section: "依存解析",
    argument:
      "完了を示す data の項目名（既定 done、true で完了）",
    run: (c) => {
      const key =
        c.tools.argument.trim() || "done";
      const done = c.flow.nodes
        .filter((n) => n.data?.[key] === true)
        .map((n) => n.id);
      const ready = readyCards(c.flow, done);
      return info(
        choose(c, ready),
        ready.length
          ? "着手可能：" + ready.join("、")
          : done.length === c.flow.nodes.length
            ? "すべて完了しました"
            : "未完了の前提作業を待っています",
      );
    },
  },
  {
    id: "feedback-edges",
    name: "全循環を解消する配線の候補を調べる",
    section: "依存解析",
    run: (c) => {
      const edges = feedbackEdges(c.flow);
      return info(
        c,
        edges.length
          ? [
              "以下をすべて外すと循環が解消します（最小本数とは限りません）",
              ...edges.map(
                (e) =>
                  (e.id ? e.id + " · " : "") +
                  e.source +
                  (e.sourceHandle
                    ? " [" + e.sourceHandle + "]"
                    : "") +
                  " → " +
                  e.target +
                  (e.targetHandle
                    ? " [" + e.targetHandle + "]"
                    : ""),
              ),
            ].join("\n")
          : "循環はありません",
      );
    },
  },
  {
    id: "repeated-processors",
    name: "同じ入力・設定を持つ兄弟カードを抽出",
    section: "依存解析",
    run: (c) => {
      const groups = repeatedProcessors(c.flow);
      return groups.length
        ? info(
            choose(c, groups.flat()),
            groups
              .map((g) => g.join("、"))
              .join("\n"),
          )
        : info(
            c,
            "一致する兄弟カードはありません",
          );
    },
  },
  {
    id: "compare-card-data",
    name: "選択カードの設定を横並びで比較",
    section: "選択・調査",
    table: (c) => {
      const selected = ids(c);
      const comparison = compareCardData(
        c.flow,
        selected.length >= 2 ? selected : [],
      );
      return {
        headers: [
          "項目",
          "判定",
          ...comparison.ids,
        ],
        rows: comparison.rows.map((r) => [
          r.key,
          r.same ? "一致" : "相違",
          ...r.values.map((v) =>
            v === undefined
              ? "（未定義）"
              : JSON.stringify(v),
          ),
        ]),
      };
    },
    run: (c) =>
      info(
        c,
        ids(c).length < 2
          ? "比較するカードを二枚以上選んでください"
          : "明示的に保存された設定を比較しています",
      ),
  },
  {
    id: "port-pairs",
    name: "二枚のカード間のポート別配線表",
    section: "接続",
    table: (c) => {
      const [source, target, ...rest] = ids(c);
      const pairs =
        source && target && !rest.length
          ? portPairCounts(c.flow, source, target)
          : [];
      return {
        headers: [
          "出力ポート",
          "入力ポート",
          "本数",
        ],
        rows: pairs.map((p) => [
          p.output ?? "（既定）",
          p.input ?? "（既定）",
          String(p.count),
        ]),
      };
    },
    run: (c) => {
      const [source, target, ...rest] = ids(c);
      if (!source || !target || rest.length)
        return info(
          c,
          "出力側、入力側の順にカードを二枚選択してください",
        );
      return info(
        c,
        source +
          " → " +
          target +
          " の配線 " +
          portPairCounts(
            c.flow,
            source,
            target,
          ).reduce((n, p) => n + p.count, 0) +
          " 本",
      );
    },
  },
  {
    id: "interface-cover",
    name: "二つの枝の間の全配線を受け持つ最少カードを選択",
    section: "依存解析",
    run: (c) => {
      const [first, second, ...rest] = ids(c);
      if (!first || !second || rest.length)
        return info(
          c,
          "互いに独立した枝を二つ選んでください",
        );
      const cover = interfaceCover(
        c.flow,
        first,
        second,
      );
      return cover.length
        ? info(
            choose(c, cover),
            cover.length +
              " 枚で全境界配線をカバー：" +
              cover.join("、"),
          )
        : info(
            c,
            "独立した二つの枝を結ぶ配線がありません",
          );
    },
  },
  {
    id: "group-totals",
    name: "グループ別に数値項目を集計",
    section: "構造編集",
    argument:
      "集計する data の項目名（例：工数）",
    run: (c) => {
      const key = c.tools.argument.trim();
      if (!key)
        return info(
          c,
          "数値項目の名前を指定してください",
        );
      const rows = groupTotals(c.flow, key);
      return info(
        c,
        rows
          .map(
            (r) =>
              r.id +
              "　" +
              key +
              " 合計 " +
              r.total +
              "（数値 " +
              r.samples +
              " 件、対象外 " +
              (r.cards - r.samples) +
              " 件）",
          )
          .join("\n") || "グループはありません",
      );
    },
  },
  {
    id: "group-loads",
    name: "カード数の上限を超えたグループを抽出",
    section: "構造編集",
    argument:
      "グループ内のカード数の上限（子孫を含む、空欄は 20）",
    run: (c) => {
      const limit = Number(
        c.tools.argument.trim() || 20,
      );
      if (
        !Number.isSafeInteger(limit) ||
        limit < 0
      )
        return info(
          c,
          "0 以上の整数を指定してください",
        );
      const over = groupLoads(c.flow)
        .filter((g) => g.cards > limit)
        .sort((a, b) => b.cards - a.cards);
      return over.length
        ? info(
            choose(
              c,
              over.map((g) => g.id),
            ),
            over
              .map(
                (g) =>
                  g.id +
                  "　" +
                  g.cards +
                  " 枚（超過 " +
                  (g.cards - limit) +
                  "）",
              )
              .join("\n"),
          )
        : info(
            c,
            "上限を超えたグループはありません",
          );
    },
  },
  {
    id: "audit-boundaries",
    name: "既存配線のグループ境界違反を調べる",
    section: "依存解析",
    run: (c) => {
      const findings = auditBoundaries(c.flow);
      if (!findings.length)
        return info(
          c,
          "グループ境界に違反する配線はありません",
        );
      return info(
        c,
        findings
          .map(
            ({ edge, group }) =>
              (edge.id ? edge.id + " · " : "") +
              edge.source +
              " → " +
              edge.target +
              "　境界 " +
              group.id +
              " （" +
              group.boundary +
              "）",
          )
          .join("\n"),
      );
    },
  },
  {
    id: "setting-impact",
    name: "設定変更の影響範囲と上書き箇所を調べる",
    section: "構造編集",
    argument: "定義元の data の項目名",
    run: (c) => {
      const selected = ids(c),
        key = c.tools.argument.trim();
      if (selected.length !== 1 || !key)
        return info(
          c,
          "定義元を一つ選び、項目名を指定してください",
        );
      const impact = settingImpact(
        c.flow,
        selected[0]!,
        key,
      );
      if (!impact.declared)
        return info(
          c,
          "選択カードにその項目の定義がありません",
        );
      return info(
        c,
        "変更が及ぶ子孫：" +
          (impact.affected.join("、") || "なし") +
          "\n上書きで止まる箇所：" +
          (impact.overrides.join("、") || "なし"),
      );
    },
  },
  {
    id: "inherited-data",
    name: "親から継承した設定と定義元を調べる",
    section: "構造編集",
    run: (c) => {
      const selected = ids(c);
      if (selected.length !== 1)
        return info(
          c,
          "設定を調べるカードを一つ選択してください",
        );
      const fields = inheritedData(
        c.flow,
        selected[0]!,
      );
      return info(
        c,
        Array.from(
          fields,
          ([key, field]) =>
            key +
            " = " +
            JSON.stringify(field.value) +
            " （定義元 " +
            field.owner +
            "）",
        ).join("\n") || "設定はありません",
      );
    },
  },
  {
    id: "section-offsets",
    name: "3枚を通る基準面からのずれを測る",
    section: "空間",
    run: (c) => {
      const anchors = ids(c),
        plane = sectionOffsets(c.flow, anchors);
      if (!plane)
        return info(
          c,
          "一直線上にない3枚のカードを選択してください",
        );
      return info(
        c,
        [
          "基準面 " +
            anchors.join(" → ") +
            "　地面からの傾斜 " +
            plane.inclination.toFixed(2) +
            "°",
          ...plane.offsets.map(
            (row) =>
              row.id +
              "　符号付き距離 " +
              row.distance.toFixed(3),
          ),
        ].join("\n"),
      );
    },
  },
  {
    id: "foreground-overlaps",
    name: "手前で重なるカードを調べる",
    section: "空間",
    run: (c) => {
      const [target, ...other] = ids(c);
      if (!target || other.length)
        return info(
          c,
          "調べるカードを一つ選択してください",
        );
      const overlaps = foregroundOverlaps(
        c.flow,
        target,
      );
      return info(
        c,
        overlaps.length
          ? overlaps
              .map(
                ({ id, fraction }) =>
                  id +
                  "　対象カードとの重なり " +
                  (100 * fraction).toFixed(1) +
                  "%",
              )
              .join("\n")
          : "手前に重なるカードはありません",
      );
    },
  },
  {
    id: "route-detours",
    name: "折れ点による配線の迂回距離を検査",
    section: "空間",
    run: (c) => {
      const selected = new Set(ids(c));
      const rows = routeDetours(c.flow).filter(
        ({ edge }) =>
          !selected.size ||
          selected.has(edge.source) ||
          selected.has(edge.target),
      );
      return info(
        c,
        rows.length
          ? [
              "ノード中心を基準とするワールド距離（迂回の大きい順）",
              ...rows.map(
                ({
                  edge,
                  length,
                  direct,
                  extra,
                }) =>
                  (edge.id ??
                    edge.source +
                      " → " +
                      edge.target) +
                  "　直線 " +
                  direct.toFixed(2) +
                  "　折れ線 " +
                  length.toFixed(2) +
                  "　差 " +
                  extra.toFixed(2),
              ),
            ].join("\n")
          : "対象の配線はありません",
      );
    },
  },
  {
    id: "match-data",
    name: "設定項目の組み合わせで選択",
    section: "選択・調査",
    document: true,
    run: (c) => {
      let pattern: unknown;
      try {
        pattern = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          "一致させたい設定を JSON オブジェクトで入力してください",
        );
      }
      if (!isJsonObject(pattern))
        return info(
          c,
          "設定の条件には JSON オブジェクトを指定してください",
        );
      return choose(
        c,
        c.flow.nodes
          .filter((n) =>
            matchesData(n.data, pattern),
          )
          .map((n) => n.id),
      );
    },
  },
  {
    id: "audit-type-dependencies",
    name: "ノード型間の依存ルールを検査",
    section: "移行・検査",
    document: true,
    run: (c) => {
      let rules: unknown;
      try {
        rules = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          '定義例 {"ui":["service"],"service":["storage"],"storage":[]}',
        );
      }
      const policy = typeDependencyPolicy(rules);
      if (isErr(policy))
        return info(c, policy.content);
      const invalid = c.flow.edges.filter(
        (e) => !policy.content(e, c.flow),
      );
      return info(
        c,
        invalid.length
          ? invalid
              .map(
                (e) =>
                  (e.id ? e.id + " · " : "") +
                  e.source +
                  " → " +
                  e.target,
              )
              .join("\n")
          : "型間の依存ルールに違反する配線はありません",
      );
    },
  },
  {
    id: "audit-data",
    name: "型別の必須設定を検査",
    section: "移行・検査",
    document: true,
    run: (c) => {
      let rules: unknown;
      try {
        rules = JSON.parse(c.tools.document);
      } catch {
        return info(
          c,
          '定義例 {"worker":{"owner":"string","limit":"number"}}',
        );
      }
      const report = auditNodeData(c.flow, rules);
      return info(
        c,
        isErr(report)
          ? report.content
          : report.content.join("\n") ||
              "必須設定の違反はありません",
      );
    },
  },
  {
    id: "inventory-types",
    name: "ノード型の使用数とポート定義を棚卸し",
    section: "移行・検査",
    run: (c) => {
      const report = inventoryTypes(c.flow).map(
        ({ type, count, definitions }) =>
          type +
          "　" +
          count +
          " ノード・" +
          definitions.length +
          " 定義" +
          (definitions.length > 1
            ? "\n" +
              definitions
                .map(
                  (v, i) =>
                    "  定義 " +
                    (i + 1) +
                    "：" +
                    v.members.join("、"),
                )
                .join("\n")
            : ""),
      );
      return info(
        c,
        report.join("\n") || "ノードはありません",
      );
    },
  },
  {
    id: "audit-ports",
    name: "既存配線のポート制約を検査",
    section: "接続",
    run: (c) => {
      const findings = auditPortContracts(c.flow);
      return info(
        c,
        findings
          .map(
            (f) =>
              f.node +
              " [" +
              f.port.id +
              "] " +
              f.message +
              " · " +
              f.edges
                .map(
                  (e) =>
                    e.id ??
                    e.source + " → " + e.target,
                )
                .join("、"),
          )
          .join("\n") ||
          "ポート制約の違反はありません",
      );
    },
  },
  {
    id: "common-origins",
    name: "2点の直近の共通起点を調べる",
    section: "依存解析",
    run: (c) => {
      const [a, b, ...rest] = ids(c);
      if (!a || !b || rest.length)
        return info(
          c,
          "比較するノードを二つ選択してください",
        );
      const origins = commonOrigins(c.flow, a, b);
      return origins.length
        ? info(
            choose(c, origins),
            origins.join("、"),
          )
        : info(c, "共通の起点はありません");
    },
  },
  {
    id: "mandatory-route",
    name: "全経路が必ず通る中継カードを調べる",
    section: "依存解析",
    run: (c) => {
      const [start, end, ...rest] = ids(c);
      if (!start || !end || rest.length)
        return info(
          c,
          "始点と終点を順に選択してください",
        );
      const chain = mandatoryRoute(
        c.flow,
        start,
        end,
      );
      if (!chain.length)
        return info(
          c,
          "始点から終点へ到達できません",
        );
      const through = chain.slice(1, -1);
      return through.length
        ? info(
            choose(c, through),
            "必須の中継順：" +
              through.join(" → "),
          )
        : info(c, "必須の中継カードはありません");
    },
  },
  {
    id: "minimum-wire-cut",
    name: "始点から終点を切り離す最少の配線を調べる",
    section: "依存解析",
    run: (c) => {
      const [source, target, ...rest] = ids(c);
      if (!source || !target || rest.length)
        return info(
          c,
          "始点と終点を順に選択してください",
        );
      const cut = minimumWireCut(
        c.flow,
        source,
        target,
      );
      return info(
        c,
        cut.length
          ? [
              "切り離しに必要な最少配線数：" +
                cut.length,
              ...cut.map(
                (e) =>
                  (e.id ?? "") +
                  "　" +
                  e.source +
                  " → " +
                  e.target,
              ),
            ].join("\n")
          : "始点から終点へ到達できません",
      );
    },
  },
  {
    id: "route-corridor",
    name: "始点と終点を結ぶ全分岐を抽出",
    section: "依存解析",
    run: (c) => {
      const [start, end, ...rest] = ids(c);
      if (!start || !end || rest.length)
        return info(
          c,
          "始点と終点を順に選択してください",
        );
      const members = routeCorridor(
        c.flow,
        start,
        end,
      );
      return members.length
        ? info(
            choose(c, members),
            members.join("、"),
          )
        : info(c, "始点から終点へ到達できません");
    },
  },
  {
    id: "group-summary",
    name: "グループ間の配線を集約した図面を生成",
    section: "依存解析",
    document: true,
    run: (c) => {
      const selected = ids(c);
      if (selected.length > 1)
        return info(
          c,
          "図面全体は選択なし、内部を集約する場合はグループを一つ選択してください",
        );
      const graph = summarizeBranches(
        c.flow,
        selected[0],
      );
      if (!graph.nodes.length)
        return info(c, "集約する枝がありません");
      return {
        ...c,
        tools: {
          ...c.tools,
          document: saveDrawing({
            ...graph,
            camera: c.flow.camera,
          }),
          report:
            graph.nodes.length +
            " 個の枝を集約しました。生成した図面 JSON を読み込んで開けます",
        },
      };
    },
  },
  {
    id: "boundary",
    name: "グループ境界の入出力を調べる",
    section: "依存解析",
    run: (c) => {
      const roots = ids(c);
      if (!roots.length)
        return info(
          c,
          "調べるグループを選択してください",
        );
      const { inputs, outputs } =
        boundaryConnections(c.flow, roots);
      const endpoint = (
        id: string,
        handle?: string,
      ) =>
        handle === undefined
          ? id
          : id + " [" + handle + "]";
      const describe = (edge: Edge) =>
        endpoint(edge.source, edge.sourceHandle) +
        " → " +
        endpoint(edge.target, edge.targetHandle) +
        (edge.id ? " (" + edge.id + ")" : "");
      return info(
        c,
        [
          "入力 " + inputs.length + " 件",
          ...inputs.map(describe),
          "出力 " + outputs.length + " 件",
          ...outputs.map(describe),
        ].join("\n"),
      );
    },
  },
  {
    id: "cheapest-route",
    name: "配線コストが最小の経路を調べる",
    section: "依存解析",
    argument:
      "配線 data の数値キー（既定 cost、未設定は 1）",
    run: (c) => {
      const [a, b, ...remaining] = ids(c);
      if (!a || !b || remaining.length)
        return info(
          c,
          "始点と終点を順に選択してください",
        );
      const path = cheapestRoute(
        c.flow,
        a,
        b,
        c.tools.argument.trim() || "cost",
      );
      if (isErr(path))
        return info(c, path.content);
      return info(
        choose(c, [
          a,
          ...path.content.edges.map(
            (e) => e.target,
          ),
        ]),
        "合計 " +
          path.content.cost +
          " · " +
          path.content.edges
            .map(
              (e) =>
                e.id ??
                e.source + " → " + e.target,
            )
            .join("、"),
      );
    },
  },
  {
    id: "alternative-wire",
    name: "選択配線を外した場合の代替経路を調査",
    section: "依存解析",
    run: (c) => {
      const wire = c.flow.activeEdge;
      if (!wire)
        return info(
          c,
          "調べる配線を選択してください",
        );
      const path = alternativeWiring(
        c.flow,
        wire,
      );
      const endpoint = (
        id: string,
        port?: string,
      ) =>
        port === undefined
          ? id
          : id + " [" + port + "]";
      return info(
        c,
        path.length
          ? path
              .map(
                (e) =>
                  (e.id ? e.id + "　" : "") +
                  endpoint(
                    e.source,
                    e.sourceHandle,
                  ) +
                  " → " +
                  endpoint(
                    e.target,
                    e.targetHandle,
                  ),
              )
              .join("\n")
          : "同じ終点に届く別の有向経路はありません",
      );
    },
  },
  {
    id: "bridge-edges",
    name: "切れると図が分断される配線を検出",
    section: "依存解析",
    run: (c) => {
      const edges = bridgeEdges(c.flow);
      return info(
        c,
        edges.length
          ? edges
              .map(
                (e) =>
                  (e.id ? e.id + "　" : "") +
                  e.source +
                  " → " +
                  e.target,
              )
              .join("\n")
          : "一本の切断で分断される配線はありません",
      );
    },
  },
  {
    id: "cutpoints",
    name: "切断点を検出",
    section: "依存解析",
    run: (c) =>
      choose(c, articulationNodes(c.flow)),
  },
  {
    id: "island",
    name: "独立した連結成分を抽出",
    section: "依存解析",
    run: (c) => {
      const id = ids(c)[0];
      if (!id)
        return info(c, "起点を選択してください");
      const groups = islands(c.flow);
      return choose(
        c,
        groups.find((g) => g.includes(id)) ?? [],
      );
    },
  },
  {
    id: "explain-cycle",
    name: "閉路を実際の経路で説明",
    section: "依存解析",
    run: (c) => {
      const path = cycleWitness(c.flow);
      return info(
        c,
        path.length
          ? path.join(" → ")
          : "閉路はありません",
      );
    },
  },
  {
    id: "sort-dependencies",
    name: "実行可能な依存順を求める",
    section: "依存解析",
    run: (c) => {
      const order = topologicalOrder(c.flow);
      return info(
        c,
        isErr(order)
          ? order.content
          : order.content.join(" → "),
      );
    },
  },
  {
    id: "critical",
    name: "所要時間からクリティカルパスを特定",
    section: "依存解析",
    run: (c) => {
      const durations = new Map(
        c.flow.nodes.map((n) => [
          n.id,
          typeof n.data?.duration === "number"
            ? n.data.duration
            : 1,
        ]),
      );
      const result = criticalSchedule(
        c.flow,
        (id) => durations.get(id) ?? 1,
      );
      if (isErr(result))
        return info(c, result.content);
      const critical = [...result.content.tasks]
        .filter(
          ([, t]) => Math.abs(t.slack) < 1e-9,
        )
        .map(([id]) => id);
      return info(
        choose(c, critical),
        "合計 " +
          result.content.duration +
          " · 余裕時間ゼロ：" +
          critical.join("、"),
      );
    },
  },
  {
    id: "impact",
    name: "変更の波及範囲を調査",
    section: "依存解析",
    argument: "何段先まで調べるか",
    run: (c) => {
      const r = Number(c.tools.argument || 2);
      return Number.isInteger(r) &&
        r >= 0 &&
        ids(c).length
        ? choose(c, [
            ...neighborhood(c.flow, ids(c), r),
          ])
        : info(c, "起点と段数を指定してください");
    },
  },
  {
    id: "color-schedule",
    name: "隣接しない作業を同じ組に分ける",
    section: "依存解析",
    run: (c) => {
      const coloring = colorClasses(c.flow),
        groups = new Map<number, string[]>();
      for (const [id, color] of coloring) {
        const group = groups.get(color);
        if (group) group.push(id);
        else groups.set(color, [id]);
      }
      return info(
        c,
        [...groups]
          .sort(([a], [b]) => a - b)
          .map(
            ([i, group]) =>
              i + 1 + " 組：" + group.join("、"),
          )
          .join("\n"),
      );
    },
  },
];
