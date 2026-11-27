import {
  flowCss,
  flowWidget,
} from "plgg-ir-diagram/flow";
import { sheetTools } from "plgg-ir-diagram/flowSheet";
export default {
  parts: [
    {
      name: "plgg-flow",
      css: flowCss,
      render: flowWidget,
      tools: sheetTools,
      runtime: "plgg-ir-diagram/flow-interactive",
      lazy: true,
    },
  ],
};
