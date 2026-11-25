import { type SoftStr } from "plgg";
import { type Url } from "plgg-view/client";
import { type Scheme } from "plggmatic/style";

/** A toast the catalog is showing. */
export type Shown = Readonly<{
  id: SoftStr;
  tone: "success" | "danger" | "warning" | "info";
  message: SoftStr;
}>;

/**
 * The catalog's whole state. The screen — which pages are
 * open, left to right — is `head` and `rest`, read from the
 * address and written back to it; the rest is what the
 * examples on the pages hold so they can be operated.
 */
export type Model = Readonly<{
  path: SoftStr;
  head: SoftStr;
  rest: ReadonlyArray<SoftStr>;
  folded: boolean;
  scheme: Scheme;
  name: SoftStr;
  note: SoftStr;
  role: SoftStr;
  agree: boolean;
  dialog: boolean;
  shown: ReadonlyArray<Shown>;
  presses: number;
  saved: SoftStr;
  /** The property list's example: a diagram's settings. */
  layout: SoftStr;
  snap: SoftStr;
  acyclic: boolean;
  maxOut: SoftStr;
  /** Which appearance the catalog is wearing. */
  look: Look;
}>;

/** The appearances the catalog can be seen in. */
export type Look = "monochrome" | "soft";

export type Msg =
  | Readonly<{ kind: "UrlChanged"; url: Url }>
  | Readonly<{ kind: "ToggleFold" }>
  | Readonly<{ kind: "ToggleScheme" }>
  | Readonly<{ kind: "Done" }>
  | Readonly<{ kind: "Press" }>
  | Readonly<{ kind: "SetName"; value: SoftStr }>
  | Readonly<{ kind: "SetNote"; value: SoftStr }>
  | Readonly<{ kind: "SetRole"; value: SoftStr }>
  | Readonly<{ kind: "ToggleAgree" }>
  | Readonly<{ kind: "Save" }>
  | Readonly<{ kind: "OpenDialog" }>
  | Readonly<{ kind: "CloseDialog" }>
  | Readonly<{ kind: "ConfirmDialog" }>
  | Readonly<{
      kind: "Toast";
      tone: Shown["tone"];
    }>
  | Readonly<{ kind: "Dismiss"; id: SoftStr }>
  | Readonly<{
      kind: "SetLayout";
      value: SoftStr;
    }>
  | Readonly<{ kind: "SetSnap"; value: SoftStr }>
  | Readonly<{ kind: "ToggleAcyclic" }>
  | Readonly<{
      kind: "SetMaxOut";
      value: SoftStr;
    }>
  | Readonly<{ kind: "SetLook"; look: Look }>;

/** Typed constructors, so a handler never widens a literal. */
export const msg = {
  toggleFold: (): Msg => ({ kind: "ToggleFold" }),
  toggleScheme: (): Msg => ({
    kind: "ToggleScheme",
  }),
  done: (): Msg => ({ kind: "Done" }),
  press: (): Msg => ({ kind: "Press" }),
  setName: (value: SoftStr): Msg => ({
    kind: "SetName",
    value,
  }),
  setNote: (value: SoftStr): Msg => ({
    kind: "SetNote",
    value,
  }),
  setRole: (value: SoftStr): Msg => ({
    kind: "SetRole",
    value,
  }),
  toggleAgree: (): Msg => ({
    kind: "ToggleAgree",
  }),
  save: (): Msg => ({ kind: "Save" }),
  openDialog: (): Msg => ({ kind: "OpenDialog" }),
  closeDialog: (): Msg => ({
    kind: "CloseDialog",
  }),
  confirmDialog: (): Msg => ({
    kind: "ConfirmDialog",
  }),
  toast: (tone: Shown["tone"]): Msg => ({
    kind: "Toast",
    tone,
  }),
  dismiss: (id: SoftStr): Msg => ({
    kind: "Dismiss",
    id,
  }),
  setLayout: (value: SoftStr): Msg => ({
    kind: "SetLayout",
    value,
  }),
  setSnap: (value: SoftStr): Msg => ({
    kind: "SetSnap",
    value,
  }),
  toggleAcyclic: (): Msg => ({
    kind: "ToggleAcyclic",
  }),
  setMaxOut: (value: SoftStr): Msg => ({
    kind: "SetMaxOut",
    value,
  }),
  setLook: (look: Look): Msg => ({
    kind: "SetLook",
    look,
  }),
};
