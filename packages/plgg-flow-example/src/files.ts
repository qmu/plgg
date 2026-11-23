import {
  isErr,
  none,
  some,
  type Option,
} from "plgg";
import {
  attr,
  el,
  onClick,
  onInput,
  onEvent,
  text,
  type Html,
} from "plgg-view";
import {
  graphvizDot,
  nodeInventoryCsv,
  saveDrawing,
  loadDrawing,
  importReactFlow,
  type Drawing,
} from "plgg-flow/interchange";
import {
  readDrawing,
  writeDrawing,
  renameDrawing,
  listDrawings,
} from "plgg-flow/storage";
import {
  drawingReader,
  svgImage,
} from "plgg-flow/imageExport";
import type { Flow } from "plgg-flow";

export type FileJob =
  | { kind: "open"; file: File }
  | {
      kind:
        | "save"
        | "rename"
        | "restore"
        | "list"
        | "html"
        | "dot"
        | "csv"
        | "json"
        | "svg"
        | "png";
    };
export type Files = Readonly<{
  name: string;
  opened: string;
  revision: number;
  sequence: number;
  job: Option<FileJob>;
  report: string;
  available: readonly string[];
}>;
export const initialFiles = (): Files => ({
  name: "",
  opened: "",
  revision: 0,
  sequence: 0,
  job: none(),
  report: "",
  available: [],
});
export type FileEdit = (files: Files) => Files;
const start =
  (job: FileJob): FileEdit =>
  (f) => ({
    ...f,
    sequence: f.sequence + 1,
    job: some(job),
    report: "処理中…",
  });
