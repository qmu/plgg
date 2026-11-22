import { err, ok, type Result } from "plgg";
import {
  saveDrawing,
  loadDrawing,
  type Drawing,
} from "plgg-flow/interchange";
type Stored = Readonly<{
  name: string;
  revision: number;
  json: string;
}>;
export type Saved = Readonly<{
  drawing: Drawing;
  revision: number;
}>;
const entry = (v: unknown): v is Stored =>
  typeof v === "object" &&
  v !== null &&
  "name" in v &&
  typeof v.name === "string" &&
  "revision" in v &&
  Number.isSafeInteger(v.revision) &&
  "json" in v &&
  typeof v.json === "string";
/** Browser-only adapter. Each operation closes its connection; conditional
 * writes check the revision inside the same read/write transaction. */
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      "plgg-flow-documents",
      1,
    );
    request.onupgradeneeded = () =>
      request.result.createObjectStore(
        "drawings",
        { keyPath: "name" },
      );
    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve(request.result);
  });
const run = async <T>(
  operation: (
    db: IDBDatabase,
  ) => Promise<Result<T, string>>,
): Promise<Result<T, string>> => {
  try {
    const db = await database();
    try {
      return await operation(db);
    } finally {
      db.close();
    }
  } catch (e) {
    return err(
      e instanceof Error
        ? e.message
        : "Storage unavailable",
    );
  }
};
export const listDrawings = () =>
  run<readonly string[]>(
    (db) =>
      new Promise((resolve, reject) => {
        const keys = db
          .transaction("drawings")
          .objectStore("drawings")
          .getAllKeys();
        keys.onerror = () => reject(keys.error);
        keys.onsuccess = () =>
          resolve(
            ok(
              keys.result.filter(
                (k): k is string =>
                  typeof k === "string",
              ),
            ),
          );
      }),
  );
export const readDrawing = (name: string) =>
  run<Saved>(
    (db) =>
      new Promise((resolve, reject) => {
        const query = db
          .transaction("drawings")
          .objectStore("drawings")
          .get(name);
        query.onerror = () => reject(query.error);
        query.onsuccess = () => {
          const row: unknown = query.result;
          if (!entry(row)) {
            resolve(err("図面が見つかりません"));
            return;
          }
          const d = loadDrawing(row.json);
          resolve(
            d.__tag === "Err"
              ? d
              : ok({
                  drawing: d.content,
                  revision: row.revision,
                }),
          );
        };
      }),
  );
export const writeDrawing = (
  name: string,
  drawing: Drawing,
  expectedRevision: number,
) =>
  run<number>(
    (db) =>
      new Promise((resolve, reject) => {
        if (!name.trim()) {
          resolve(
            err("保存名を入力してください"),
          );
          return;
        }
        const json = saveDrawing(drawing),
          checked = loadDrawing(json);
        if (checked.__tag === "Err") {
          resolve(checked);
          return;
        }
        const tx = db.transaction(
            "drawings",
            "readwrite",
          ),
          table = tx.objectStore("drawings"),
          query = table.get(name);
        let next: Result<number, string> =
          err("保存に失敗しました");
        tx.oncomplete = () => resolve(next);
        tx.onabort = () => reject(tx.error);
        query.onsuccess = () => {
          const current: unknown = query.result,
            revision = entry(current)
              ? current.revision
              : 0;
          if (
            (current !== undefined &&
              !entry(current)) ||
            revision !== expectedRevision
          ) {
            next = err(
              "保存済みの版が変更されています。別名で保存するか、再度読み込んでください",
            );
            return;
          }
          const row: Stored = {
            name,
            revision: revision + 1,
            json,
          };
          table.put(row);
          next = ok(row.revision);
        };
      }),
  );

/** Move a saved document atomically. Concurrent readers can keep editing
 * their in-memory copy, but cannot overwrite the moved revision. */
export const renameDrawing = (
  source: string,
  destination: string,
  expectedRevision: number,
) =>
  run<number>(
    (db) =>
      new Promise((resolve, reject) => {
        if (
          !source ||
          !destination.trim() ||
          source === destination
        ) {
          resolve(
            err("新しい保存名を入力してください"),
          );
          return;
        }
        const tx = db.transaction(
            "drawings",
            "readwrite",
          ),
          table = tx.objectStore("drawings"),
          read = table.get(source),
          target = table.getKey(destination);
        let result: Result<number, string> = err(
          "名称を変更できませんでした",
        );
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error);
        target.onsuccess = () => {
          const row: unknown = read.result;
          if (
            !entry(row) ||
            row.revision !== expectedRevision
          ) {
            result = err(
              "保存済みの版が変更されています。再度読み込んでください",
            );
            return;
          }
          if (target.result !== undefined) {
            result = err(
              "同じ名前の図面があります",
            );
            return;
          }
          const revision = row.revision + 1;
          table.add({
            ...row,
            name: destination,
            revision,
          });
          table.delete(source);
          result = ok(revision);
        };
      }),
  );
