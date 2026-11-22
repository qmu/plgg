import { mountDiagram } from "plgg-ir-diagram/editor";
import { diagramCss } from "plgg-ir-diagram/widget";
const style = document.createElement("style");
style.textContent = diagramCss;
document.head.append(style);
const root = document.getElementById("diagram");
if (root)
  mountDiagram(
    root,
    `diagram orders {
  group shop "店舗" {
    node cart "カート" { out submit: Order }
  }
  node api "受注 API" { in receive: Order }
  edge checkout: cart.submit -> api.receive "注文を送る"
}`,
    true,
  );