const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(
    () => URL.revokeObjectURL(url),
    30000,
  );
};
const png = async (svg: string) => {
  const url = URL.createObjectURL(
    new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas =
      document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1160;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas unavailable");
    ctx.fillStyle = "#e1ecf2";
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return await new Promise<Blob>(
      (resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(
                  new Error(
                    "PNG encoding failed",
                  ),
                ),
          "image/png",
        ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
};
type Outcome = Readonly<{
  report: string;
  drawing?: Drawing;
  revision?: number;
  available?: readonly string[];
}>;
export const perform = async (
  job: FileJob,
  f: Files,
  flow: Flow,
): Promise<Outcome> => {
  try {
    if (job.kind === "open") {
      if (job.file.size > 8_000_000)
        return {
          report: "ファイルは 8 MB までです",
        };
      const source = await job.file.text(),
        native = loadDrawing(source);
      if (!isErr(native))
        return {
          report: job.file.name,
          drawing: native.content,
        };
      const migrated = importReactFlow(source);
      return isErr(migrated)
        ? {
            report:
              native.content +
              " / " +
              migrated.content,
          }
        : {
            drawing: migrated.content.drawing,
            report: [
              job.file.name,
              ...migrated.content.warnings,
            ].join("\n"),
          };
    }
    if (job.kind === "list") {
      const names = await listDrawings();
      return isErr(names)
        ? { report: names.content }
        : {
            available: names.content,
            report:
              names.content.length + " 件の図面",
          };
    }
    if (job.kind === "restore") {
      const read = await readDrawing(f.name);
      return isErr(read)
        ? { report: read.content }
        : {
            drawing: read.content.drawing,
            revision: read.content.revision,
            report: "端末から読み込みました",
          };
    }
    if (job.kind === "rename") {
      const result = await renameDrawing(
        f.opened,
        f.name,
        f.revision,
      );
      return isErr(result)
        ? { report: result.content }
        : {
            revision: result.content,
            available: [
              ...new Set([
                ...f.available.filter(
                  (name) => name !== f.opened,
                ),
                f.name,
              ]),
            ].sort(),
            report: "保存名を変更しました",
          };
    }
    if (job.kind === "save") {
      const write = await writeDrawing(
        f.name,
        flow,
        f.name === f.opened ? f.revision : 0,
      );
      return isErr(write)
        ? { report: write.content }
        : {
            revision: write.content,
            report: "この端末に保存しました",
          };
    }
    if (job.kind === "csv") {
      saveBlob(
        new Blob(
          ["\uFEFF", nodeInventoryCsv(flow)],
          { type: "text/csv;charset=utf-8" },
        ),
        (f.name || "diagram") + ".csv",
      );
      return {
        report:
          flow.nodes.length +
          " 枚のカードを CSV に書き出しました",
      };
    }
    const blob =
      job.kind === "html"
        ? new Blob([drawingReader(flow)], {
            type: "text/html;charset=utf-8",
          })
        : job.kind === "dot"
          ? new Blob([graphvizDot(flow)], {
              type: "text/vnd.graphviz;charset=utf-8",
            })
          : job.kind === "json"
            ? new Blob([saveDrawing(flow)], {
                type: "application/json",
              })
            : job.kind === "png"
              ? await png(svgImage(flow))
              : new Blob([svgImage(flow)], {
                  type: "image/svg+xml;charset=utf-8",
                });
    saveBlob(
      blob,
      (f.name || "diagram") + "." + job.kind,
    );
    return { report: "ファイルを書き出しました" };
  } catch (e) {
    return {
      report:
        e instanceof Error
          ? e.message
          : "ファイル操作に失敗しました",
    };
  }
};
export const filesView = (
  f: Files,
): Html<FileEdit> =>
  el(
    "details",
    [
      attr("class", "editing-tools"),
      attr("open", ""),
    ],
    [
      el(
        "summary",
        [],
        [text("ファイルと端末保存")],
      ),
      el(
        "div",
        [],
        [
          el(
            "label",
            [],
            [
              text("図面名"),
              el(
                "input",
                [
                  attr("value", f.name),
                  onInput(
                    (name): FileEdit =>
                      (f) => ({ ...f, name }),
                  ),
                ],
                [],
              ),
            ],
          ),
          el(
            "label",
            [],
            [
              text("JSON ファイルを開く"),
              el(
                "input",
                [
                  attr("type", "file"),
                  attr(
                    "accept",
                    ".json,application/json",
                  ),
                  onEvent<FileEdit>(
                    "change",
                    (e) => {
                      if (
                        !(
                          e.target instanceof
                          HTMLInputElement
                        )
                      )
                        return none();
                      const file =
                        e.target.files?.[0];
                      e.target.value = "";
                      return file
                        ? some(
                            start({
                              kind: "open",
                              file,
                            }),
                          )
                        : none();
                    },
                  ),
                ],
                [],
              ),
            ],
          ),
          ...(
            [
              ["save", "この端末に保存"],
              [
                "rename",
                "開いた図面を入力名に変更",
              ],
              ["restore", "端末から読込"],
              ["list", "保存図面一覧"],
              [
                "html",
                "読み取り専用 HTML を書き出す",
              ],
              ["dot", "Graphviz DOT を書き出す"],
              ["json", "JSON をダウンロード"],
              [
                "csv",
                "カード一覧を CSV で書き出す",
              ],
              ["svg", "SVG を書き出す"],
              ["png", "PNG を書き出す"],
            ] satisfies [
              Exclude<FileJob["kind"], "open">,
              string,
            ][]
          ).map(([kind, label]) =>
            el(
              "button",
              [
                onClick(start({ kind })),
                ...(kind === "rename" &&
                (!f.opened ||
                  !f.name.trim() ||
                  f.name === f.opened)
                  ? [attr("disabled", "")]
                  : []),
              ],
              [text(label)],
            ),
          ),
          ...f.available.map((name) =>
            el(
              "button",
              [
                onClick<FileEdit>((s) =>
                  start({ kind: "restore" })({
                    ...s,
                    name,
                  }),
                ),
              ],
              [text(name)],
            ),
          ),
          el(
            "output",
            [attr("aria-live", "polite")],
            [text(f.report)],
          ),
        ],
      ),
    ],
  );
