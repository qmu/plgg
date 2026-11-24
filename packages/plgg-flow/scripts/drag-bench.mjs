// Drag bench: what one frame of dragging a node costs in the view (routing + building the SVG tree).
// Build first, then: node packages/plgg-flow/scripts/drag-bench.mjs
import { flowView } from "../dist/index.es.js";
import { parseSpec, specFlow } from "../dist/dsl.es.js";
import { wireGraph } from "../dist/wiring.es.js";
const N=[["Web",-420,-110],["Mobile",-420,10],["Gateway",-270,-50],["Auth",-90,-190],["Users",-90,-110],["Orders",-90,-30],["Catalog",-90,50],["Search",-90,130],["Queue",100,-80],["Payments",100,10],["Mailer",270,-140],["Ledger",270,-30],["Cache",100,130],["DB",270,90],["Audit",420,-30]]; const E=[["Web","Gateway"],["Mobile","Gateway"],["Gateway","Auth"],["Gateway","Users"],["Gateway","Orders"],["Gateway","Catalog"],["Gateway","Search"],["Orders","Queue"],["Orders","Payments"],["Queue","Mailer"],["Queue","Ledger"],["Payments","Ledger"],["Catalog","Cache"],["Search","Cache"],["Cache","DB"],["Users","DB"],["Orders","DB"],["Ledger","Audit"],["Mailer","Audit"],["Auth","Users"],["Payments","Orders"],["Audit","Gateway"],["DB","Catalog"]];
for (const style of ["", " step"]) {
  const r = parseSpec(N.map(n=>`node ${n[0]} at ${n[1]} ${n[2]}`).join("\n")+"\n"+E.map(e=>`${e[0]} -> ${e[1]}${style}`).join("\n")+"\n");
  let f = specFlow(r.content); const tv=[], tw=[];
  for (let i=1;i<=60;i++){ f = {...f, nodes: f.nodes.map(n=>n.id==="Orders"?{...n,position:{...n.position,x:-90+i*3,y:-30+Math.sin(i/6)*60}}:n)};
    let t=performance.now(); wireGraph({nodes:f.nodes,edges:f.edges}); tw.push(performance.now()-t);
    t=performance.now(); flowView(f); tv.push(performance.now()-t); }
  const q=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length*p)].toFixed(1);
  console.log(style||" curve","wireGraph med/p90",q(tw,.5),q(tw,.9),"| flowView (wires cached) med/p90",q(tv,.5),q(tv,.9));
}
