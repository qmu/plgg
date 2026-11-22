import { addNode } from "plgg-flow";
import { isErr } from "plgg";
import {
  templateFromNode,
  saveTemplates,
  loadTemplates,
} from "plgg-flow/interchange";
import { reserveId } from "plgg-flow/connections";
import {
  ids,
  info,
  type Command,
} from "./toolContext";

export const templateTools: readonly Command[] = [
  {
    id: "save-template",
    name: "ノードをひな形に登録",
    section: "ひな形",
    argument: "ひな形の名前（同名で更新）",
    run: (c) => {
      const name = c.tools.argument.trim(),
        selected = ids(c);
      const n = c.flow.nodes.find(
        (n) => n.id === selected[0],
      );
      if (
        !name ||
        name.length > 1024 ||
        !n ||
        selected.length !== 1
      )
        return info(
          c,
          "元のノードを一つ選択し、名前を入力してください",
        );
      const template = templateFromNode(n);
      const templates = new Map(
        c.tools.templates,
      );
      templates.set(name, template);
      return info(
        {
          ...c,
          tools: { ...c.tools, templates },
        },
        "ひな形を登録しました",
      );
    },
  },
  {
    id: "use-template",
    name: "ひな形からノードを作成",
    section: "ひな形",
    argument: "ひな形の名前（空欄で一覧）",
    run: (c) => {
      const name = c.tools.argument.trim();
      if (!name)
        return info(
          c,
          [...c.tools.templates.keys()].join(
            "、",
          ) || "登録されたひな形はありません",
        );
      const template =
        c.tools.templates.get(name);
      if (!template)
        return info(c, "ひな形が見つかりません");
      const selected = ids(c),
        anchor = c.flow.nodes.find(
          (n) => n.id === selected[0],
        );
      if (selected.length > 1)
        return info(
          c,
          "配置先を一つ選択してください",
        );
      const parent = anchor?.group
        ? anchor.id
        : anchor?.parent;
      const position = anchor
        ? {
            x:
              anchor.position.x +
              (anchor.group
                ? 0
                : ((anchor.width ?? 104) +
                    (template.width ?? 104)) /
                    2 +
                  24),
            y: anchor.position.y,
            z: anchor.position.z,
          }
        : { x: 0, y: 0, z: 0 };
      const id = reserveId(
        new Set(c.flow.nodes.map((n) => n.id)),
        name,
      );
      const flow = addNode({
        ...template,
        id,
        position,
        ...(parent === undefined
          ? {}
          : { parent }),
      })(c.flow);
      return info(
        { ...c, flow },
        "ひな形から " + id + " を作成しました",
      );
    },
  },
  {
    id: "export-templates",
    name: "ひな形集を書き出す",
    section: "ひな形",
    document: true,
    run: (c) => ({
      ...c,
      tools: {
        ...c.tools,
        document: saveTemplates(
          c.tools.templates,
        ),
        report:
          c.tools.templates.size +
          " 件のひな形を書き出しました",
      },
    }),
  },
  {
    id: "import-templates",
    name: "ひな形集を取り込む",
    section: "ひな形",
    document: true,
    run: (c) => {
      const loaded = loadTemplates(
        c.tools.document,
      );
      if (isErr(loaded))
        return info(c, loaded.content);
      const templates = new Map(
        c.tools.templates,
      );
      let added = 0;
      for (const [name, t] of loaded.content)
        if (!templates.has(name)) {
          templates.set(name, t);
          added++;
        }
      return info(
        {
          ...c,
          tools: { ...c.tools, templates },
        },
        added +
          " 件を追加しました。同名でスキップ：" +
          (loaded.content.size - added) +
          " 件",
      );
    },
  },
  {
    id: "delete-template",
    name: "ひな形の登録を解除",
    section: "ひな形",
    argument: "ひな形の名前",
    run: (c) => {
      const templates = new Map(
        c.tools.templates,
      );
      if (
        !templates.delete(c.tools.argument.trim())
      )
        return info(c, "ひな形が見つかりません");
      return info(
        {
          ...c,
          tools: { ...c.tools, templates },
        },
        "ひな形の登録を解除しました",
      );
    },
  },
];
