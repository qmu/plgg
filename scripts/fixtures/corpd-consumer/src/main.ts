import { div, text } from "plgg-view";
import {
  application,
  cmdNone,
} from "plgg-view/client";

export const mount = application<number, number>({
  init: () => [0, cmdNone()],
  update: (msg) => [msg, cmdNone()],
  view: (model) => div([], [text(String(model))]),
  onUrlChange: () => 0,
});
