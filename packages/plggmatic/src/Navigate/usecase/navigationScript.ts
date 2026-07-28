import { type SoftStr } from "plgg";
import {
  stripAttr,
  columnAttr,
  navHookName,
} from "plggmatic/Navigate/model/marker";
import {
  restParam,
  spanParam,
  entrySeparator,
  fieldSeparator,
  escapeChar,
} from "plggmatic/Navigate/usecase/compositionUrl";

// plggmatic's SECOND browser runtime, built to the shape
// of its first (`appearanceInitScript`): one dependency-
// free inline string constant, injected into SSR output,
// with no bundler, no npm dependency and no build step of
// its own. Every literal it needs is sourced through
// `JSON.stringify` of an exported constant, so a rename in
// the model propagates here instead of rotting (the same
// D16 rule the appearance wiring script follows).
//
// WHAT IT DOES. A column is OPENED rather than
// re-rendered-from-nothing: fetch the target route's own
// server-rendered page, take the element carrying
// `columnAttr`, and place it in the element carrying
// `stripAttr`. Sound because a document column renders
// identically wherever it sits in a strip — a clicked
// column and a reloaded column are the same markup.
//
// WHAT IT NEVER DOES. It never leaves the reader without a
// page: a non-OK fetch, a missing marker, or any throw
// falls back to a real navigation to the composition URL,
// which the server renders. The enhancement may fail; the
// content may not.
//
// WHY THE DECISIONS LIVE IN THE SCRIPT. An inline runtime
// cannot import TypeScript, so any "pure decision module"
// beside it would be a SECOND implementation of the same
// rules — the drift this mission exists to remove. Instead
// the script publishes its own decisions on the hook
// (`urlFor`, `entries`), so they are driven and asserted
// in a real browser rather than re-derived offline.

const q = (value: SoftStr): SoftStr =>
  JSON.stringify(value);

/**
 * The inline navigation runtime. Contains no `</script`
 * inner sequence, and is injected AFTER the SSR escaper
 * so its `<`/`>` are literal markup.
 */
export const navigationInitScript: SoftStr =
  "(function(){" +
  `var S=${q(stripAttr)},C=${q(columnAttr)};` +
  `var R=${q(restParam)},Q=${q(spanParam)};` +
  `var E=${q(escapeChar)},N=${q(entrySeparator)},F=${q(fieldSeparator)};` +
  // escape one field so a route or a quoted passage can
  // carry the separators themselves
  "function esc(v){return v.split(E).join(E+'t')" +
  ".split(N).join(E+'c').split(F).join(E+'f');}" +
  // percent-encode a parameter value, keeping the
  // separators and slashes literal — byte-identical to
  // the server's own emission
  "function pct(v){return encodeURIComponent(v)" +
  ".split('%2F').join('/').split('%2C').join(N)" +
  ".split('%3A').join(F);}" +
  "function ps(){return new URL(window.location.href).searchParams;}" +
  // the columns to the head's right, as raw entries
  "function entries(){var v=ps().get(R);return v?v.split(N):[];}" +
  "function entryOf(r,s){return esc(r)+(s?F+esc(s):'');}" +
  // the composition URL for a given list of entries
  "function urlFor(list){var p=[];" +
  "if(list.length){p.push(R+'='+pct(list.join(N)));}" +
  "var s=ps().get(Q);if(s){p.push(Q+'='+pct(s));}" +
  "return window.location.pathname+(p.length?'?'+p.join('&'):'');}" +
  "function strip(){return document.querySelector('['+S+']');}" +
  "function cols(){return document.querySelectorAll('['+C+']');}" +
  // place a fetched column after the last one already in
  // the strip, so whatever else the strip holds (a chrome
  // rail, a nav column) keeps its position
  "function place(node){var c=cols();var last=c[c.length-1];" +
  "last.parentNode.insertBefore(node,last.nextSibling);" +
  "node.scrollIntoView({inline:'end',block:'nearest'});}" +
  "function open(route,span){" +
  "var url=urlFor(entries().concat([entryOf(route,span)]));" +
  "return fetch(route,{credentials:'same-origin'}).then(function(r){" +
  "if(!r.ok){throw new Error('nav');}return r.text();}).then(function(t){" +
  "var d=new DOMParser().parseFromString(t,'text/html');" +
  "var col=d.querySelector('['+C+']');" +
  "if(!col||!strip()||!cols().length){throw new Error('nav');}" +
  "place(document.importNode(col,true));" +
  "window.history.pushState(null,'',url);return true;}).catch(function(){" +
  "window.location.assign(url);return false;});}" +
  `window[${q(navHookName)}]={open:open,urlFor:urlFor,entries:entries,entryOf:entryOf};` +
  "})();";

/**
 * Insert the runtime just before `</body>` — after the
 * document's own content, so the markers it navigates by
 * already exist when it runs. A page with no `</body>`
 * passes through unchanged (the same idempotent guard
 * `injectAppearanceScript` records).
 */
export const injectNavigationScript = (
  html: SoftStr,
): SoftStr =>
  html.includes("</body>")
    ? html.replace(
        "</body>",
        `<script>${navigationInitScript}</script></body>`,
      )
    : html;
